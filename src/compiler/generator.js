import { serializeXml } from './xml-parser.js';
import { lowerView } from './view-lowerer.js';
import { resolveProjectPrefix } from './prefix.js';

export function generateManifest(ir, diagnostics = []) {
  return sanitize({
    $schema: 'https://gizmosis.local/schemas/gizmo-manifest-v0.5.json',
    version: ir.version,
    source: ir.source,
    name: ir.name,
    tag: ir.tag,
    project: ir.project,
    css: ir.css,
    build: ir.build,
    diagnosticsPolicy: ir.diagnosticsPolicy,
    uses: ir.uses,
    about: ir.about,
    terms: ir.terms,
    contract: ir.contract,
    requires: ir.requires,
    provides: ir.provides,
    model: ir.model,
    types: ir.types,
    props: ir.props,
    attrs: ir.attrs,
    state: ir.state,
    events: ir.events,
    methods: ir.methods,
    slots: ir.slots,
    parts: ir.parts,
    view: ir.view ? {
      refs: ir.view.refs,
      repeated: ir.view.repeated,
      keys: ir.view.keys,
      bindings: ir.view.bindings,
      source: serializeXml(ir.view.ast, { indent: '  ' })
    } : null,
    geometry: ir.geometry,
    behavior: ir.behavior,
    actions: ir.actions,
    interactions: ir.interactions,
    effects: ir.effects,
    resources: ir.resources,
    frames: ir.frames,
    dev: ir.dev,
    fixtures: ir.fixtures,
    tests: ir.tests,
    features: { version: ir.featuresVersion, supported: ir.features },
    diagnostics
  });
}

export function generateJavaScript(ir, diagnostics = [], options = {}) {
  const packageGenerator = findPackageGenerator(ir, options);
  const generated = packageGenerator?.generateJavaScript?.(ir, diagnostics, generationContext(options));
  if (typeof generated === 'string') return generated;
  return generateStandaloneSkeleton(ir, diagnostics, options);
}

function generateStandaloneSkeleton(ir, diagnostics = [], { manifestImport = null } = {}) {
  const className = toClassName(ir.tag || ir.name || 'gizmo-element');
  const observed = ir.props.filter(prop => prop.reflect || isAttributeProp(prop)).map(prop => prop.name);
  const propDefs = ir.props;
  const loweredView = lowerView(ir.view?.ast, { repeatMode: 'placeholder', booleanMode: 'marker' });
  const viewSource = ir.view ? serializeXml(ir.view.ast, { indent: '  ' }) : '<view/>';
  const diagnosticsLiteral = JSON.stringify(diagnostics, null, 2);
  const manifestExpr = manifestImport ? `manifest` : JSON.stringify(generateManifest(ir, diagnostics), null, 2);
  const importManifest = manifestImport ? `import manifest from ${JSON.stringify(manifestImport)} assert { type: 'json' };\n` : '';

  return `${banner(ir)}
${importManifest}

export const gizmoManifest = ${manifestExpr};
export const gizmoDiagnostics = ${diagnosticsLiteral};
const GIZMO_VIEW_HTML = ${JSON.stringify(loweredView.html)};
const GIZMO_VIEW_HOST = ${JSON.stringify(loweredView.host, null, 2)};
const GIZMO_VIEW_BINDINGS = ${JSON.stringify(loweredView.bindings, null, 2)};
const GIZMO_VIEW_REPEATS = ${JSON.stringify(loweredView.repeats, null, 2)};

export class ${className} extends HTMLElement {
  static observedAttributes = ${JSON.stringify(observed)};

  constructor() {
    super();
    this.__gizmoProps = Object.create(null);
${propDefs.map(prop => `    this.__gizmoProps[${JSON.stringify(prop.field)}] = ${defaultExpression(prop)};`).join('\n')}
  }

  connectedCallback() {
    this.__upgradeProperties();
    this.__syncAttributesToProps();
    this.render();
  }

  attributeChangedCallback() {
    this.__syncAttributesToProps();
    this.render();
  }

${propDefs.map(prop => propertyAccessor(prop)).join('\n\n')}

  render() {
    if (!this.isConnected) return;
    this.dataset.gizmoCompiled = 'true';
    this.dataset.gizmoTag = ${JSON.stringify(ir.tag)};
    this.__applyGizmoHost();
    if (!this.__gizmoMounted) this.__mountGizmoView();
    this.__updateGizmoView();
  }

  __upgradeProperties() {
${propDefs.map(prop => `    if (Object.prototype.hasOwnProperty.call(this, ${JSON.stringify(prop.field)})) { const value = this[${JSON.stringify(prop.field)}]; delete this[${JSON.stringify(prop.field)}]; this[${JSON.stringify(prop.field)}] = value; }`).join('\n')}
  }

  __syncAttributesToProps() {
${propDefs.map(prop => attributeSync(prop)).join('\n')}
  }

  __reflectAttribute(name, value, kind) {
    if (kind === 'boolean') {
      this.toggleAttribute(name, Boolean(value));
      return;
    }
    if (value == null || value === false) this.removeAttribute(name);
    else if (kind === 'list' || kind === 'record') this.setAttribute(name, JSON.stringify(value));
    else this.setAttribute(name, String(value));
  }

  __emit(name, detail = {}) {
    return this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
  }

  __applyGizmoHost() {
    for (const [name, value] of Object.entries(GIZMO_VIEW_HOST.attrs || {})) {
      if (!this.hasAttribute(name)) this.setAttribute(name, String(value));
    }
    for (const className of GIZMO_VIEW_HOST.staticClasses || []) this.classList.add(className);
    for (const binding of GIZMO_VIEW_HOST.classBindings || []) {
      this.classList.toggle(binding.className, Boolean(this.__gizmoValue(binding.expression, {})));
    }
    for (const binding of GIZMO_VIEW_HOST.styleBindings || []) {
      const value = this.__gizmoValue(binding.expression, {});
      if (value == null || value === false) this.style.removeProperty(binding.property);
      else this.style.setProperty(binding.property, String(value));
    }
  }

  __gizmoRenderValues(scope) {
    const values = this.__gizmoBindingValues(scope);
    for (const repeat of GIZMO_VIEW_REPEATS) values[repeat.key] = '';
    return values;
  }

  __gizmoBindingValues(scope) {
    const values = Object.create(null);
    for (const binding of GIZMO_VIEW_BINDINGS) {
      const value = this.__gizmoValue(binding.expression, scope);
      if (binding.kind === 'boolean-attribute') values[binding.key] = value ? binding.name : '';
      else if (binding.kind === 'attribute') values[binding.key] = this.__escapeGizmoAttr(value);
      else values[binding.key] = this.__escapeGizmoHtml(value);
    }
    return values;
  }

  __gizmoRepeatHtml(repeat) {
    const items = this.__gizmoValue(repeat.collection, {});
    if (!Array.isArray(items)) return '';
    return items.map((item, index) => {
      const scope = { [repeat.item]: item, index };
      return this.__renderGizmoBooleanMarkers(this.__renderGizmoTemplate(repeat.html, this.__gizmoBindingValues(scope)), scope);
    }).join('');
  }

  __renderGizmoTemplate(template, values) {
    return String(template || '').replace(/\\{\\{([a-z0-9-]+)\\}\\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : ''
    ));
  }

  __mountGizmoView() {
    const template = document.createElement('template');
    template.innerHTML = GIZMO_VIEW_HTML;
    this.replaceChildren(template.content.cloneNode(true));
    this.__gizmoBindingMap = new Map(GIZMO_VIEW_BINDINGS.map(binding => [binding.key, binding]));
    this.__gizmoRepeatMap = new Map(GIZMO_VIEW_REPEATS.map(repeat => [repeat.key, repeat]));
    this.__gizmoTextTargets = [];
    this.__gizmoAttrTargets = [];
    this.__gizmoBoolTargets = [];
    this.__gizmoRepeatTargets = [];
    this.__collectGizmoTargets(this);
    this.__gizmoMounted = true;
  }

  __collectGizmoTargets(root) {
    for (const node of Array.from(root.childNodes || [])) this.__visitGizmoNode(node);
  }

  __visitGizmoNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const template = node.nodeValue || '';
      const repeatKey = this.__wholeGizmoPlaceholder(template);
      if (repeatKey && this.__gizmoRepeatMap.has(repeatKey)) {
        const anchor = document.createComment('gizmo-repeat:' + repeatKey);
        node.replaceWith(anchor);
        this.__gizmoRepeatTargets.push({ key: repeatKey, anchor, nodes: [] });
        return;
      }
      if (this.__hasGizmoPlaceholders(template)) this.__gizmoTextTargets.push({ node, template });
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    for (const attr of Array.from(node.attributes)) {
      if (attr.name.startsWith('data-gizmo-bool-')) {
        this.__gizmoBoolTargets.push({ element: node, key: attr.name.slice('data-gizmo-bool-'.length), name: attr.value });
        node.removeAttribute(attr.name);
      } else if (this.__hasGizmoPlaceholders(attr.value)) {
        this.__gizmoAttrTargets.push({ element: node, name: attr.name, template: attr.value });
      }
    }
    for (const child of Array.from(node.childNodes)) this.__visitGizmoNode(child);
  }

  __updateGizmoView() {
    for (const target of this.__gizmoTextTargets || []) {
      target.node.nodeValue = this.__renderGizmoRawTemplate(target.template, {});
    }
    for (const target of this.__gizmoAttrTargets || []) {
      const value = this.__renderGizmoRawTemplate(target.template, {});
      if (value == null || value === false) target.element.removeAttribute(target.name);
      else target.element.setAttribute(target.name, String(value));
    }
    for (const target of this.__gizmoBoolTargets || []) {
      target.element.toggleAttribute(target.name, Boolean(this.__gizmoValueForKey(target.key, {})));
    }
    for (const target of this.__gizmoRepeatTargets || []) this.__updateGizmoRepeat(target);
  }

  __updateGizmoRepeat(target) {
    for (const node of target.nodes) node.remove();
    target.nodes = [];
    const repeat = this.__gizmoRepeatMap.get(target.key);
    if (!repeat) return;
    const html = this.__gizmoRepeatHtml(repeat);
    if (!html) return;
    const template = document.createElement('template');
    template.innerHTML = html;
    target.nodes = Array.from(template.content.childNodes);
    target.anchor.after(...target.nodes);
  }

  __renderGizmoRawTemplate(template, scope) {
    return String(template || '').replace(/\\{\\{([a-z0-9-]+)\\}\\}/g, (match, key) => {
      const value = this.__gizmoValueForKey(key, scope);
      return value == null || value === false ? '' : String(value);
    });
  }

  __renderGizmoBooleanMarkers(html, scope) {
    return String(html || '').replace(/\\sdata-gizmo-bool-([a-z0-9-]+)="([^"]+)"/g, (match, key, name) => (
      this.__gizmoValueForKey(key, scope) ? ' ' + name : ''
    ));
  }

  __gizmoValueForKey(key, scope) {
    const binding = this.__gizmoBindingMap?.get(key) || GIZMO_VIEW_BINDINGS.find(item => item.key === key);
    return binding ? this.__gizmoValue(binding.expression, scope) : '';
  }

  __hasGizmoPlaceholders(value) {
    return /\\{\\{[a-z0-9-]+\\}\\}/.test(String(value || ''));
  }

  __wholeGizmoPlaceholder(value) {
    const match = String(value || '').trim().match(/^\\{\\{([a-z0-9-]+)\\}\\}$/);
    return match?.[1] || '';
  }

  __gizmoValue(expression, scope) {
    const raw = String(expression || '').trim();
    if (!raw) return '';
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw === 'null') return null;
    if (/^-?\\d+(?:\\.\\d+)?$/.test(raw)) return Number(raw);
    const quoted = raw.match(/^(['"])(.*)\\1$/);
    if (quoted) return quoted[2];
    const includes = raw.match(/^(.+?)\\s+includes\\s+(.+)$/);
    if (includes) {
      const list = this.__gizmoValue(includes[1], scope);
      return Array.isArray(list) && list.includes(this.__gizmoValue(includes[2], scope));
    }
    const comparison = raw.match(/^(.+?)\\s*(===|!==)\\s*(.+)$/);
    if (comparison) {
      const left = this.__gizmoValue(comparison[1], scope);
      const right = this.__gizmoValue(comparison[3], scope);
      return comparison[2] === '===' ? left === right : left !== right;
    }
    if (raw.startsWith('!')) return !this.__gizmoValue(raw.slice(1), scope);
    return this.__gizmoPath(raw, scope);
  }

  __gizmoPath(path, scope) {
    const parts = String(path || '').split('.').filter(Boolean);
    if (!parts.length) return '';
    let value;
    if (Object.prototype.hasOwnProperty.call(scope, parts[0])) value = scope[parts.shift()];
    else if (Object.prototype.hasOwnProperty.call(this.__gizmoProps, parts[0])) value = this.__gizmoProps[parts.shift()];
    else value = this[parts.shift()];
    for (const part of parts) value = value?.[part];
    return value ?? '';
  }

  __escapeGizmoHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  __escapeGizmoAttr(value) {
    return this.__escapeGizmoHtml(value).replace(/"/g, '&quot;');
  }
}

export function define${className}(tag = ${JSON.stringify(ir.tag)}) {
  if (!customElements.get(tag)) customElements.define(tag, ${className});
  return ${className};
}

if (typeof customElements !== 'undefined' && ${JSON.stringify(Boolean(ir.tag))}) {
  define${className}();
}

export default ${className};

export const gizmoViewSource = ${JSON.stringify(viewSource)};
`;
}

export function generateDts(ir, options = {}) {
  const className = toClassName(ir.tag || ir.name || 'gizmo-element');
  const base = 'HTMLElement';
  const importLine = '';
  return `${banner(ir)}
${importLine}export interface ${className}Props {
${ir.props.map(prop => `  ${safeField(prop.field)}${prop.default === undefined ? '?' : ''}: ${tsType(prop)};`).join('\n')}
}

export declare const gizmoManifest: Record<string, unknown>;
export declare const gizmoDiagnostics: Array<Record<string, unknown>>;
export declare class ${className} extends ${base} {
${ir.props.map(prop => `  ${safeField(prop.field)}: ${tsType(prop)};`).join('\n')}
}

export declare function define${className}(tag?: string): CustomElementConstructor | typeof ${className};
export default ${className};
`;
}


function findPackageGenerator(ir, options) {
  const generators = options.packageGenerators || {};
  for (const use of ir.uses || []) {
    const generator = generators[use.library];
    if (generator) return generator;
  }
  return null;
}

function generationContext(options) {
  return {
    options,
    projectPrefix: resolveProjectPrefix(options),
    resolveProjectPrefix,
    banner,
    generateManifest,
    lowerView,
    serializeXml,
    toClassName
  };
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'ast' || key === 'root' || key === 'children') continue;
    if (typeof item === 'function') continue;
    out[key] = sanitize(item);
  }
  return out;
}

function banner(ir) {
  return `// Generated by Gizmosis compiler v0.5\n// Source: ${ir.source}\n// Component: ${ir.name || '(unnamed)'} <${ir.tag}>\n// Do not edit generated output by hand.`;
}

function toClassName(value) {
  const raw = String(value || 'gizmo-element').replace(/[^A-Za-z0-9]+/g, ' ').trim();
  const name = raw.split(/\s+/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('') || 'GizmoElement';
  return /^[0-9]/.test(name) ? `Gizmo${name}` : name;
}

function isAttributeProp(prop) {
  return !['list', 'record'].includes(prop.kind) || prop.attrFormat;
}

function defaultExpression(prop) {
  if (prop.default !== undefined) return literalForKind(prop.default, prop.kind);
  if (prop.kind === 'boolean') return 'false';
  if (prop.kind === 'number') return '0';
  if (prop.kind === 'list') return '[]';
  if (prop.kind === 'record') return '{}';
  if (prop.kind === 'maybe') return 'null';
  return "''";
}

function literalForKind(value, kind) {
  if (kind === 'boolean') return value === 'true' ? 'true' : 'false';
  if (kind === 'number') return Number.isFinite(Number(value)) ? String(Number(value)) : '0';
  if (kind === 'list' || kind === 'record') {
    try { return JSON.stringify(JSON.parse(value)); } catch { return kind === 'list' ? '[]' : '{}'; }
  }
  return JSON.stringify(String(value));
}

function propertyAccessor(prop) {
  const field = safeField(prop.field);
  return `  get ${field}() { return this.__gizmoProps[${JSON.stringify(prop.field)}]; }\n  set ${field}(value) {\n    this.__gizmoProps[${JSON.stringify(prop.field)}] = ${coerceExpression('value', prop)};\n    ${prop.reflect ? `this.__reflectAttribute(${JSON.stringify(prop.name)}, this.__gizmoProps[${JSON.stringify(prop.field)}], ${JSON.stringify(prop.kind)});` : ''}\n    this.render();\n  }`;
}

function attributeSync(prop) {
  if (!isAttributeProp(prop)) return `    // ${prop.name}: property-only ${prop.kind}`;
  const field = JSON.stringify(prop.field);
  const attr = JSON.stringify(prop.name);
  if (prop.kind === 'boolean') return `    this.__gizmoProps[${field}] = this.hasAttribute(${attr});`;
  if (prop.kind === 'number') return `    if (this.hasAttribute(${attr})) this.__gizmoProps[${field}] = Number(this.getAttribute(${attr})) || 0;`;
  if (prop.kind === 'list' || prop.kind === 'record') return `    if (this.hasAttribute(${attr})) { try { this.__gizmoProps[${field}] = JSON.parse(this.getAttribute(${attr})); } catch { this.__gizmoProps[${field}] = ${prop.kind === 'list' ? '[]' : '{}'}; } }`;
  return `    if (this.hasAttribute(${attr})) this.__gizmoProps[${field}] = this.getAttribute(${attr}) || '';`;
}

function coerceExpression(value, prop) {
  if (prop.kind === 'boolean') return `Boolean(${value})`;
  if (prop.kind === 'number') return `Number(${value}) || 0`;
  if (prop.kind === 'list') return `Array.isArray(${value}) ? ${value}.map(item => typeof item === 'object' && item ? { ...item } : item) : []`;
  if (prop.kind === 'record') return `${value} && typeof ${value} === 'object' ? { ...${value} } : {}`;
  if (prop.kind === 'maybe') return `${value} ?? null`;
  return `String(${value} ?? '')`;
}

function safeField(value) {
  const field = String(value || 'value').replace(/[^A-Za-z0-9_$]/g, '_');
  return /^[A-Za-z_$]/.test(field) ? field : `_${field}`;
}

function tsType(prop) {
  if (prop.kind === 'number') return 'number';
  if (prop.kind === 'boolean') return 'boolean';
  if (prop.kind === 'list') return `${prop.of || 'unknown'}[]`;
  if (prop.kind === 'record') return prop.of || 'Record<string, unknown>';
  if (prop.kind === 'maybe') return `${prop.of || 'unknown'} | null`;
  if (prop.kind === 'choice' && prop.values.length) return prop.values.map(value => JSON.stringify(value)).join(' | ');
  return 'string';
}
