// Gizmosis compiler: tiny dependency-free XML parser.
// It intentionally supports the XML subset used by Gizmo source files:
// elements, attributes, comments, CDATA, processing instructions, text, and self-closing tags.

export class XmlParseError extends Error {
  constructor(message, { index = 0, source = '' } = {}) {
    const { line, column } = locate(source, index);
    super(`${message} at ${line}:${column}`);
    this.name = 'XmlParseError';
    this.index = index;
    this.line = line;
    this.column = column;
  }
}

export function parseXml(source, { filename = '<xml>' } = {}) {
  const parser = new Parser(String(source), filename);
  return parser.parseDocument();
}

export function serializeXml(node, { indent = '  ', level = 0 } = {}) {
  if (!node) return '';
  if (node.type === 'document') return node.children.map(child => serializeXml(child, { indent, level })).join('\n');
  if (node.type === 'text') return node.value;
  if (node.type === 'comment') return `<!--${node.value}-->`;
  if (node.type === 'cdata') return `<![CDATA[${node.value}]]>`;
  const pad = indent.repeat(level);
  const attrs = Object.entries(node.attrs || {})
    .map(([name, value]) => ` ${name}="${escapeXmlAttr(value)}"`)
    .join('');
  const children = node.children || [];
  if (!children.length) return `${pad}<${node.name}${attrs}/>`;
  const textOnly = children.every(child => child.type === 'text' || child.type === 'cdata');
  if (textOnly) return `${pad}<${node.name}${attrs}>${children.map(child => serializeXml(child, { indent, level: 0 })).join('')}</${node.name}>`;
  return `${pad}<${node.name}${attrs}>\n${children.map(child => serializeXml(child, { indent, level: level + 1 })).join('\n')}\n${pad}</${node.name}>`;
}

export function textContent(node) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'cdata') return node.value;
  return (node.children || []).map(textContent).join('');
}

export function elementChildren(node, name = null) {
  const children = (node?.children || []).filter(child => child.type === 'element');
  return name ? children.filter(child => child.name === name) : children;
}

export function firstChild(node, name) {
  return elementChildren(node, name)[0] || null;
}

export function cloneNode(node) {
  return JSON.parse(JSON.stringify(node));
}

class Parser {
  constructor(source, filename) {
    this.source = source;
    this.filename = filename;
    this.i = 0;
  }

  parseDocument() {
    const document = { type: 'document', name: '#document', attrs: {}, children: [], filename: this.filename };
    this.skipBom();
    while (!this.eof()) {
      if (this.startsWith('<?')) {
        this.readUntil('?>', 'Unclosed processing instruction');
        continue;
      }
      const node = this.parseNode();
      if (node) document.children.push(node);
    }
    const roots = document.children.filter(child => child.type === 'element');
    if (roots.length !== 1) throw this.error(`Expected exactly one root element, found ${roots.length}`);
    document.root = roots[0];
    return document;
  }

  parseNode() {
    if (this.eof()) return null;
    if (this.startsWith('<!--')) return this.parseComment();
    if (this.startsWith('<![CDATA[')) return this.parseCdata();
    if (this.peek() === '<') return this.parseElement();
    return this.parseText();
  }

  parseComment() {
    this.expect('<!--');
    const value = this.readUntil('-->', 'Unclosed comment');
    return { type: 'comment', value };
  }

  parseCdata() {
    this.expect('<![CDATA[');
    const value = this.readUntil(']]>', 'Unclosed CDATA');
    return { type: 'cdata', value };
  }

  parseText() {
    const start = this.i;
    while (!this.eof() && this.peek() !== '<') this.i += 1;
    return { type: 'text', value: this.source.slice(start, this.i) };
  }

  parseElement() {
    this.expect('<');
    if (this.peek() === '/') throw this.error('Unexpected closing tag');
    const name = this.readName();
    if (!name) throw this.error('Expected element name');
    const attrs = {};
    while (!this.eof()) {
      this.skipWhitespace();
      if (this.startsWith('/>')) {
        this.i += 2;
        return { type: 'element', name, attrs, children: [] };
      }
      if (this.startsWith('>')) {
        this.i += 1;
        break;
      }
      const attrName = this.readName();
      if (!attrName) throw this.error(`Expected attribute name in <${name}>`);
      this.skipWhitespace();
      let value = '';
      if (this.startsWith('=')) {
        this.i += 1;
        this.skipWhitespace();
        value = this.readAttributeValue();
      }
      attrs[attrName] = decodeXml(value);
    }

    const children = [];
    while (!this.eof()) {
      if (this.startsWith(`</`)) {
        this.i += 2;
        const closeName = this.readName();
        this.skipWhitespace();
        this.expect('>');
        if (closeName !== name) throw this.error(`Expected closing </${name}>, got </${closeName}>`);
        return { type: 'element', name, attrs, children };
      }
      const child = this.parseNode();
      if (child) children.push(child);
    }
    throw this.error(`Unclosed <${name}>`);
  }

  readName() {
    const start = this.i;
    while (!this.eof() && /[A-Za-z0-9_:\-.]/.test(this.peek())) this.i += 1;
    return this.source.slice(start, this.i);
  }

  readAttributeValue() {
    const quote = this.peek();
    if (quote !== '"' && quote !== "'") throw this.error('Expected quoted attribute value');
    this.i += 1;
    const start = this.i;
    while (!this.eof() && this.peek() !== quote) this.i += 1;
    if (this.eof()) throw this.error('Unclosed attribute value');
    const value = this.source.slice(start, this.i);
    this.i += 1;
    return value;
  }

  readUntil(marker, errorMessage) {
    const start = this.i;
    const end = this.source.indexOf(marker, this.i);
    if (end < 0) throw this.error(errorMessage);
    this.i = end + marker.length;
    return this.source.slice(start, end);
  }

  skipBom() {
    if (this.source.charCodeAt(0) === 0xfeff) this.i = 1;
  }

  skipWhitespace() {
    while (!this.eof() && /\s/.test(this.peek())) this.i += 1;
  }

  expect(text) {
    if (!this.startsWith(text)) throw this.error(`Expected ${text}`);
    this.i += text.length;
  }

  startsWith(text) { return this.source.startsWith(text, this.i); }
  peek() { return this.source[this.i]; }
  eof() { return this.i >= this.source.length; }
  error(message) { return new XmlParseError(`${message} in ${this.filename}`, { index: this.i, source: this.source }); }
}

function locate(source, index) {
  const before = source.slice(0, index);
  const lines = before.split(/\r\n|\r|\n/);
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function decodeXml(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function escapeXmlAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
