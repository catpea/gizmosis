import { readFileSync } from 'node:fs';

const TEMPLATE_ROOT = new URL('./', import.meta.url);

const TEMPLATES = {
  graph: readTemplate('graph.js'),
  graphClass: readTemplate('graph-class.js'),
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
    if ((ir.tag || '') === 'fox-ve-node-card') return generateCard(ir, diagnostics, context);
    if ((ir.tag || '') === 'fox-ve-node-cable') return generateCable(ir, diagnostics, context);
    if ((ir.tag || '') === 'fox-ve-node-graph') return generateGraph(ir, diagnostics, context);
    return null;
  }
};

export default nodeEditorPackageGenerator;

function generateGraph(ir, diagnostics, context) {
  const manifest = context.generateManifest(ir, diagnostics);
  const cssPrefix = nodeEditorCssPrefix(context.options);
  const cardTag = findRequiredComponentTag(ir, 'node-card') || findNodeCardTag(ir, context) || 'fox-ve-node-card';
  const cableTag = findRequiredComponentTag(ir, 'node-cable') || 'fox-ve-node-cable';
  const graphHtml = lowerNodeEditorView(ir, context, cssPrefix, {
    repeatMode: 'omit',
    valueForExpression: graphInitialValue
  }).html;
  const graphClass = renderTemplate(TEMPLATES.graphClass, {
    'css-prefix': cssPrefix,
    'node-card-tag': cardTag,
    'node-graph-html': JSON.stringify(graphHtml)
  });

  return renderTemplate(TEMPLATES.graph, {
    banner: context.banner(ir),
    'implementation-import': JSON.stringify(packageImport(context, 'gizmo/node-editor')),
    manifest: JSON.stringify(manifest, null, 2),
    diagnostics: JSON.stringify(diagnostics, null, 2),
    'graph-class': graphClass,
    'css-prefix': cssPrefix,
    'node-card-tag': cardTag,
    'node-cable-tag': cableTag,
    source: JSON.stringify(ir.source),
    tag: JSON.stringify(ir.tag || 'fox-ve-node-graph')
  });
}

function generateCard(ir, diagnostics, context) {
  const manifest = context.generateManifest(ir, diagnostics);
  const cssPrefix = nodeEditorCssPrefix(context.options);
  const lowered = lowerNodeEditorView(ir, context, cssPrefix);
  const repeats = new Map(lowered.repeats.map(repeat => [repeat.collection, repeat.html]));

  return renderTemplate(TEMPLATES.card, {
    banner: context.banner(ir),
    'implementation-import': JSON.stringify(packageImport(context, 'gizmo/node-editor')),
    manifest: JSON.stringify(manifest, null, 2),
    diagnostics: JSON.stringify(diagnostics, null, 2),
    'css-prefix': cssPrefix,
    'tag-name': ir.tag || 'fox-ve-node-card',
    tag: JSON.stringify(ir.tag || 'fox-ve-node-card'),
    'node-card-html': JSON.stringify(lowered.html),
    'node-card-input-port-html': JSON.stringify(repeats.get('inputs') || ''),
    'node-card-output-port-html': JSON.stringify(repeats.get('outputs') || '')
  });
}

function generateCable(ir, diagnostics, context) {
  const manifest = context.generateManifest(ir, diagnostics);
  const cssPrefix = nodeEditorCssPrefix(context.options);
  const graphTag = findRequiredComponentTag(ir, 'node-graph') || 'fox-ve-node-graph';

  return renderTemplate(TEMPLATES.cable, {
    banner: context.banner(ir),
    'implementation-import': JSON.stringify(packageImport(context, 'gizmo/node-editor')),
    manifest: JSON.stringify(manifest, null, 2),
    diagnostics: JSON.stringify(diagnostics, null, 2),
    'css-prefix': cssPrefix,
    'node-graph-tag': graphTag,
    'tag-name': ir.tag || 'fox-ve-node-cable',
    tag: JSON.stringify(ir.tag || 'fox-ve-node-cable')
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

function packageImport(context, library) {
  return context.options.packageImports?.[library] || library;
}

function nodeEditorCssPrefix(options) {
  return sanitizeCssPrefix(options.nodeEditorCssPrefix || options.cssPrefix || 'fox-ve');
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
  const match = String(source).match(/<([a-z][a-z0-9-]*node-card\b|fox-ve-node-card\b)/i);
  return match?.[1] || null;
}
