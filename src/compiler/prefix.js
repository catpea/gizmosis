export const DEFAULT_PROJECT_PREFIX = 'go';

const DEFAULT_SOURCE_PREFIXES = ['go', 'fox-ve'];

export function resolveProjectPrefix(options = {}) {
  return sanitizeProjectPrefix(options.prefix || options.cssPrefix || options.nodeEditorCssPrefix || DEFAULT_PROJECT_PREFIX);
}

export function sanitizeProjectPrefix(value, label = 'prefix') {
  const prefix = String(value || '').trim();
  if (/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(prefix)) return prefix;
  throw new Error(`Invalid ${label}: ${value}`);
}

export function projectPrefixSourcePrefixes(options = {}) {
  const explicit = splitSourcePrefixes(options.sourcePrefix || options.sourcePrefixes);
  return [...new Set([...explicit, ...DEFAULT_SOURCE_PREFIXES].map(value => sanitizeProjectPrefix(value, 'source prefix')))];
}

export function prefixTag(prefix, suffix) {
  const normalizedPrefix = sanitizeProjectPrefix(prefix);
  const normalizedSuffix = String(suffix || '').replace(/^-+/, '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSuffix)) throw new Error(`Invalid prefixed tag suffix: ${suffix}`);
  return `${normalizedPrefix}-${normalizedSuffix}`;
}

export function rewriteProjectPrefixedName(value, options = {}) {
  const prefix = resolveProjectPrefix(options);
  return rewritePrefixedName(value, prefix, projectPrefixSourcePrefixes(options));
}

export function renderProjectPrefixString(source, options = {}) {
  const prefix = resolveProjectPrefix(options);
  const sourcePrefixes = projectPrefixSourcePrefixes(options);
  let rendered = String(source ?? '').replace(/\{\{(?:css-prefix|prefix)\}\}/g, prefix);
  for (const sourcePrefix of sourcePrefixes) {
    if (sourcePrefix === prefix) continue;
    rendered = rendered.replace(new RegExp(`\\b${escapeRegExp(sourcePrefix)}-(?=[a-z0-9][a-z0-9-]*\\b)`, 'g'), `${prefix}-`);
  }
  return rendered;
}

export function applyProjectPrefixToDocument(document, options = {}) {
  if (!document?.root) return document;
  const prefix = resolveProjectPrefix(options);
  const sourcePrefixes = projectPrefixSourcePrefixes(options);
  rewriteNode(document.root, prefix, sourcePrefixes);
  return document;
}

function rewriteNode(node, prefix, sourcePrefixes) {
  if (!node) return;
  if (node.type === 'element') {
    node.name = rewritePrefixedName(node.name, prefix, sourcePrefixes);
    for (const [name, value] of Object.entries(node.attrs || {})) {
      node.attrs[name] = renderWithPrefix(value, prefix, sourcePrefixes);
    }
    for (const child of node.children || []) rewriteNode(child, prefix, sourcePrefixes);
  } else if (node.type === 'text' || node.type === 'cdata') {
    node.value = renderWithPrefix(node.value, prefix, sourcePrefixes);
  }
}

function rewritePrefixedName(value, prefix, sourcePrefixes) {
  const raw = String(value || '');
  for (const sourcePrefix of sourcePrefixes) {
    if (raw.startsWith(`${sourcePrefix}-`)) return `${prefix}-${raw.slice(sourcePrefix.length + 1)}`;
  }
  return raw.replace(/\{\{(?:css-prefix|prefix)\}\}/g, prefix);
}

function renderWithPrefix(value, prefix, sourcePrefixes) {
  let rendered = String(value ?? '').replace(/\{\{(?:css-prefix|prefix)\}\}/g, prefix);
  for (const sourcePrefix of sourcePrefixes) {
    if (sourcePrefix === prefix) continue;
    rendered = rendered.replace(new RegExp(`\\b${escapeRegExp(sourcePrefix)}-(?=[a-z0-9][a-z0-9-]*\\b)`, 'g'), `${prefix}-`);
  }
  return rendered;
}

function splitSourcePrefixes(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(splitSourcePrefixes);
  return String(value).split(/[,\s]+/).filter(Boolean);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
