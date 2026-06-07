import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { cloneNode, elementChildren, parseXml } from './xml-parser.js';

const INCLUDEABLE = new Set([
  'about', 'terms', 'contract', 'types', 'requires', 'provides', 'model', 'view', 'behavior',
  'props', 'state', 'events', 'geometry', 'actions', 'interactions', 'effects', 'resources',
  'frames', 'dev', 'fixtures', 'tests', 'interaction', 'probes'
]);

export async function loadGizmoXml(entryFile) {
  const filename = resolve(entryFile);
  const source = await readFile(filename, 'utf8');
  const document = parseXml(source, { filename });
  document.root = await resolveIncludes(document.root, dirname(filename), new Set([filename]));
  return { filename, source, document };
}

async function resolveIncludes(node, baseDir, stack) {
  const next = cloneNode(node);
  if (next.type !== 'element') return next;

  if (next.attrs?.src && INCLUDEABLE.has(next.name)) {
    const includeFile = resolve(baseDir, next.attrs.src);
    if (stack.has(includeFile)) throw new Error(`Circular Gizmosis include: ${[...stack, includeFile].join(' -> ')}`);
    const source = await readFile(includeFile, 'utf8');
    const doc = parseXml(source, { filename: includeFile });
    const included = await resolveIncludes(doc.root, dirname(includeFile), new Set([...stack, includeFile]));
    if (included.name === next.name) {
      included.attrs = { ...next.attrs, ...included.attrs, src: undefined };
      delete included.attrs.src;
      included.sourceFile = includeFile;
      return included;
    }
    next.children = [included];
    next.sourceFile = includeFile;
    return next;
  }

  next.children = [];
  for (const child of node.children || []) {
    if (child.type === 'element') next.children.push(await resolveIncludes(child, baseDir, stack));
    else next.children.push(cloneNode(child));
  }
  return next;
}

export function rootSections(root, name) {
  return elementChildren(root, name);
}
