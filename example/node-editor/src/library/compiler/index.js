import { readFileSync } from 'node:fs';

const TEMPLATE_ROOT = new URL('./', import.meta.url);

const TEMPLATES = {
  graph: readTemplate('graph.js'),
  card: readTemplate('card.js'),
  cable: readTemplate('cable.js')
};

export const nodeEditorPackageGenerator = {
  interactionTags: ['connect', 'node', 'port', 'edge'],
  validateInteraction(interaction, diagnostics) {
    if (interaction.kind !== 'connect') return;
    for (const required of ['start-event', 'end-event', 'mode-prop', 'ghost']) {
      if (!interaction.attrs[required]) diagnostics.error('<connect> requires all node-editor connection attributes.', { required, interaction: interaction.name });
    }
  },
  generateJavaScript(ir, diagnostics, context) {
    const role = nodeEditorRole(ir.tag);
    if (role === 'card') return generateCard(ir, diagnostics, context);
    if (role === 'cable') return generateCable(ir, diagnostics, context);
    if (role === 'graph') return generateGraph(ir, diagnostics, context);
    return null;
  }
};

export default nodeEditorPackageGenerator;

function generateGraph(ir, diagnostics, context) {
  const manifest = context.generateManifest(ir, diagnostics);
  const cssPrefix = nodeEditorPrefix(context);
  const cardTag = findRequiredComponentTag(ir, 'node-card') || findNodeCardTag(ir, context) || prefixedNodeEditorTag(context, 'node-card');
  const cableTag = findRequiredComponentTag(ir, 'node-cable') || prefixedNodeEditorTag(context, 'node-cable');
  const graphHtml = lowerNodeEditorView(ir, context, cssPrefix, {
    repeatMode: 'omit',
    valueForExpression: graphInitialValue
  }).html;
  const className = context.toClassName(ir.tag || prefixedNodeEditorTag(context, 'node-graph'));

  return renderTemplate(TEMPLATES.graph, {
    banner: context.banner(ir),
    'implementation-import': JSON.stringify(packageImport(context, 'gizmo/node-editor')),
    manifest: JSON.stringify(manifest, null, 2),
    diagnostics: JSON.stringify(diagnostics, null, 2),
    'graph-config': JSON.stringify(graphRuntimeConfig(ir, { cssPrefix, cardTag, cableTag, graphHtml }), null, 2),
    'css-prefix': cssPrefix,
    'node-card-tag': cardTag,
    'node-cable-tag': cableTag,
    'class-name': className,
    'define-name': `define${className}`,
    'tag-name': ir.tag || prefixedNodeEditorTag(context, 'node-graph'),
    source: JSON.stringify(ir.source),
    tag: JSON.stringify(ir.tag || prefixedNodeEditorTag(context, 'node-graph'))
  });
}

function generateCard(ir, diagnostics, context) {
  const manifest = context.generateManifest(ir, diagnostics);
  const cssPrefix = nodeEditorPrefix(context);
  const lowered = lowerNodeEditorView(ir, context, cssPrefix);
  const repeats = new Map(lowered.repeats.map(repeat => [repeat.collection, repeat.html]));
  const className = context.toClassName(ir.tag || prefixedNodeEditorTag(context, 'node-card'));

  return renderTemplate(TEMPLATES.card, {
    banner: context.banner(ir),
    'implementation-import': JSON.stringify(packageImport(context, 'gizmo/node-editor')),
    manifest: JSON.stringify(manifest, null, 2),
    diagnostics: JSON.stringify(diagnostics, null, 2),
    'css-prefix': cssPrefix,
    'class-name': className,
    'define-name': `define${className}`,
    'tag-name': ir.tag || prefixedNodeEditorTag(context, 'node-card'),
    tag: JSON.stringify(ir.tag || prefixedNodeEditorTag(context, 'node-card')),
    'node-card-html': JSON.stringify(lowered.html),
    'node-card-input-port-html': JSON.stringify(repeats.get('inputs') || ''),
    'node-card-output-port-html': JSON.stringify(repeats.get('outputs') || '')
  });
}

function generateCable(ir, diagnostics, context) {
  const manifest = context.generateManifest(ir, diagnostics);
  const cssPrefix = nodeEditorPrefix(context);
  const graphTag = findRequiredComponentTag(ir, 'node-graph') || prefixedNodeEditorTag(context, 'node-graph');
  const className = context.toClassName(ir.tag || prefixedNodeEditorTag(context, 'node-cable'));

  return renderTemplate(TEMPLATES.cable, {
    banner: context.banner(ir),
    'implementation-import': JSON.stringify(packageImport(context, 'gizmo/node-editor')),
    manifest: JSON.stringify(manifest, null, 2),
    diagnostics: JSON.stringify(diagnostics, null, 2),
    'css-prefix': cssPrefix,
    'node-graph-tag': graphTag,
    'class-name': className,
    'define-name': `define${className}`,
    'tag-name': ir.tag || prefixedNodeEditorTag(context, 'node-cable'),
    tag: JSON.stringify(ir.tag || prefixedNodeEditorTag(context, 'node-cable'))
  });
}

function readTemplate(path) {
  return readFileSync(new URL(path, TEMPLATE_ROOT), 'utf8').trimEnd();
}

function renderTemplate(template, replacements) {
  return template.replace(/\{\{([a-z0-9-]+)\}\}/g, (match, key) => Object.prototype.hasOwnProperty.call(replacements, key) ? replacements[key] : match);
}

function lowerNodeEditorView(ir, context, cssPrefix, options = {}) {
  return context.lowerView(ir.view?.ast, {
    replacements: { 'css-prefix': cssPrefix },
    ...options
  });
}

function graphInitialValue(expression, binding) {
  if (binding.boolean && expression === '!connection') return true;
  if (binding.boolean && expression === 'nodes.length !== 0') return false;
  if (expression === 'view.zoom') return '1.00';
  if (expression === "readonly ? 'readonly' : connection ? 'connecting' : nodeDrag ? 'dragging' : 'ready'") return 'ready';
  return undefined;
}

function graphRuntimeConfig(ir, { cssPrefix, cardTag, cableTag, graphHtml }) {
  return {
    html: graphHtml,
    tags: {
      card: cardTag,
      cable: cableTag
    },
    classes: {
      root: `${cssPrefix}-node-graph-root`,
      cables: `${cssPrefix}-node-graph-cables`
    },
    selectors: {
      viewport: `.${cssPrefix}-node-graph-viewport`,
      svg: `.${cssPrefix}-node-graph-edges`,
      edgeLayer: `.${cssPrefix}-node-graph-edge-layer`,
      ghost: `.${cssPrefix}-node-graph-ghost-edge`,
      cableLayer: `.${cssPrefix}-node-graph-cables`,
      nodeLayer: `.${cssPrefix}-node-graph-nodes`,
      empty: `.${cssPrefix}-node-graph-empty`,
      cardPortDot: `.${cssPrefix}-node-card-port-dot`,
      cardTitle: `.${cssPrefix}-node-card-title`,
      cardExpand: `.${cssPrefix}-node-card-expand`,
      edge: `.${cssPrefix}-node-graph-edge`,
      nodeDragIgnore: `.${cssPrefix}-node-card-port, button, input, textarea, select, [contenteditable]`
    },
    events: {
      portDown: viewEventName(ir, 'port-down', 'fox-node-port-down'),
      portUp: viewEventName(ir, 'port-up', 'fox-node-port-up'),
      nodeSelect: contractEventName(ir, 'node-select', 'fox-node-select'),
      nodeMove: contractEventName(ir, 'node-move', 'fox-node-move'),
      edgeConnect: contractEventName(ir, 'edge-connect', 'fox-edge-connect'),
      edgeDisconnect: contractEventName(ir, 'edge-disconnect', 'fox-edge-disconnect'),
      nodeAdd: contractEventName(ir, 'node-add', 'fox-node-add'),
      panZoom: contractEventName(ir, 'pan-zoom', 'fox-pan-zoom'),
      probeResults: 'gizmo-probe-results'
    }
  };
}

function contractEventName(ir, suffix, fallback) {
  return ir.events?.find(event => event.name === fallback || event.name.endsWith(suffix))?.name || fallback;
}

function viewEventName(ir, suffix, fallback) {
  return ir.view?.bindings
    ?.filter(binding => binding.name?.startsWith('on.'))
    .map(binding => binding.name.slice(3))
    .find(name => name === fallback || name.endsWith(suffix)) || fallback;
}

function packageImport(context, library) {
  return context.options.packageImports?.[library] || library;
}

function nodeEditorPrefix(context) {
  return sanitizeCssPrefix(context.projectPrefix || context.options.prefix || context.options.cssPrefix || context.options.nodeEditorCssPrefix || 'go');
}

function sanitizeCssPrefix(value) {
  const prefix = String(value || '').trim();
  if (/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(prefix)) return prefix;
  throw new Error(`Invalid node-editor CSS prefix: ${value}`);
}

function findRequiredComponentTag(ir, suffix) {
  return ir.requires?.components?.find(item => String(item.attrs?.tag || '').endsWith(suffix))?.attrs?.tag || null;
}

function findNodeCardTag(ir, context) {
  const source = ir.view?.source || (ir.view?.ast ? context.serializeXml(ir.view.ast, { indent: '' }) : '');
  const match = String(source).match(/<([a-z][a-z0-9-]*node-card\b)/i);
  return match?.[1] || null;
}

function nodeEditorRole(tag) {
  const value = String(tag || '');
  if (value.endsWith('node-card')) return 'card';
  if (value.endsWith('node-cable')) return 'cable';
  if (value.endsWith('node-graph')) return 'graph';
  return '';
}

function prefixedNodeEditorTag(context, suffix) {
  return `${nodeEditorPrefix(context)}-${suffix}`;
}
