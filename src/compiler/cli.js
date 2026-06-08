#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileGizmo, writeCompilation } from './index.js';
import { sanitizeProjectPrefix } from './prefix.js';
import { runGizmosisProject } from './project.js';
import { hasErrors } from './validate.js';

const args = process.argv.slice(2);
const knownCommands = new Set(['check', 'features', 'inspect', 'compile', 'project', 'run', 'init-example', 'help']);
const first = args[0];
const command = !args.length
  ? 'project'
  : first === '--project'
    ? 'project'
    : knownCommands.has(first) || ['--help', '-h'].includes(first)
      ? args.shift()
      : 'compile';

try {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
  } else if (command === 'check') {
    const { entry, options } = parseEntryOptions(args);
    await loadPackageGenerators(options);
    const result = await compileGizmo(entry, options);
    printDiagnostics(result.diagnostics);
    process.exit(hasBlockingDiagnostics(result.diagnostics, options) ? 1 : 0);
  } else if (command === 'features') {
    const { GIZMO_FEATURES } = await import('./features.js');
    console.log(JSON.stringify(GIZMO_FEATURES, null, 2));
  } else if (command === 'inspect') {
    const { entry, options } = parseEntryOptions(args);
    await loadPackageGenerators(options);
    const result = await compileGizmo(entry, options);
    console.log(JSON.stringify(result.manifest, null, 2));
  } else if (command === 'compile') {
    const { entry, options } = parseEntryOptions(args);
    await loadPackageGenerators(options);
    const result = await writeCompilation(entry, options);
    printDiagnostics(result.diagnostics);
    if (!options.out && !options.manifest && !options.dts) console.log(result.js);
    process.exit(hasBlockingDiagnostics(result.diagnostics, options) ? 1 : 0);
  } else if (command === 'project' || command === 'run') {
    const { file, target, options } = parseProjectOptions(args);
    const result = await runGizmosisProject(file, { ...options, target, log: message => console.error(message) });
    console.error(`gizmo project: completed ${result.project.name || result.project.filename}:${result.target}`);
  } else if (command === 'init-example') {
    const file = args.shift() || 'hello.gizmo.xml';
    await writeFile(file, exampleXml(), 'utf8');
    console.log(`Created ${file}`);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(`gizmo: ${error.message}`);
  process.exit(1);
}

function parseEntryOptions(args) {
  const options = {};
  let entry = null;
  while (args.length) {
    const flag = args.shift();
    if (flag === '--out' || flag === '-o') options.out = requireArg(args.shift(), `${flag} requires a file.`);
    else if (flag === '--manifest') options.manifest = requireArg(args.shift(), `${flag} requires a file.`);
    else if (flag === '--dts') options.dts = requireArg(args.shift(), `${flag} requires a file.`);
    else if (flag === '--package-generator') (options.packageGeneratorSpecs ||= []).push(requireArg(args.shift(), `${flag} requires library=module.`));
    else if (flag === '--package-import') addPackageImport(options, requireArg(args.shift(), `${flag} requires library=module.`));
    else if (flag === '--prefix') options.prefix = sanitizeProjectPrefix(requireArg(args.shift(), `${flag} requires a prefix.`));
    else if (flag === '--source-prefix') (options.sourcePrefixes ||= []).push(sanitizeProjectPrefix(requireArg(args.shift(), `${flag} requires a source prefix.`), 'source prefix'));
    else if (flag === '--css-prefix') options.cssPrefix = sanitizeProjectPrefix(requireArg(args.shift(), `${flag} requires a CSS prefix.`), 'CSS prefix');
    else if (flag === '--source-label') options.sourceLabel = requireArg(args.shift(), `${flag} requires a label.`);
    else if (flag === '--warn') readWarnOptions(args, options);
    else if (flag.startsWith('--warn=')) addWarnOptions(options, flag.slice('--warn='.length).split(/[,\s]+/).filter(Boolean));
    else if (flag.startsWith('-')) throw new Error(`Unknown option: ${flag}`);
    else if (!entry) entry = flag;
    else throw new Error(`Unexpected argument: ${flag}`);
  }
  return { entry: requireArg(entry, 'Missing .gizmo.xml file.'), options };
}

function parseProjectOptions(args) {
  const options = {};
  let file = null;
  let target = null;
  while (args.length) {
    const flag = args.shift();
    if (flag === '--project' || flag === '--file' || flag === '-f') file = requireArg(args.shift(), `${flag} requires a file.`);
    else if (flag === '--target' || flag === '-t') target = requireArg(args.shift(), `${flag} requires a target.`);
    else if (flag === '--prefix') options.prefix = sanitizeProjectPrefix(requireArg(args.shift(), `${flag} requires a prefix.`));
    else if (flag === '--source-prefix') (options.sourcePrefixes ||= []).push(sanitizeProjectPrefix(requireArg(args.shift(), `${flag} requires a source prefix.`), 'source prefix'));
    else if (flag.startsWith('-')) throw new Error(`Unknown project option: ${flag}`);
    else if (!target) target = flag;
    else throw new Error(`Unexpected project argument: ${flag}`);
  }
  return { file, target, options };
}

async function loadPackageGenerators(options) {
  if (!options.packageGeneratorSpecs?.length) return;
  const packageGenerators = { ...(options.packageGenerators || {}) };
  for (const spec of options.packageGeneratorSpecs) {
    const separator = spec.indexOf('=');
    if (separator <= 0 || separator === spec.length - 1) throw new Error(`Invalid package generator spec: ${spec}`);
    const library = spec.slice(0, separator);
    const moduleName = spec.slice(separator + 1);
    const module = await import(moduleSpecifier(moduleName));
    const generator = module.default || module.packageGenerator;
    if (!generator?.generateJavaScript) throw new Error(`Package generator ${moduleName} must export generateJavaScript.`);
    packageGenerators[library] = generator;
  }
  options.packageGenerators = packageGenerators;
  delete options.packageGeneratorSpecs;
}

function addPackageImport(options, spec) {
  const separator = spec.indexOf('=');
  if (separator <= 0 || separator === spec.length - 1) throw new Error(`Invalid package import spec: ${spec}`);
  const library = spec.slice(0, separator);
  const moduleName = spec.slice(separator + 1);
  (options.packageImports ||= {})[library] = moduleName;
}

function readWarnOptions(args, options) {
  const values = [];
  while (args.length && isWarnMode(args[0])) values.push(args.shift());
  if (!values.length) throw new Error('--warn requires one or more of: all, extra, error.');
  addWarnOptions(options, values);
}

function addWarnOptions(options, values) {
  for (const value of values) {
    if (!isWarnMode(value)) throw new Error(`Unknown --warn mode: ${value}`);
    (options.warn ||= new Set()).add(value);
  }
}

function isWarnMode(value) {
  return ['all', 'extra', 'error'].includes(value);
}

function hasBlockingDiagnostics(diagnostics, options) {
  return hasErrors(diagnostics) || (options.warn?.has('error') && diagnostics.some(item => item.severity === 'warning'));
}

function moduleSpecifier(value) {
  if (value.startsWith('.') || value.startsWith('/')) return pathToFileURL(resolve(value)).href;
  return value;
}

function requireArg(value, message) {
  if (!value) throw new Error(message);
  return value;
}

function printDiagnostics(diagnostics) {
  if (!diagnostics.length) {
    console.error('gizmo: no diagnostics');
    return;
  }
  for (const item of diagnostics) {
    const prefix = item.severity === 'error' ? 'error' : item.severity === 'warning' ? 'warning' : 'info';
    console.error(`gizmo ${prefix}: ${item.message}`);
  }
}

function printHelp() {
  console.log(`Gizmosis compiler v0.5\n\nUsage:\n  giz                                            # run ./gizmosis.xml default target\n  giz project [target] [--file gizmosis.xml] [--prefix <prefix>]\n  giz <file.gizmo.xml> -o <file.js> [--prefix <prefix>] [--warn all extra error]\n  giz check <file.gizmo.xml> [--package-generator <library=module>] [--prefix <prefix>] [--warn all extra error]\n  giz inspect <file.gizmo.xml> [--package-generator <library=module>] [--prefix <prefix>]\n  giz compile <file.gizmo.xml> --out <file.js> --manifest <file.json> --dts <file.d.ts> [--package-generator <library=module>] [--package-import <library=module>] [--prefix <prefix>] [--source-prefix <prefix>] [--source-label <label>] [--warn all extra error]\n  giz init-example [file.gizmo.xml]\n`);
}

function exampleXml() {
  return `<gizmo name="Hello Gizmo" tag="go-hello-gizmo">\n  <props>\n    <prop name="label" kind="text" default="Hello" reflect="true"/>\n  </props>\n  <view>\n    <button>{label}</button>\n  </view>\n</gizmo>\n`;
}
