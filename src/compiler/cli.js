#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileGizmo, writeCompilation } from './index.js';
import { hasErrors } from './validate.js';

const args = process.argv.slice(2);
const command = args.shift();

try {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
  } else if (command === 'check') {
    const entry = requireArg(args.shift(), 'Missing .gizmo.xml file.');
    const options = parseOptions(args);
    await loadPackageGenerators(options);
    const result = await compileGizmo(entry, options);
    printDiagnostics(result.diagnostics);
    process.exit(hasErrors(result.diagnostics) ? 1 : 0);
  } else if (command === 'features') {
    const { GIZMO_FEATURES } = await import('./features.js');
    console.log(JSON.stringify(GIZMO_FEATURES, null, 2));
  } else if (command === 'inspect') {
    const entry = requireArg(args.shift(), 'Missing .gizmo.xml file.');
    const options = parseOptions(args);
    await loadPackageGenerators(options);
    const result = await compileGizmo(entry, options);
    console.log(JSON.stringify(result.manifest, null, 2));
  } else if (command === 'compile') {
    const entry = requireArg(args.shift(), 'Missing .gizmo.xml file.');
    const options = parseOptions(args);
    await loadPackageGenerators(options);
    const result = await writeCompilation(entry, options);
    printDiagnostics(result.diagnostics);
    if (!options.out && !options.manifest && !options.dts) console.log(result.js);
    process.exit(hasErrors(result.diagnostics) ? 1 : 0);
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

function parseOptions(args) {
  const options = {};
  while (args.length) {
    const flag = args.shift();
    if (flag === '--out' || flag === '-o') options.out = requireArg(args.shift(), `${flag} requires a file.`);
    else if (flag === '--manifest') options.manifest = requireArg(args.shift(), `${flag} requires a file.`);
    else if (flag === '--dts') options.dts = requireArg(args.shift(), `${flag} requires a file.`);
    else if (flag === '--package-generator') (options.packageGeneratorSpecs ||= []).push(requireArg(args.shift(), `${flag} requires library=module.`));
    else if (flag === '--package-import') addPackageImport(options, requireArg(args.shift(), `${flag} requires library=module.`));
    else if (flag === '--css-prefix') options.cssPrefix = requireArg(args.shift(), `${flag} requires a CSS prefix.`);
    else if (flag === '--source-label') options.sourceLabel = requireArg(args.shift(), `${flag} requires a label.`);
    else throw new Error(`Unknown option: ${flag}`);
  }
  return options;
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
  console.log(`Gizmosis compiler v0.5\n\nUsage:\n  gizmo check <file.gizmo.xml> [--package-generator <library=module>]\n  gizmo inspect <file.gizmo.xml> [--package-generator <library=module>]\n  gizmo compile <file.gizmo.xml> --out <file.js> --manifest <file.json> --dts <file.d.ts> [--package-generator <library=module>] [--package-import <library=module>] [--css-prefix <prefix>] [--source-label <label>]\n  gizmo init-example [file.gizmo.xml]\n`);
}

function exampleXml() {
  return `<gizmo name="Hello Gizmo" tag="hello-gizmo">\n  <props>\n    <prop name="label" kind="text" default="Hello" reflect="true"/>\n  </props>\n  <view>\n    <button>{label}</button>\n  </view>\n</gizmo>\n`;
}
