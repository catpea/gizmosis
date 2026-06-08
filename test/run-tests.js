import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { compileGizmo, lowerView, renderProjectPrefixString } from '../src/compiler/index.js';
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
  ['example/node-editor/src/node-card.xml', 'go-node-card'],
  ['example/node-editor/src/node-cable.xml', 'go-node-cable'],
  ['example/node-editor/src/node-graph.xml', 'go-node-graph']
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
assert.match(graph.js, /createNodeEditorGraphRuntime/, 'graph generated JS should delegate VPL mechanics to descriptor-driven runtime support');
assert.match(graph.js, /"cable": "go-node-cable"/, 'graph generated JS should pass the generated cable tag through config');
assert.doesNotMatch(graph.js, /defineNodeEditorCard/, 'graph generated JS must not ask support library to define card');
assert.doesNotMatch(graph.js, /extends NodeEditorGraphImplementation/, 'generated JS must not subclass an escape-hatch graph implementation');
const graphShellSource = graph.js.slice(graph.js.indexOf('const NODE_GRAPH_CONFIG'));
assert.doesNotMatch(graphShellSource, /prototype\._drawEdges|_onPointerMove\(event\)|_probeEdgesMeetPortDots/, 'generated graph shell must not inline the old graph implementation');

const generatorSource = await readFile('src/compiler/generator.js', 'utf8');
const validatorSource = await readFile('src/compiler/validate.js', 'utf8');
assert.doesNotMatch(generatorSource, /NODE_EDITOR_GRAPH_CLASS/, 'generator should not contain an escaped graph implementation string');
assert.doesNotMatch(generatorSource, /fox-ve-node-card-ports|fox-ve-node-card-inputs|fox-ve-node-card-outputs/, 'generator should not hardcode node-card HTML classes');
assert.doesNotMatch(generatorSource, /node-card-header|node-graph-viewport|NODE_CARD_HTML/, 'generator should not embed node-editor HTML markup');
assert.doesNotMatch(validatorSource, /gizmo\/node-editor|NODE_EDITOR/, 'validator should not hardcode node-editor package rules');
await assert.rejects(readdir('src/compiler/templates/node-editor'), /ENOENT/, 'compiler package should not contain node-editor templates');
await assert.rejects(readFile('example/node-editor/src/library/compiler/graph-class.js', 'utf8'), /ENOENT/, 'graph-class.js escape hatch must not exist');
const graphRuntimeSource = await readFile('example/node-editor/src/library/graph-runtime.js', 'utf8');
assert.doesNotMatch(graphRuntimeSource, /extends HTMLElement|customElements\.define|FoxVeNodeGraph|fox-ve-|\{\{/, 'runtime graph support must be generic and selector-configured');
assert.match(graphRuntimeSource, /createNodeEditorGraphRuntime/, 'runtime graph support should expose descriptor-driven VPL mechanics');
for (const file of await collectJavaScriptFiles('example/node-editor/src')) {
  const source = await readFile(file, 'utf8');
  const inPackageCompiler = file.includes('/library/compiler/');
  if (!inPackageCompiler) {
    assert.doesNotMatch(source, /customElements\.define|class\s+\w+\s+extends\s+HTMLElement|extends\s+HTMLElement|attachShadow\s*\(/, `${file} must not implement a Web Component outside XML/package generation`);
  }
  assert.doesNotMatch(file, /\/node-(card|cable|graph)\.js$/, `${file} looks like an XML-bypassing component implementation`);
}
const loweredCardView = lowerView((await compileGizmo('example/node-editor/src/node-card.xml', { ...nodeEditorCompileOptions, prefix: 'acme' })).ir.view.ast);
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
assert.equal(packageGeneratorFiles.includes('graph-class.js'), false, 'package generator should not contain graph-class escape hatch files');
const graphTemplate = await readFile('example/node-editor/src/library/compiler/graph.js', 'utf8');
assert.doesNotMatch(graphTemplate, /_onPointerMove|_probeEdgesMeetPortDots|prototype\._drawEdges/, 'graph generator template should stay a thin generated shell');
for (const [entry] of xmlSources) {
  const source = await readFile(entry, 'utf8');
  assert.doesNotMatch(source, /fox-ve-node-card-ports|fox-ve-node-card-inputs|fox-ve-node-card-outputs|fox-ve-node-graph-viewport/, `${entry} should parameterize class prefixes`);
  assert.doesNotMatch(source, /fox-ve-node-(card|cable|graph)/, `${entry} should not use the legacy fox-ve tag prefix`);
}
const sourceCssTemplate = await readFile('example/node-editor/src/node-graph.css', 'utf8');
assert.match(sourceCssTemplate, /\{\{prefix\}\}-node-graph/, 'source CSS should template tag prefixes');
assert.match(sourceCssTemplate, /\{\{css-prefix\}\}-node-card-port/, 'source CSS should template class prefixes');
assert.doesNotMatch(sourceCssTemplate, /fox-ve-/, 'source CSS must not hardcode the legacy project prefix');
assert.match(renderProjectPrefixString(sourceCssTemplate, { prefix: 'acme' }), /acme-node-graph/, 'CSS prefix rendering should rewrite tag selectors');
assert.match(renderProjectPrefixString(sourceCssTemplate, { prefix: 'acme' }), /acme-node-card-port/, 'CSS prefix rendering should rewrite class selectors');

const customPrefixCard = await compileGizmo('example/node-editor/src/node-card.xml', { ...nodeEditorCompileOptions, prefix: 'acme' });
assert.equal(customPrefixCard.ir.tag, 'acme-node-card', 'custom project prefix should rewrite the generated card tag');
assert.match(customPrefixCard.js, /acme-node-card-ports/, 'custom CSS prefix should reach card HTML');
assert.match(customPrefixCard.js, /acme-node-card-inputs/, 'custom CSS prefix should reach input port class');
assert.match(customPrefixCard.js, /acme-node-card-outputs/, 'custom CSS prefix should reach output port class');
const customPrefixGraph = await compileGizmo('example/node-editor/src/node-graph.xml', { ...nodeEditorCompileOptions, prefix: 'acme' });
assert.equal(customPrefixGraph.ir.tag, 'acme-node-graph', 'custom project prefix should rewrite the generated graph tag');
assert.match(customPrefixGraph.js, /acme-node-graph-viewport/, 'custom CSS prefix should reach graph HTML');
assert.match(customPrefixGraph.js, /acme-node-card-port/, 'custom CSS prefix should reach graph selectors');
assert.match(customPrefixGraph.js, /<acme-node-card/, 'custom project prefix should reach composed card tags in graph HTML');
assert.match(customPrefixGraph.js, /"card": "acme-node-card"/, 'custom project prefix should reach runtime card config');
assert.match(customPrefixGraph.manifest.view.source, /<acme-node-card/, 'custom project prefix should reach manifest view source');
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
  '--prefix',
  'acme'
]);
const cliPrefixCard = await readFile(cliPrefixOutput, 'utf8');
await unlink(cliPrefixOutput);
assert.match(cliPrefixCard, /acme-node-card-ports/, 'CLI package generator should support custom CSS prefixes');
assert.match(cliPrefixCard, /customElements\.define\(tag, AcmeNodeCard\)/, 'CLI project prefix should reach generated class names');

const cliGraphPrefixOutput = '/tmp/gizmosis-cli-node-graph.generated.js';
await execFileAsync(process.execPath, [
  'src/compiler/cli.js',
  'compile',
  'example/node-editor/src/node-graph.xml',
  '--out',
  cliGraphPrefixOutput,
  '--package-generator',
  'gizmo/node-editor=./example/node-editor/src/library/compiler/index.js',
  '--package-import',
  'gizmo/node-editor=gizmo/node-editor',
  '--prefix',
  'gizmo'
]);
const cliPrefixGraph = await readFile(cliGraphPrefixOutput, 'utf8');
await unlink(cliGraphPrefixOutput);
assert.match(cliPrefixGraph, /defineGizmoNodeGraph/, 'CLI --prefix gizmo should generate prefix-specific symbols');
assert.match(cliPrefixGraph, /<gizmo-node-card/, 'CLI --prefix gizmo should rewrite child component tags');
assert.match(cliPrefixGraph, /"tag": "gizmo-node-graph"/, 'CLI --prefix gizmo should rewrite manifest tag');

const helloXml = '/tmp/gizmosis-hello.gizmo.xml';
const helloOutput = '/tmp/gizmosis-hello.wc.js';
await writeFile(helloXml, '<gizmo name="Hello" tag="go-hello-gizmo"><props><prop name="label" kind="text" default="Hello" reflect="true"/></props><view><button>{label}</button></view></gizmo>\n', 'utf8');
await execFileAsync(process.execPath, [
  'src/compiler/cli.js',
  '--warn',
  'all',
  'extra',
  'error',
  helloXml,
  '-o',
  helloOutput
]);
const helloJs = await readFile(helloOutput, 'utf8');
await execFileAsync(process.execPath, ['--check', helloOutput]);
assert.match(helloJs, /class GoHelloGizmo extends HTMLElement/, 'direct CLI usage should compile giz input.xml -o output.js');
assert.match(helloJs, /const GIZMO_VIEW_HTML = "<button>\{\{label\}\}<\/button>";/, 'standalone compiler should lower simple view HTML');
assert.match(helloJs, /__mountGizmoView\(\)/, 'standalone compiler should mount a cached view template');
assert.match(helloJs, /__updateGizmoView\(\)/, 'standalone compiler should patch cached DOM binding targets');
assert.match(helloJs, /this\.__gizmoTextTargets = \[\]/, 'standalone compiler should cache text binding targets');
const helloRenderBody = helloJs.slice(helloJs.indexOf('  render() {'), helloJs.indexOf('  __upgradeProperties()'));
assert.doesNotMatch(helloRenderBody, /replaceChildren|template\.innerHTML/, 'standalone render should not rebuild the whole DOM on every update');
assert.doesNotMatch(helloJs, /gizmo-compiled-placeholder|Standalone skeleton generated/, 'standalone compiler must not emit a placeholder UI');
const helloPrefixOutput = '/tmp/gizmosis-hello-prefix.wc.js';
await execFileAsync(process.execPath, ['src/compiler/cli.js', '--prefix', 'gizmo', helloXml, '-o', helloPrefixOutput]);
const helloPrefixJs = await readFile(helloPrefixOutput, 'utf8');
await execFileAsync(process.execPath, ['--check', helloPrefixOutput]);
assert.match(helloPrefixJs, /class GizmoHelloGizmo extends HTMLElement/, 'standalone --prefix should rewrite generated class names');
assert.match(helloPrefixJs, /defineGizmoHelloGizmo\(tag = "gizmo-hello-gizmo"\)/, 'standalone --prefix should rewrite generated tag names');
await unlink(helloPrefixOutput);
await unlink(helloXml);
await unlink(helloOutput);

const listXml = '/tmp/gizmosis-list.gizmo.xml';
await writeFile(listXml, '<gizmo name="List" tag="go-list-gizmo"><types><type name="Item"><prop name="label" kind="text"/></type></types><props><prop name="items" kind="list" of="Item"/></props><view><ul><li each="items as item" key="{item.label}">{item.label}</li></ul></view></gizmo>\n', 'utf8');
const listCompiled = await compileGizmo(listXml);
assert.match(listCompiled.js, /const GIZMO_VIEW_REPEATS = \[/, 'standalone compiler should emit repeat metadata');
assert.match(listCompiled.js, /document\.createComment\('gizmo-repeat:' \+ repeatKey\)/, 'standalone compiler should install repeat anchors');
assert.match(listCompiled.js, /target\.anchor\.after\(\.\.\.target\.nodes\)/, 'standalone compiler should patch repeated fragments at anchors');
await unlink(listXml);

const boolXml = '/tmp/gizmosis-boolean.gizmo.xml';
await writeFile(boolXml, '<gizmo name="Boolean" tag="go-boolean-gizmo"><props><prop name="open" kind="boolean"/></props><view><section hidden="{!open}">Open</section></view></gizmo>\n', 'utf8');
const boolCompiled = await compileGizmo(boolXml);
assert.match(boolCompiled.js, /data-gizmo-bool-hidden/, 'standalone compiler should use safe boolean attribute markers');
assert.match(boolCompiled.js, /this\.__gizmoBoolTargets = \[\]/, 'standalone compiler should cache boolean attribute targets');
assert.match(boolCompiled.js, /toggleAttribute\(target\.name/, 'standalone compiler should patch boolean attributes in place');
await unlink(boolXml);

const warningXml = '/tmp/gizmosis-warning.gizmo.xml';
const warningOutput = '/tmp/gizmosis-warning.wc.js';
await writeFile(warningXml, '<gizmo tag="warning-gizmo"><view/></gizmo>\n', 'utf8');
let warnFailed = false;
try {
  await execFileAsync(process.execPath, ['src/compiler/cli.js', '--warn', 'error', warningXml, '-o', warningOutput]);
} catch (error) {
  warnFailed = true;
  assert.equal(error.code, 1, '--warn error should make warnings fail the CLI command');
  assert.match(`${error.stderr || ''}${error.stdout || ''}${error.message || ''}`, /gizmo warning: <gizmo> should have a name attribute\./);
}
assert.equal(warnFailed, true, '--warn error should fail when warnings are present');
await unlink(warningXml);
await unlink(warningOutput).catch(() => {});

const projectXml = await readFile('example/node-editor/gizmosis.xml', 'utf8');
assert.match(projectXml, /<project name="NodeEditor" basedir="." default="main">/, 'node-editor should declare a Gizmosis project file');
assert.match(projectXml, /<target name="main" depends="run"\/>/, 'node-editor project should have a default main target');
assert.match(projectXml, /<giz src="\{\{src\.dir\}\}\/node-card\.xml"/, 'node-editor project should compile node-card through <giz/>');
await execFileAsync(process.execPath, ['src/compiler/cli.js', 'project', '--file', 'example/node-editor/gizmosis.xml']);
await execFileAsync(process.execPath, ['src/compiler/cli.js', 'project', '--file', 'example/node-editor/gizmosis.xml', '--prefix', 'gizmo']);
assert.match(await readFile('example/node-editor/dist/node-graph.generated.js', 'utf8'), /class GizmoNodeGraph extends HTMLElement/, 'project --prefix should override the project default prefix');
await execFileAsync(process.execPath, [resolve('src/compiler/cli.js')], { cwd: resolve('example/node-editor') });

const distGraph = await readFile('example/node-editor/dist/node-graph.generated.js', 'utf8');
assert.doesNotMatch(distGraph, /\.\.\/src\//, 'dist generated output must not import from src');
assert.match(distGraph, /class GoNodeGraph extends HTMLElement/, 'dist generated output owns the graph element');
assert.match(distGraph, /go-node-cable/, 'dist generated output composes cable component');
assert.doesNotMatch(distGraph, /fox-ve-/, 'dist generated output should not contain legacy fox-ve tags or classes');
const distCss = await readFile('example/node-editor/dist/node-graph.css', 'utf8');
assert.match(distCss, /go-node-graph/, 'dist CSS should use the default project prefix');
assert.match(distCss, /\.go-node-card-port/, 'dist CSS should use prefixed class selectors');
assert.doesNotMatch(distCss, /\{\{|fox-ve-/, 'dist CSS should be rendered and free of legacy prefixes');

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
assert.equal(libraryFiles.includes('graph-runtime.js'), true, 'runtime support library should ship generic graph mechanics');
const distGraphRuntime = await readFile('example/node-editor/dist/library/graph-runtime.js', 'utf8');
assert.doesNotMatch(distGraphRuntime, /extends HTMLElement|customElements\.define|FoxVeNodeGraph|fox-ve-|\{\{/, 'dist graph runtime must remain generic support code');

const graphManifest = JSON.parse(await readFile('example/node-editor/dist/node-graph.manifest.json', 'utf8'));
assert.equal(graphManifest.tag, 'go-node-graph');
assert.equal(graphManifest.project.prefix, 'go');
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
assert.deepEqual(processFeatures.projectFiles, features.projectFiles, 'process-library features should mirror project file features');
assert.equal(features.projectFiles.file, 'gizmosis.xml', 'features.json should document Gizmosis project files');
assert.equal(features.projectFiles.targetTasks.includes('giz'), true, 'project files should include the giz compilation task');
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
assert.equal(graphIr.requires.components.some(item => item.attrs.tag === 'go-node-card'), true, 'graph should parse required card component');
assert.equal(graphIr.model.state.length > 0, true, 'graph should parse model state');

console.log('All Gizmosis tests passed.');
