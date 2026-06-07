import { serializeXml } from './xml-parser.js';
import { lowerView } from './view-lowerer.js';

export function generateManifest(ir, diagnostics = []) {
  return sanitize({
    $schema: 'https://gizmosis.local/schemas/gizmo-manifest-v0.5.json',
    version: ir.version,
    source: ir.source,
    name: ir.name,
    tag: ir.tag,
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
  const viewSource = ir.view ? serializeXml(ir.view.ast, { indent: '  ' }) : '<view/>';
  const diagnosticsLiteral = JSON.stringify(diagnostics, null, 2);
  const manifestExpr = manifestImport ? `manifest` : JSON.stringify(generateManifest(ir, diagnostics), null, 2);
  const importManifest = manifestImport ? `import manifest from ${JSON.stringify(manifestImport)} assert { type: 'json' };\n` : '';

  return `${banner(ir)}
${importManifest}

export const gizmoManifest = ${manifestExpr};
export const gizmoDiagnostics = ${diagnosticsLiteral};

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
    if (this.__gizmoRendered) return;
    this.__gizmoRendered = true;
    this.dataset.gizmoCompiled = 'true';
    this.dataset.gizmoTag = ${JSON.stringify(ir.tag)};
    const pre = document.createElement('pre');
    pre.className = 'gizmo-compiled-placeholder';
    this.replaceChildren(pre);
    pre.textContent = [
      ${JSON.stringify(ir.name || ir.tag)},
      'compiled from Gizmosis v0.5',
      '',
      'Standalone skeleton generated:',
      '- prop/attribute contract',
      '- manifest IR',
      '- diagnostics',
      '- view/interactions metadata'
    ].join('\\n');
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
    banner,
    generateManifest,
    lowerView,
    serializeXml
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
