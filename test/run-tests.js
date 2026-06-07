import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { compileGizmo } from '../src/compiler/index.js';
import { hasErrors } from '../src/compiler/validate.js';

function hasInteraction(items, kind) {
  return items.some(item => item.kind === kind || hasInteraction(item.nested || [], kind));
}

const xmlSources = [
  ['example/node-editor/src/node-card.xml', 'fox-ve-node-card'],
  ['example/node-editor/src/node-cable.xml', 'fox-ve-node-cable'],
  ['example/node-editor/src/node-graph.xml', 'fox-ve-node-graph']
];

for (const [entry, tag] of xmlSources) {
  const result = await compileGizmo(entry, { nodeEditorImport: 'gizmo/node-editor' });
  assert.equal(hasErrors(result.diagnostics), false, `${entry} should compile without errors`);
  assert.equal(result.ir.tag, tag);
  assert.match(result.js, new RegExp(`class .* extends HTMLElement`), `${entry} should generate a Web Component class`);
}

const graph = await compileGizmo('example/node-editor/src/node-graph.xml', { nodeEditorImport: 'gizmo/node-editor' });
assert.equal(graph.ir.uses.some(use => use.library === 'gizmo/node-editor'), true, 'node-editor library boundary is required');
assert.equal(hasInteraction(graph.ir.interactions, 'drag'), true, 'drag interaction should be parsed');
assert.equal(hasInteraction(graph.ir.interactions, 'connect'), true, 'connect interaction should be parsed');
assert.equal(graph.ir.dev.probes.some(item => item.kind === 'layout-probe'), true, 'layout probes should be parsed');
assert.match(graph.js, /import '\.\/node-card\.generated\.js'/, 'graph generated JS should import generated node-card component');
assert.match(graph.js, /import '\.\/node-cable\.generated\.js'/, 'graph generated JS should import generated node-cable component');
assert.match(graph.js, /document\.createElement\('fox-ve-node-cable'\)/, 'graph generated JS should compose generated cable components');
assert.doesNotMatch(graph.js, /defineNodeEditorCard/, 'graph generated JS must not ask support library to define card');
assert.doesNotMatch(graph.js, /extends NodeEditorGraphImplementation/, 'generated JS must not subclass an escape-hatch graph implementation');

const distGraph = await readFile('example/node-editor/dist/node-graph.generated.js', 'utf8');
assert.doesNotMatch(distGraph, /\.\.\/src\//, 'dist generated output must not import from src');
assert.match(distGraph, /class FoxVeNodeGraph extends HTMLElement/, 'dist generated output owns the graph element');
assert.match(distGraph, /fox-ve-node-cable/, 'dist generated output composes cable component');

const distFiles = await readdir('example/node-editor/dist');
for (const name of ['node-card.generated.js', 'node-cable.generated.js', 'node-graph.generated.js', 'node-card.xml', 'node-cable.xml', 'node-graph.xml']) {
  assert.equal(distFiles.includes(name), true, `dist should include ${name}`);
}

const libraryIndex = await readFile('example/node-editor/dist/library/index.js', 'utf8');
assert.doesNotMatch(libraryIndex, /node-card\.js|node-graph\.js|node-cable\.js/, 'support library must not export component implementations');
const libraryFiles = await readdir('example/node-editor/dist/library');
assert.equal(libraryFiles.includes('node-card.js'), false, 'support library must not contain generated card implementation');

const graphManifest = JSON.parse(await readFile('example/node-editor/dist/node-graph.manifest.json', 'utf8'));
assert.equal(graphManifest.tag, 'fox-ve-node-graph');
assert.equal(hasInteraction(graphManifest.interactions, 'connect'), true);
assert.equal(graphManifest.dev.probes.length >= 3, true, 'manifest should include development probes');
assert.equal(graphManifest.fixtures.length >= 1, true, 'manifest should include fixtures');
assert.equal(graphManifest.tests.length >= 1, true, 'manifest should include tests');


const processIndex = JSON.parse(await readFile('process-library/index.json', 'utf8'));
assert.equal(processIndex.procedures.length >= 14, true, 'process library should include detailed conversion procedures');
for (const proc of processIndex.procedures) {
  const body = await readFile(`process-library/${proc.path}`, 'utf8');
  assert.match(body, /## Purpose/, `${proc.path} should describe purpose`);
  assert.match(body, /## (Steps|Required reading)/, `${proc.path} should include executable guidance`);
  assert.match(body, /## Quality gates/, `${proc.path} should include quality gates`);
}

const searchIndex = JSON.parse(await readFile('process-library/solutions/search-index.json', 'utf8'));
const searchBlob = JSON.stringify(searchIndex);
for (const required of ['createElement', 'ResizeObserver', 'CustomEvent', 'pointerdown pointermove pointerup', 'escape hatch', 'SVG']) {
  assert.equal(searchBlob.includes(required), true, `search index should route ${required}`);
}
for (const entry of searchIndex.entries) {
  assert.equal(Array.isArray(entry.read) && entry.read.length > 0, true, `${entry.id} should reference reading material`);
  for (const ref of entry.read) {
    await readFile(`process-library/${ref}`, 'utf8');
  }
}

const featureMap = await readFile('process-library/reference/js-to-gizmo-feature-map.md', 'utf8');
for (const feature of ['observedAttributes', 'connectedCallback', 'createElement', 'classList.toggle', 'dispatchEvent', 'ResizeObserver', 'requestAnimationFrame', 'createElementNS']) {
  assert.equal(featureMap.includes(feature), true, `feature map should include ${feature}`);
}


const features = JSON.parse(await readFile('features.json', 'utf8'));
const processFeatures = JSON.parse(await readFile('process-library/features.json', 'utf8'));
assert.deepEqual(processFeatures.canonicalRoot, features.canonicalRoot, 'process-library features should mirror root features');
for (const required of ['contract', 'requires', 'provides', 'model', 'view', 'behavior', 'effects', 'resources', 'dev']) {
  assert.equal(features.canonicalRoot.includes(required), true, `features.json should include ${required}`);
}
for (const required of ['props', 'events', 'methods', 'slots', 'parts']) {
  assert.equal(features.sections.contract.children.includes(required), true, `contract should include ${required}`);
}
for (const required of ['component', 'style', 'asset', 'capability', 'service']) {
  assert.equal(features.sections.requires.children.includes(required), true, `requires should include ${required}`);
}
for (const required of ['action', 'reducer', 'stream', 'machine', 'command']) {
  assert.equal(features.behaviorSurfaces.includes(required), true, `behavior surface should include ${required}`);
}
for (const required of ['resource', 'listen', 'observe', 'timer']) {
  assert.equal(features.resourceTags.includes(required), true, `resource tags should include ${required}`);
}
const featuresCli = await import('../src/compiler/features.js');
assert.equal(featuresCli.GIZMO_FEATURES.sections.contract.children.includes('methods'), true, 'compiler feature catalog should expose full contract grammar');
const graphIr = graph.ir;
assert.equal(graphIr.contract.props.length > 0, true, 'graph should parse contract props');
assert.equal(graphIr.requires.components.some(item => item.attrs.tag === 'fox-ve-node-card'), true, 'graph should parse required card component');
assert.equal(graphIr.model.state.length > 0, true, 'graph should parse model state');

console.log('All Gizmosis tests passed.');
