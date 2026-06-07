import { elementChildren, firstChild, textContent } from './xml-parser.js';
import { GIZMO_FEATURES } from './features.js';

export function buildIr(document, { filename = '<xml>' } = {}) {
  const root = document.root || document;
  if (!root || root.name !== 'gizmo') throw new Error(`Expected <gizmo> root in ${filename}`);
  const contract = readContractSection(root);
  const requires = readRequires(root);
  const provides = readProvides(root);
  const model = readModel(root);
  const behavior = readBehavior(root);
  const effects = readEffects(root);
  const resources = readResources(root);
  const dev = readDev(root);
  const interactions = [...readInteractions(root), ...readInteractions(behavior.ast)];
  const actions = [...readActions(root), ...behavior.actions];
  const events = mergeByName([...contract.events, ...readEvents(root), ...behavior.events]);
  const props = mergeByName([...contract.props, ...readProps(root)]);
  const state = mergeByName([...model.state, ...readState(root)]);
  const frames = mergeByName([...readFrames(root), ...effects.frames]);
  const fixtures = [...readFixtures(root), ...dev.fixtures];
  const tests = [...readTests(root), ...dev.tests];
  const ir = {
    version: '0.5',
    featuresVersion: GIZMO_FEATURES.version,
    source: filename,
    name: root.attrs.name || '',
    tag: root.attrs.tag || '',
    css: root.attrs.css || contract.styles[0]?.attrs?.src || '',
    shadow: root.attrs.shadow || '',
    uses: elementChildren(root, 'use').map(node => ({ library: node.attrs.library || '', attrs: node.attrs })),
    build: readBuild(root),
    diagnosticsPolicy: readDiagnosticsPolicy(root),
    about: readAbout(root),
    terms: readTerms(root),
    contract,
    types: readTypes(root),
    requires,
    provides,
    model,
    props,
    attrs: contract.attrs,
    state,
    events,
    methods: contract.methods,
    slots: contract.slots,
    parts: contract.parts,
    view: readView(root),
    geometry: readGeometry(root),
    behavior,
    actions,
    interactions,
    effects,
    resources,
    frames,
    dev,
    fixtures,
    tests,
    features: GIZMO_FEATURES,
    sections: readAllSections(root),
    root
  };
  return ir;
}

function readBuild(root) { return safeChildren(root, 'build').map(node => ({ attrs: node.attrs })); }
function readDiagnosticsPolicy(root) { return safeChildren(root, 'diagnostics').map(node => ({ attrs: node.attrs })); }

function readAbout(root) {
  const about = firstChild(root, 'about');
  if (!about) return {};
  return { summary: normalizeText(textContent(firstChild(about, 'summary'))), text: normalizeText(textContent(about)), ast: about };
}

function readTerms(root) {
  const terms = firstChild(root, 'terms');
  if (!terms) return [];
  return elementChildren(terms, 'term').map(term => ({ name: term.attrs.name || '', text: normalizeText(textContent(term)), attrs: term.attrs }));
}

function readContractSection(root) {
  const contract = firstChild(root, 'contract');
  const propsNode = firstChild(contract, 'props');
  const attrsNode = firstChild(contract, 'attrs');
  const eventsNode = firstChild(contract, 'events');
  const methodsNode = firstChild(contract, 'methods');
  const slotsNode = firstChild(contract, 'slots');
  const partsNode = firstChild(contract, 'parts');
  return {
    props: readPropsFrom(propsNode),
    attrs: readAttrsFrom(attrsNode),
    events: readEventsFrom(eventsNode),
    methods: methodsNode ? elementChildren(methodsNode, 'method').map(readNamedNode) : [],
    slots: slotsNode ? elementChildren(slotsNode, 'slot').map(readNamedNode) : [],
    parts: partsNode ? elementChildren(partsNode, 'part').map(readNamedNode) : [],
    styles: contract ? elementChildren(contract, 'style').map(readNamedNode) : [],
    ast: contract
  };
}

function readRequires(root) {
  const node = firstChild(root, 'requires');
  if (!node) return { components: [], styles: [], scripts: [], assets: [], capabilities: [], services: [], themes: [], ast: null };
  return {
    components: elementChildren(node, 'component').map(readNamedNode),
    styles: elementChildren(node, 'style').map(readNamedNode),
    scripts: elementChildren(node, 'script').map(readNamedNode),
    assets: elementChildren(node, 'asset').map(readNamedNode),
    capabilities: elementChildren(node, 'capability').map(readNamedNode),
    services: elementChildren(node, 'service').map(readNamedNode),
    themes: elementChildren(node, 'theme').map(readNamedNode),
    ast: node
  };
}

function readProvides(root) {
  const node = firstChild(root, 'provides');
  if (!node) return { capabilities: [], services: [], ast: null };
  return {
    capabilities: elementChildren(node, 'capability').map(readNamedNode),
    services: elementChildren(node, 'service').map(readNamedNode),
    ast: node
  };
}

function readModel(root) {
  const node = firstChild(root, 'model');
  if (!node) return { state: [], signals: [], computed: [], subscriptions: [], stores: [], ast: null };
  const stateNode = firstChild(node, 'state');
  return {
    state: readStateFrom(stateNode),
    signals: elementChildren(node, 'signal').map(readNamedCodeNode),
    computed: elementChildren(node, 'computed').map(readNamedCodeNode),
    subscriptions: elementChildren(node, 'subscription').map(readNamedCodeNode),
    stores: elementChildren(node, 'store').map(readNamedNode),
    ast: node
  };
}

function readBehavior(root) {
  const node = firstChild(root, 'behavior');
  if (!node) return { events: [], actions: [], reducers: [], streams: [], machines: [], commands: [], ast: null };
  return {
    events: elementChildren(node, 'event').map(readBehaviorEvent),
    actions: [...elementChildren(node, 'action').map(readActionNode), ...elementChildren(firstChild(node, 'actions'), 'action').map(readActionNode)],
    reducers: elementChildren(node, 'reducer').map(readNamedCodeNode),
    streams: elementChildren(node, 'stream').map(readNamedCodeNode),
    machines: elementChildren(node, 'machine').map(readMachine),
    commands: elementChildren(node, 'command').map(readNamedCodeNode),
    ast: node
  };
}

function readTypes(root) {
  const types = firstChild(root, 'types');
  if (!types) return [];
  return elementChildren(types, 'type').map(type => ({ name: type.attrs.name || '', attrs: type.attrs, props: elementChildren(type, 'prop').map(readPropLike), ast: type }));
}

function readProps(root) { return readPropsFrom(firstChild(root, 'props')); }
function readPropsFrom(props) { return props ? elementChildren(props, 'prop').map(readPropLike) : []; }
function readAttrsFrom(attrs) { return attrs ? elementChildren(attrs, 'attr').map(readPropLike) : []; }

function readState(root) { return readStateFrom(firstChild(root, 'state')); }
function readStateFrom(state) {
  if (!state) return [];
  const explicit = elementChildren(state).filter(node => node.name === 'field' || node.name === 'value').map(readPropLike);
  const attrFields = Object.entries(state.attrs || {}).map(([name, value]) => ({
    name, field: camel(name), kind: inferKindFromDefault(value), of: '', values: [], default: value, reflect: false, attrFormat: '', readonly: false, required: false, optional: false, attrs: { name, default: value }
  }));
  return [...attrFields, ...explicit];
}

function readEvents(root) { return readEventsFrom(firstChild(root, 'events')); }
function readEventsFrom(events) {
  if (!events) return [];
  return elementChildren(events, 'event').map(event => ({ name: event.attrs.name || '', attrs: event.attrs, detail: readEventDetail(event), text: normalizeText(textContent(event)), ast: event }));
}

function readEventDetail(event) {
  const detail = firstChild(event, 'detail');
  const fields = readFields(detail);
  if (fields.length) return fields;
  if (event.attrs.detail) return [{ name: 'detail', field: 'detail', kind: 'unknown', of: '', values: [], default: undefined, reflect: false, attrFormat: '', readonly: false, required: false, optional: false, expression: event.attrs.detail, attrs: { name: 'detail', expression: event.attrs.detail } }];
  return [];
}

function readView(root) {
  const view = firstChild(root, 'view');
  if (!view) return null;
  return { attrs: view.attrs, refs: collectAttrs(view, 'ref'), repeated: collectAttrs(view, 'each'), keys: collectAttrs(view, 'key'), bindings: collectBindings(view), ast: view };
}

function readGeometry(root) {
  const geometry = firstChild(root, 'geometry');
  if (!geometry) return { spaces: [], functions: [], ast: null };
  return {
    spaces: elementChildren(geometry, 'space').map(space => ({ name: space.attrs.name || '', attrs: space.attrs })),
    functions: elementChildren(geometry, 'function').map(fn => ({
      name: fn.attrs.name || '', attrs: fn.attrs, params: elementChildren(fn, 'param').map(readPropLike),
      lets: elementChildren(fn, 'let').map(node => ({ name: node.attrs.name || '', value: node.attrs.value || '', attrs: node.attrs })),
      returns: normalizeCode(textContent(firstChild(fn, 'return'))), ast: fn
    })),
    ast: geometry
  };
}

function readActions(root) {
  const actions = firstChild(root, 'actions');
  if (!actions) return [];
  return elementChildren(actions, 'action').map(readActionNode);
}

function readActionNode(action) {
  return { name: action.attrs.name || '', attrs: action.attrs, steps: elementChildren(action).map(readCommand), text: normalizeText(textContent(action)), ast: action };
}

function readBehaviorEvent(event) {
  return { name: event.attrs.name || '', attrs: event.attrs, steps: elementChildren(event).map(readCommand), text: normalizeText(textContent(event)), ast: event };
}

function readInteractions(root) {
  if (!root) return [];
  const section = firstChild(root, 'interactions');
  if (!section) return [];
  return elementChildren(section).map(node => readInteractionNode(node));
}

function readInteractionNode(node) {
  const children = elementChildren(node);
  const nestedChildren = children.filter(child => isNestedInteractionChild(node, child));
  return {
    kind: node.name, name: node.attrs.name || '', attrs: node.attrs, about: readAbout(node), contract: readContract(firstChild(node, 'contract')),
    invariants: readInvariants(firstChild(node, 'invariants')), agentNotes: readAgentNotes(firstChild(node, 'agent-notes')), nested: nestedChildren.map(child => readInteractionNode(child)),
    commands: children.filter(child => !['about', 'contract', 'invariants', 'agent-notes'].includes(child.name) && !nestedChildren.includes(child)).map(readCommand),
    ast: node, text: normalizeText(textContent(node))
  };
}

function readContract(node) {
  if (!node) return null;
  const section = name => firstChild(node, name) ? elementChildren(firstChild(node, name)).map(item => ({ kind: item.name, name: item.attrs.name || item.attrs.ref || '', attrs: item.attrs })) : [];
  return { reads: section('reads'), mutates: section('mutates'), emits: section('emits'), schedules: section('schedules'), forbids: section('forbids'), ast: node };
}

function readInvariants(node) { return node ? elementChildren(node, 'invariant').map(item => ({ name: item.attrs.name || '', attrs: item.attrs, text: normalizeText(textContent(item)) })) : []; }
function readAgentNotes(node) { return node ? elementChildren(node, 'note').map(item => ({ priority: item.attrs.priority || '', attrs: item.attrs, text: normalizeText(textContent(item)) })) : []; }

function readEffects(root) {
  const effects = firstChild(root, 'effects');
  if (!effects) return { effects: [], tasks: [], workers: [], frames: [], ast: null };
  return {
    effects: elementChildren(effects, 'effect').map(readEffectNode),
    tasks: elementChildren(effects, 'task').map(readEffectNode),
    workers: elementChildren(effects, 'worker').map(readEffectNode),
    frames: elementChildren(effects, 'frame').map(readFrameNode),
    ast: effects
  };
}

function readEffectNode(effect) { return { kind: effect.name, name: effect.attrs.name || '', attrs: effect.attrs, steps: elementChildren(effect).map(readCommand), text: normalizeText(textContent(effect)), ast: effect }; }
function readFrames(root) { const frames = firstChild(root, 'frames'); return frames ? elementChildren(frames, 'frame').map(readFrameNode) : []; }
function readFrameNode(frame) { return { name: frame.attrs.name || '', attrs: frame.attrs, effects: elementChildren(frame, 'effect').map(effect => effect.attrs.name || ''), ast: frame }; }

function readResources(root) {
  const resources = firstChild(root, 'resources');
  if (!resources) return { resources: [], listens: [], observes: [], timers: [], ast: null };
  return {
    resources: elementChildren(resources, 'resource').map(resource => ({ name: resource.attrs.name || '', attrs: resource.attrs, acquire: firstChild(resource, 'acquire'), release: firstChild(resource, 'release'), ast: resource, text: normalizeText(textContent(resource)) })),
    listens: elementChildren(resources, 'listen').map(readNamedNode),
    observes: elementChildren(resources, 'observe').map(readNamedNode),
    timers: elementChildren(resources, 'timer').map(readNamedNode),
    ast: resources
  };
}

function readDev(root) {
  const dev = firstChild(root, 'dev');
  if (!dev) return { stories: [], tests: [], fixtures: [], traces: [], probes: [], ast: null };
  const probes = firstChild(dev, 'probes');
  return {
    stories: elementChildren(dev, 'story').map(readNamedCodeNode),
    tests: elementChildren(dev, 'test').map(readTestNode),
    fixtures: elementChildren(dev, 'fixture').map(readFixtureNode),
    traces: elementChildren(dev, 'trace').map(readNamedCodeNode),
    probes: probes ? elementChildren(probes).filter(node => node.name === 'probe' || node.name === 'layout-probe').map(readProbe) : [],
    ast: dev
  };
}

function readProbe(node) { return { kind: node.name, name: node.attrs.name || '', attrs: node.attrs, message: normalizeText(textContent(firstChild(node, 'message'))) || normalizeText(textContent(node)), hints: firstChild(node, 'hints') ? elementChildren(firstChild(node, 'hints'), 'hint').map(hint => normalizeText(textContent(hint))) : [], body: node.name === 'probe' ? normalizeCode(textContent(node)) : '', ast: node }; }
function readFixtures(root) { const fixtures = firstChild(root, 'fixtures'); return fixtures ? elementChildren(fixtures, 'fixture').map(readFixtureNode) : []; }
function readFixtureNode(fixture) { return { name: fixture.attrs.name || '', attrs: fixture.attrs, ast: fixture, text: normalizeText(textContent(fixture)) }; }
function readTests(root) { const tests = firstChild(root, 'tests'); return tests ? elementChildren(tests, 'test').map(readTestNode) : []; }
function readTestNode(test) { return { name: test.attrs.name || '', attrs: test.attrs, given: firstChild(test, 'given'), when: firstChild(test, 'when'), then: firstChild(test, 'then'), ast: test, text: normalizeText(textContent(test)) }; }

function readMachine(machine) { return { name: machine.attrs.name || '', attrs: machine.attrs, states: elementChildren(machine, 'state').map(state => ({ name: state.attrs.name || '', attrs: state.attrs, ons: elementChildren(state, 'on').map(readNamedNode), ast: state })), ast: machine, text: normalizeText(textContent(machine)) }; }
function readNamedNode(node) { return { kind: node.name, name: node.attrs.name || node.attrs.tag || node.attrs.src || node.attrs.library || '', attrs: node.attrs, text: normalizeText(textContent(node)), ast: node }; }
function readNamedCodeNode(node) { return { kind: node.name, name: node.attrs.name || '', attrs: node.attrs, body: normalizeCode(textContent(node)), text: normalizeText(textContent(node)), ast: node }; }
function readCommand(node) { return { kind: node.name, name: node.attrs.name || node.attrs.action || '', attrs: node.attrs, text: normalizeText(textContent(node)), ast: node }; }
function readFields(node) { return node ? elementChildren(node, 'field').map(readPropLike) : []; }
function readAllSections(root) { return elementChildren(root).map(node => ({ kind: node.name, name: node.attrs.name || node.attrs.library || '', attrs: node.attrs })); }

function readPropLike(node) {
  const rawKind = node.attrs.kind || typeToKind(node.attrs.type) || '';
  return {
    name: node.attrs.name || '', field: node.attrs.field || camel(node.attrs.name || ''), kind: rawKind,
    type: node.attrs.type || '', of: node.attrs.of || typeParameter(node.attrs.type) || '',
    values: node.attrs.values ? node.attrs.values.trim().split(/\s+/) : [], default: node.attrs.default,
    reflect: node.attrs.reflect === 'true', readonly: node.attrs.readonly === 'true', required: node.attrs.required === 'true', optional: node.attrs.optional === 'true',
    attrFormat: node.attrs['attr-format'] || '', min: node.attrs.min, max: node.attrs.max, attrs: node.attrs
  };
}

function collectAttrs(node, attrName, out = []) { if (node?.type === 'element' && Object.prototype.hasOwnProperty.call(node.attrs || {}, attrName)) out.push({ element: node.name, value: node.attrs[attrName], attrs: node.attrs }); for (const child of node?.children || []) collectAttrs(child, attrName, out); return out; }
function collectBindings(node, out = []) { if (node?.type === 'text' && /\{[^}]+\}/.test(node.value)) out.push({ kind: 'text', value: node.value }); if (node?.type === 'element') { for (const [name, value] of Object.entries(node.attrs || {})) { if (name.includes('.') || /^bind\./.test(name) || /^on\./.test(name) || /\{[^}]+\}/.test(value) || ['each', 'key', 'if', 'hidden'].includes(name)) out.push({ kind: 'attribute', element: node.name, name, value }); } } for (const child of node?.children || []) collectBindings(child, out); return out; }
function isInteractionKind(name) { return [...GIZMO_FEATURES.interactionTags.core, 'interaction', 'select-box', 'scrub', 'resizer', 'splitter'].includes(name); }
function isNestedInteractionChild(parent, child) {
  if (['about', 'contract', 'invariants', 'agent-notes'].includes(child.name)) return false;
  return isInteractionKind(child.name) || (parent.name === 'interaction' && !GIZMO_FEATURES.commandTags.includes(child.name));
}
function safeChildren(root, name) { return root ? elementChildren(root, name) : []; }
function mergeByName(items) { const out = []; const seen = new Set(); for (const item of items || []) { const key = item.name || JSON.stringify(item.attrs || {}); if (seen.has(key)) continue; seen.add(key); out.push(item); } return out; }
function normalizeText(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function normalizeCode(value) { return String(value || '').replace(/^\s*\n/, '').replace(/\n\s*$/, '').trim(); }
function camel(value) { return String(value || '').replace(/-([a-z])/g, (_, c) => c.toUpperCase()); }
function inferKindFromDefault(value) { if (value === 'true' || value === 'false') return 'boolean'; if (value !== '' && Number.isFinite(Number(value))) return 'number'; return 'text'; }
function typeToKind(type = '') { const t = String(type).replace(/\?$/, ''); const map = { String: 'text', Number: 'number', Boolean: 'boolean', URL: 'url', Array: 'list', Object: 'record' }; if (map[t]) return map[t]; if (/\[\]$/.test(t) || /^Array</.test(t)) return 'list'; return t ? t.toLowerCase() : ''; }
function typeParameter(type = '') { const t = String(type); const m1 = t.match(/^Array<([^>]+)>$/); if (m1) return m1[1]; const m2 = t.match(/^(.+)\[\]$/); if (m2) return m2[1]; return ''; }
