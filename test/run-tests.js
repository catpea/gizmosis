import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, readdir, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { compileGizmo, lowerView } from '../src/compiler/index.js';
import { hasErrors } from '../src/compiler/validate.js';
import { nodeEditorPackageGenerator } from '../example/node-editor/src/library/compiler/index.js';

const execFileAsync = promisify(execFile);
const nodeEditorCompileOptions = {
  packageImports: { 'gizmo/node-editor': 'gizmo/node-editor' },
  packageGenerators: { 'gizmo/node-editor': nodeEditorPackageGenerator }
};

function hasInteraction(items, kind) {
  return items.some(item => item.kind === kind || hasInteraction(item.nested || [], kind));
}

async function collectJavaScriptFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await collectJavaScriptFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(path);
  }
  return files;
}

function staticModuleSpecifiers(source) {
  return [...source.matchAll(/(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g)].map(match => match[1]);
}

const xmlSources = [
  ['example/node-editor/src/node-card.xml', 'fox-ve-node-card'],
  ['example/node-editor/src/node-cable.xml', 'fox-ve-node-cable'],
  ['example/node-editor/src/node-graph.xml', 'fox-ve-node-graph']
];

for (const [entry, tag] of xmlSources) {
  const result = await compileGizmo(entry, nodeEditorCompileOptions);
  assert.equal(hasErrors(result.diagnostics), false, `${entry} should compile without errors`);
  assert.equal(result.ir.tag, tag);
  assert.match(result.js, new RegExp(`class .* extends HTMLElement`), `${entry} should generate a Web Component class`);
}

const graph = await compileGizmo('example/node-editor/src/node-graph.xml', nodeEditorCompileOptions);
assert.equal(graph.ir.uses.some(use => use.library === 'gizmo/node-editor'), true, 'node-editor library boundary is required');
assert.equal(hasInteraction(graph.ir.interactions, 'drag'), true, 'drag interaction should be parsed');
assert.equal(hasInteraction(graph.ir.interactions, 'connect'), true, 'connect interaction should be parsed');
assert.equal(graph.ir.dev.probes.some(item => item.kind === 'layout-probe'), true, 'layout probes should be parsed');
assert.match(graph.js, /import '\.\/node-card\.generated\.js'/, 'graph generated JS should import generated node-card component');
assert.match(graph.js, /import '\.\/node-cable\.generated\.js'/, 'graph generated JS should import generated node-cable component');
assert.match(graph.js, /document\.createElement\('fox-ve-node-cable'\)/, 'graph generated JS should compose generated cable components');
assert.doesNotMatch(graph.js, /defineNodeEditorCard/, 'graph generated JS must not ask support library to define card');
assert.doesNotMatch(graph.js, /extends NodeEditorGraphImplementation/, 'generated JS must not subclass an escape-hatch graph implementation');

const generatorSource = await readFile('src/compiler/generator.js', 'utf8');
const validatorSource = await readFile('src/compiler/validate.js', 'utf8');
assert.doesNotMatch(generatorSource, /NODE_EDITOR_GRAPH_CLASS/, 'generator should not contain an escaped graph implementation string');
assert.doesNotMatch(generatorSource, /fox-ve-node-card-ports|fox-ve-node-card-inputs|fox-ve-node-card-outputs/, 'generator should not hardcode node-card HTML classes');
assert.doesNotMatch(generatorSource, /node-card-header|node-graph-viewport|NODE_CARD_HTML/, 'generator should not embed node-editor HTML markup');
assert.doesNotMatch(validatorSource, /gizmo\/node-editor|NODE_EDITOR/, 'validator should not hardcode node-editor package rules');
await assert.rejects(readdir('src/compiler/templates/node-editor'), /ENOENT/, 'compiler package should not contain node-editor templates');
const loweredCardView = lowerView((await compileGizmo('example/node-editor/src/node-card.xml', nodeEditorCompileOptions)).ir.view.ast, {
  replacements: { 'css-prefix': 'acme' }
});
assert.match(loweredCardView.html, /acme-node-card-ports/, 'view lowering should generate prefixed card HTML from XML');
assert.match(loweredCardView.html, /acme-node-card-inputs/, 'view lowering should generate prefixed input port container markup');
assert.match(loweredCardView.html, /acme-node-card-outputs/, 'view lowering should generate prefixed output port container markup');
assert.equal(loweredCardView.repeats.length, 2, 'view lowering should split repeated port templates from the main card view');
assert.match(loweredCardView.repeats.find(repeat => repeat.collection === 'inputs')?.html || '', /acme-node-card-port/, 'input repeat template should come from XML view lowering');
assert.match(loweredCardView.repeats.find(repeat => repeat.collection === 'outputs')?.html || '', /acme-node-card-port/, 'output repeat template should come from XML view lowering');
for (const template of await collectJavaScriptFiles('example/node-editor/src/library/compiler')) {
  if (template.endsWith('/index.js')) continue;
  const source = await readFile(template, 'utf8');
  assert.doesNotMatch(source, /fox-ve-/, `${template} should not hardcode the default project prefix`);
}
const packageGeneratorFiles = await readdir('example/node-editor/src/library/compiler');
assert.deepEqual(packageGeneratorFiles.filter(name => name.endsWith('.html')), [], 'package generator should not duplicate XML view markup in HTML templates');
for (const [entry] of xmlSources) {
  const source = await readFile(entry, 'utf8');
  assert.doesNotMatch(source, /fox-ve-node-card-ports|fox-ve-node-card-inputs|fox-ve-node-card-outputs|fox-ve-node-graph-viewport/, `${entry} should parameterize class prefixes`);
}
const customPrefixCard = await compileGizmo('example/node-editor/src/node-card.xml', { ...nodeEditorCompileOptions, cssPrefix: 'acme' });
assert.match(customPrefixCard.js, /acme-node-card-ports/, 'custom CSS prefix should reach card HTML');
assert.match(customPrefixCard.js, /acme-node-card-inputs/, 'custom CSS prefix should reach input port class');
assert.match(customPrefixCard.js, /acme-node-card-outputs/, 'custom CSS prefix should reach output port class');
const customPrefixGraph = await compileGizmo('example/node-editor/src/node-graph.xml', { ...nodeEditorCompileOptions, cssPrefix: 'acme' });
assert.match(customPrefixGraph.js, /acme-node-graph-viewport/, 'custom CSS prefix should reach graph HTML');
assert.match(customPrefixGraph.js, /acme-node-card-port/, 'custom CSS prefix should reach graph selectors');
const cliPrefixOutput = '/tmp/gizmosis-cli-node-card.generated.js';
await execFileAsync(process.execPath, [
  'src/compiler/cli.js',
  'compile',
  'example/node-editor/src/node-card.xml',
  '--out',
  cliPrefixOutput,
  '--package-generator',
  'gizmo/node-editor=./example/node-editor/src/library/compiler/index.js',
  '--package-import',
  'gizmo/node-editor=gizmo/node-editor',
  '--css-prefix',
  'acme'
]);
const cliPrefixCard = await readFile(cliPrefixOutput, 'utf8');
await unlink(cliPrefixOutput);
assert.match(cliPrefixCard, /acme-node-card-ports/, 'CLI package generator should support custom CSS prefixes');

const distGraph = await readFile('example/node-editor/dist/node-graph.generated.js', 'utf8');
assert.doesNotMatch(distGraph, /\.\.\/src\//, 'dist generated output must not import from src');
assert.match(distGraph, /class FoxVeNodeGraph extends HTMLElement/, 'dist generated output owns the graph element');
assert.match(distGraph, /fox-ve-node-cable/, 'dist generated output composes cable component');

const distFiles = await readdir('example/node-editor/dist');
for (const name of ['node-card.generated.js', 'node-cable.generated.js', 'node-graph.generated.js', 'node-card.xml', 'node-cable.xml', 'node-graph.xml']) {
  assert.equal(distFiles.includes(name), true, `dist should include ${name}`);
}
assert.equal(distFiles.includes('core'), true, 'dist should include reusable core helpers');

const distRoot = resolve('example/node-editor/dist');
for (const file of await collectJavaScriptFiles('example/node-editor/dist')) {
  const source = await readFile(file, 'utf8');
  assert.doesNotMatch(source, /\.\.\/src\//, `${file} must not import from source files`);
  for (const specifier of staticModuleSpecifiers(source)) {
    if (!specifier.startsWith('.')) continue;
    const target = resolve(dirname(file), specifier);
    assert.equal(target === distRoot || target.startsWith(`${distRoot}/`), true, `${file} import ${specifier} should stay inside dist`);
    await readFile(target, 'utf8');
  }
}

const libraryIndex = await readFile('example/node-editor/dist/library/index.js', 'utf8');
assert.doesNotMatch(libraryIndex, /node-card\.js|node-graph\.js|node-cable\.js/, 'support library must not export component implementations');
const libraryFiles = await readdir('example/node-editor/dist/library');
assert.equal(libraryFiles.includes('node-card.js'), false, 'support library must not contain generated card implementation');
assert.equal(libraryFiles.includes('compiler'), false, 'runtime support library dist should not ship compiler templates');

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
assert.equal(Object.prototype.hasOwnProperty.call(features.interactionTags, 'nodeEditorPackage'), false, 'package interaction tags should live with package generators');
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
