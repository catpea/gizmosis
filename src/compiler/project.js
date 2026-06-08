import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeCompilation } from './index.js';
import { renderProjectPrefixString, resolveProjectPrefix } from './prefix.js';
import { elementChildren, parseXml } from './xml-parser.js';
import { hasErrors } from './validate.js';

const PROJECT_FILE = 'gizmosis.xml';

export async function findGizmosisProject(startDir = process.cwd()) {
  let current = resolve(startDir);
  while (true) {
    const candidate = join(current, PROJECT_FILE);
    if (await exists(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export async function runGizmosisProject(projectFile = null, options = {}) {
  const filename = projectFile ? resolve(projectFile) : await findGizmosisProject(options.cwd || process.cwd());
  if (!filename) throw new Error(`Missing ${PROJECT_FILE}. Run giz from a project directory or pass --project <file>.`);
  const project = await loadProject(filename, options);
  const targetName = options.target || project.defaultTarget;
  if (!targetName) throw new Error(`<project> in ${filename} must declare default="..." or receive a target.`);
  const executed = [];
  await runTarget(project, targetName, { stack: [], executed });
  return { project, target: targetName, executed };
}

export async function loadProject(projectFile, options = {}) {
  const filename = resolve(projectFile);
  const source = await readFile(filename, 'utf8');
  const document = parseXml(source, { filename });
  const root = document.root;
  if (root.name !== 'project') throw new Error(`Expected <project> root in ${filename}`);
  const baseDir = resolve(dirname(filename), root.attrs.basedir || '.');
  const properties = {
    'project.file': filename,
    'project.dir': dirname(filename),
    'basedir': baseDir,
    ...(options.properties || {})
  };

  const project = {
    filename,
    name: root.attrs.name || '',
    baseDir,
    defaultTarget: root.attrs.default || '',
    properties,
    targets: new Map(),
    log: options.log || (() => {})
  };

  for (const property of elementChildren(root, 'property')) {
    const name = property.attrs.name;
    if (!name) throw new Error(`<property> in ${filename} requires name="...".`);
    properties[name] = interpolate(property.attrs.value ?? property.attrs.location ?? '', properties);
  }
  if (options.prefix) properties.prefix = resolveProjectPrefix(options);
  else if (!properties.prefix) properties.prefix = resolveProjectPrefix(options);

  for (const target of elementChildren(root, 'target')) {
    const name = target.attrs.name;
    if (!name) throw new Error(`<target> in ${filename} requires name="...".`);
    if (project.targets.has(name)) throw new Error(`Duplicate target "${name}" in ${filename}.`);
    project.targets.set(name, {
      name,
      depends: splitList(interpolate(target.attrs.depends || '', properties)),
      tasks: elementChildren(target),
      attrs: target.attrs
    });
  }

  return project;
}

async function runTarget(project, name, state) {
  if (state.executed.includes(name)) return;
  if (state.stack.includes(name)) throw new Error(`Circular target dependency: ${[...state.stack, name].join(' -> ')}`);
  const target = project.targets.get(name);
  if (!target) {
    if (await exists(projectPath(project, name))) return;
    throw new Error(`Unknown target or dependency "${name}" in ${project.filename}.`);
  }

  state.stack.push(name);
  for (const dependency of target.depends) await runTarget(project, dependency, state);
  state.stack.pop();

  project.log(`gizmo project: target ${name}`);
  for (const task of target.tasks) await runTask(project, task);
  state.executed.push(name);
}

async function runTask(project, task) {
  if (task.name === 'property') {
    const name = task.attrs.name;
    if (!name) throw new Error('<property> task requires name="...".');
    project.properties[name] = interpolate(task.attrs.value ?? task.attrs.location ?? '', project.properties);
    return;
  }
  if (task.name === 'mkdir') {
    await mkdir(projectPath(project, requireAttr(task, 'dir')), { recursive: true });
    return;
  }
  if (task.name === 'delete' || task.name === 'rm') {
    const path = task.attrs.path || task.attrs.dir || task.attrs.file;
    if (!path) throw new Error(`<${task.name}> requires path="...", dir="...", or file="...".`);
    await rm(projectPath(project, path), { recursive: true, force: true });
    return;
  }
  if (task.name === 'copy') {
    await copyTask(project, task);
    return;
  }
  if (task.name === 'render-prefix') {
    await renderPrefixTask(project, task);
    return;
  }
  if (task.name === 'giz') {
    await gizTask(project, task);
    return;
  }
  throw new Error(`Unknown project task <${task.name}> in ${project.filename}.`);
}

async function copyTask(project, task) {
  const src = projectPath(project, task.attrs.src || task.attrs.file || '');
  const destAttr = task.attrs.dest || task.attrs.tofile || task.attrs.todir;
  if (!src || !destAttr) throw new Error('<copy> requires src="..." and dest="...".');
  const dest = projectPath(project, destAttr);
  const sourceStat = await stat(src);
  if (sourceStat.isDirectory()) {
    const excludes = splitList(interpolate(task.attrs.exclude || task.attrs.excludes || '', project.properties));
    await cp(src, dest, {
      recursive: true,
      filter: source => !isExcluded(src, source, excludes)
    });
    return;
  }
  await mkdir(dirname(dest), { recursive: true });
  await cp(src, dest);
}

async function renderPrefixTask(project, task) {
  const src = projectPath(project, requireAttr(task, 'src'));
  const out = projectPath(project, task.attrs.out || task.attrs.dest || '');
  if (!out) throw new Error('<render-prefix> requires out="..." or dest="...".');
  await mkdir(dirname(out), { recursive: true });
  const source = await readFile(src, 'utf8');
  await writeFile(out, renderProjectPrefixString(source, projectOptions(project, task)), 'utf8');
}

async function gizTask(project, task) {
  const options = projectOptions(project, task);
  const src = projectPath(project, requireAttr(task, 'src'));
  const out = task.attrs.out ? projectPath(project, task.attrs.out) : null;
  const manifest = task.attrs.manifest ? projectPath(project, task.attrs.manifest) : null;
  const dts = task.attrs.dts ? projectPath(project, task.attrs.dts) : null;

  await loadPackageGenerators(project, task, options);
  addPackageImports(project, task, options);

  const result = await writeCompilation(src, {
    ...options,
    out,
    manifest,
    dts,
    sourceLabel: interpolate(task.attrs['source-label'] || task.attrs.sourceLabel || '', project.properties) || undefined
  });

  if (hasErrors(result.diagnostics) || (warnModes(task).has('error') && result.diagnostics.some(item => item.severity === 'warning'))) {
    const messages = result.diagnostics.map(item => `${item.severity}: ${item.message}`).join('\n');
    throw new Error(`Compilation failed for ${relative(project.baseDir, src)}${messages ? `\n${messages}` : ''}`);
  }
}

function projectOptions(project, task) {
  return {
    prefix: interpolate(task.attrs.prefix || project.properties.prefix || '', project.properties) || undefined,
    sourcePrefixes: splitList(interpolate(task.attrs['source-prefix'] || task.attrs.sourcePrefix || '', project.properties))
  };
}

async function loadPackageGenerators(project, task, options) {
  const specs = splitList(interpolate(task.attrs['package-generator'] || task.attrs.packageGenerator || '', project.properties));
  if (!specs.length) return;
  const packageGenerators = {};
  for (const spec of specs) {
    const { left: library, right: moduleName } = splitMapping(spec, 'package-generator');
    const module = await import(moduleSpecifier(project, moduleName));
    const generator = module.default || module.packageGenerator;
    if (!generator?.generateJavaScript) throw new Error(`Package generator ${moduleName} must export generateJavaScript.`);
    packageGenerators[library] = generator;
  }
  options.packageGenerators = packageGenerators;
}

function addPackageImports(project, task, options) {
  const specs = splitList(interpolate(task.attrs['package-import'] || task.attrs.packageImport || '', project.properties));
  for (const spec of specs) {
    const { left: library, right: moduleName } = splitMapping(spec, 'package-import');
    (options.packageImports ||= {})[library] = moduleName;
  }
}

function moduleSpecifier(project, value) {
  if (value.startsWith('.') || value.startsWith('/')) return pathToFileURL(projectPath(project, value)).href;
  return value;
}

function splitMapping(value, label) {
  const separator = value.indexOf('=');
  if (separator <= 0 || separator === value.length - 1) throw new Error(`Invalid ${label} spec: ${value}`);
  return { left: value.slice(0, separator), right: value.slice(separator + 1) };
}

function warnModes(task) {
  return new Set(splitList(task.attrs.warn || ''));
}

function requireAttr(task, name) {
  const value = task.attrs[name];
  if (!value) throw new Error(`<${task.name}> requires ${name}="...".`);
  return value;
}

function projectPath(project, value) {
  const rendered = interpolate(value, project.properties);
  if (!rendered) return '';
  return isAbsolute(rendered) ? rendered : resolve(project.baseDir, rendered);
}

function interpolate(value, properties) {
  return String(value ?? '').replace(/\{\{([A-Za-z0-9_.:-]+)\}\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(properties, name) ? String(properties[name]) : match
  ));
}

function splitList(value) {
  return String(value || '').split(/[,\s]+/).map(item => item.trim()).filter(Boolean);
}

function isExcluded(root, source, excludes) {
  if (!excludes.length) return false;
  const rel = relative(root, source);
  if (!rel) return false;
  const parts = rel.split(sep);
  return excludes.some(exclude => parts.includes(exclude) || rel === exclude || rel.startsWith(`${exclude}${sep}`));
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
