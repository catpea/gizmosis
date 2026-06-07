const BOOLEAN_ATTRIBUTES = new Set([
  'allowfullscreen',
  'async',
  'autofocus',
  'checked',
  'controls',
  'default',
  'defer',
  'disabled',
  'formnovalidate',
  'hidden',
  'inert',
  'ismap',
  'itemscope',
  'loop',
  'multiple',
  'muted',
  'nomodule',
  'novalidate',
  'open',
  'playsinline',
  'readonly',
  'required',
  'reversed',
  'selected'
]);

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);

const EVENT_ATTRIBUTES = new Set([
  'abort',
  'blur',
  'change',
  'click',
  'dblclick',
  'error',
  'focus',
  'input',
  'keydown',
  'keyup',
  'load',
  'pointercancel',
  'pointerdown',
  'pointermove',
  'pointerup',
  'submit',
  'wheel'
]);

const EXPRESSION_PATTERN = /(?<!\{)\{([^{}]+)\}(?!\})/g;

export function lowerView(viewAst, options = {}) {
  if (!viewAst) {
    return {
      html: '',
      host: { attrs: {}, staticClasses: [], classBindings: [], styleBindings: [], bindings: [] },
      repeats: [],
      bindings: [],
      refs: []
    };
  }

  const state = {
    options: {
      includeRoot: false,
      repeatMode: 'placeholder',
      replacements: {},
      ...options
    },
    bindings: [],
    repeats: [],
    refs: [],
    bindingKeys: new Map(),
    usedKeys: new Map()
  };
  const rootIsView = viewAst.type === 'element' && viewAst.name === 'view';
  const rootAttrs = rootIsView ? viewAst.attrs || {} : {};
  const host = rootIsView ? lowerHostAttrs(rootAttrs, state) : {
    attrs: {},
    staticClasses: [],
    classBindings: [],
    styleBindings: [],
    bindings: []
  };
  const html = rootIsView && !state.options.includeRoot
    ? lowerChildren(viewAst.children || [], state, {})
    : lowerNode(viewAst, state, {});

  return {
    html: renderLiteralReplacements(html.trim(), state.options.replacements),
    host,
    repeats: state.repeats.map(repeat => ({
      ...repeat,
      html: renderLiteralReplacements(repeat.html.trim(), state.options.replacements)
    })),
    bindings: state.bindings,
    refs: state.refs
  };
}

function lowerHostAttrs(attrs, state) {
  const host = { attrs: {}, staticClasses: [], classBindings: [], styleBindings: [], bindings: [] };
  for (const [name, value] of Object.entries(attrs || {})) {
    if (name === 'class') host.staticClasses.push(...String(value).trim().split(/\s+/).filter(Boolean));
    else if (name.startsWith('class.')) host.classBindings.push({ className: name.slice(6), expression: stripExpression(value), attrs });
    else if (name.startsWith('style.')) host.styleBindings.push({ property: name.slice(6), expression: stripExpression(value), attrs });
    else if (!isCompilerOnlyAttribute(name)) {
      const binding = lowerAttribute(name, value, state, { target: 'host' });
      if (binding.staticValue !== undefined) host.attrs[name] = binding.staticValue;
      if (binding.bindings.length) host.bindings.push(...binding.bindings);
    }
  }
  return host;
}

function lowerChildren(children, state, scope) {
  return children.map(child => lowerNode(child, state, scope)).join('');
}

function lowerNode(node, state, scope) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'cdata') return lowerText(node.value, state, scope);
  if (node.type === 'comment') return '';
  if (node.type !== 'element') return '';
  return lowerElement(node, state, scope);
}

function lowerElement(node, state, scope) {
  const attrs = node.attrs || {};
  if (attrs.ref) state.refs.push({ ref: attrs.ref, element: node.name, attrs });

  if (attrs.each && !scope.suppressRepeat) {
    const repeat = parseRepeat(attrs.each);
    const itemScope = repeat ? { ...scope, repeatItem: repeat.item } : scope;
    const key = uniqueKey(state, repeat?.collection ? kebab(repeat.collection) : preferredKey(attrs.each, 'repeat', scope));
    const html = lowerElement(node, state, { ...itemScope, suppressRepeat: true });
    state.repeats.push({
      key,
      each: attrs.each,
      collection: repeat?.collection || '',
      item: repeat?.item || '',
      keyExpression: stripExpression(attrs.key || ''),
      html
    });
    return state.options.repeatMode === 'omit' ? '' : placeholder(key);
  }

  const tag = node.name;
  const attrText = lowerElementAttributes(node, state, scope);
  const children = lowerChildren(node.children || [], state, scope);
  if (!children && VOID_ELEMENTS.has(tag)) return `<${tag}${attrText}>`;
  return `<${tag}${attrText}>${children}</${tag}>`;
}

function lowerElementAttributes(node, state, scope) {
  const parts = [];
  for (const [name, value] of Object.entries(node.attrs || {})) {
    if (isCompilerOnlyAttribute(name)) continue;
    const lowered = lowerAttribute(name, value, state, { target: 'element', element: node.name, scope });
    if (lowered.html) parts.push(lowered.html);
  }
  return parts.join('');
}

function lowerAttribute(name, value, state, context) {
  if (BOOLEAN_ATTRIBUTES.has(name) && isWholeExpression(value)) {
    const expression = stripExpression(value);
    const staticValue = valueForExpression(expression, state, { ...context, name, boolean: true });
    if (typeof staticValue === 'boolean') return { html: staticValue ? ` ${name}` : '', bindings: [], staticValue };
    const key = bindingKey(state, expression, preferredKey(expression, name, context.scope), context.scope);
    const binding = { kind: 'boolean-attribute', name, expression, key, element: context.element || '', target: context.target };
    state.bindings.push(binding);
    return { html: ` ${placeholder(key)}`, bindings: [binding] };
  }

  if (BOOLEAN_ATTRIBUTES.has(name) && !hasExpressions(value)) {
    const enabled = value === '' || value === name || value === 'true';
    return { html: enabled ? ` ${name}` : '', bindings: [], staticValue: enabled };
  }

  const bindings = [];
  const attrValue = replaceExpressions(value, state, context, binding => bindings.push(binding));
  return { html: ` ${name}="${escapeHtmlAttr(attrValue)}"`, bindings, staticValue: attrValue };
}

function lowerText(value, state, scope) {
  return replaceExpressions(value, state, { target: 'text', scope }, () => {});
}

function replaceExpressions(value, state, context, onBinding) {
  const raw = String(value ?? '');
  let out = '';
  let cursor = 0;
  for (const match of raw.matchAll(EXPRESSION_PATTERN)) {
    const expression = match[1].trim();
    out += escapeHtmlText(raw.slice(cursor, match.index));
    const staticValue = valueForExpression(expression, state, context);
    if (staticValue !== undefined) {
      out += context.target === 'text' ? escapeHtmlText(staticValue) : escapeHtmlAttr(staticValue);
    } else {
      const key = bindingKey(state, expression, preferredKey(expression, context.name || 'value', context.scope), context.scope);
      const binding = { kind: context.target === 'text' ? 'text' : 'attribute', name: context.name || '', expression, key, element: context.element || '', target: context.target };
      state.bindings.push(binding);
      onBinding?.(binding);
      out += placeholder(key);
    }
    cursor = match.index + match[0].length;
  }
  out += escapeHtmlText(raw.slice(cursor));
  return out;
}

function valueForExpression(expression, state, context) {
  if (typeof state.options.valueForExpression !== 'function') return undefined;
  return state.options.valueForExpression(expression, context);
}

function parseRepeat(value) {
  const match = String(value || '').trim().match(/^(.+?)\s+as\s+([A-Za-z_$][\w$]*)$/);
  return match ? { collection: match[1].trim(), item: match[2].trim() } : null;
}

function preferredKey(expression, fallback, scope = {}) {
  let raw = String(expression || '').trim();
  if (scope.repeatItem && raw.startsWith(`${scope.repeatItem}.`)) raw = raw.slice(scope.repeatItem.length + 1);
  if (/^![A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(raw)) return kebab(fallback);
  if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(raw)) return kebab(raw.split('.').pop());
  return kebab(fallback || 'value');
}

function uniqueKey(state, preferred) {
  const base = preferred || 'value';
  const next = (state.usedKeys.get(base) || 0) + 1;
  state.usedKeys.set(base, next);
  return next === 1 ? base : `${base}-${next}`;
}

function bindingKey(state, expression, preferred, scope = {}) {
  const cacheKey = `${scope?.repeatItem || ''}\u0000${String(expression || '').trim()}\u0000${preferred || ''}`;
  if (state.bindingKeys.has(cacheKey)) return state.bindingKeys.get(cacheKey);
  const key = uniqueKey(state, preferred);
  state.bindingKeys.set(cacheKey, key);
  return key;
}

function placeholder(key) {
  return `{{${key}}}`;
}

function isCompilerOnlyAttribute(name) {
  return name === 'each'
    || name === 'key'
    || name === 'ref'
    || name === 'if'
    || name.startsWith('class.')
    || name.startsWith('style.')
    || name.startsWith('svg.')
    || name.startsWith('bind.')
    || name.startsWith('on.')
    || EVENT_ATTRIBUTES.has(name);
}

function hasExpressions(value) {
  return new RegExp(EXPRESSION_PATTERN.source).test(String(value ?? ''));
}

function isWholeExpression(value) {
  return String(value ?? '').trim().match(/^\{[^{}]+\}$/);
}

function stripExpression(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^\{([^{}]+)\}$/);
  return match ? match[1].trim() : raw;
}

function renderLiteralReplacements(source, replacements) {
  return String(source).replace(/\{\{([a-z0-9-]+)\}\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(replacements, key) ? String(replacements[key]) : match
  ));
}

function kebab(value) {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'value';
}

function escapeHtmlText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttr(value) {
  return escapeHtmlText(value)
    .replace(/"/g, '&quot;');
}
