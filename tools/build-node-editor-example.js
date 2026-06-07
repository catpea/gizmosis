#!/usr/bin/env node
import { mkdir, rm, cp, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeCompilation } from '../src/compiler/index.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const example = join(root, 'example/node-editor');
const src = join(example, 'src');
const dist = join(example, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await cp(join(src, 'library'), join(dist, 'library'), { recursive: true });
await cp(join(src, 'app'), join(dist, 'app'), { recursive: true });
await copyFile(join(src, 'node-graph.css'), join(dist, 'node-graph.css'));

const components = [
  ['node-card.xml', 'node-card.generated.js', 'node-card.manifest.json', 'node-card.generated.d.ts'],
  ['node-cable.xml', 'node-cable.generated.js', 'node-cable.manifest.json', 'node-cable.generated.d.ts'],
  ['node-graph.xml', 'node-graph.generated.js', 'node-graph.manifest.json', 'node-graph.generated.d.ts']
];

for (const [xml, js, manifest, dts] of components) {
  await copyFile(join(src, xml), join(dist, xml));
  await writeCompilation(join(src, xml), {
    out: join(dist, js),
    manifest: join(dist, manifest),
    dts: join(dist, dts),
    nodeEditorImport: 'gizmo/node-editor',
    sourceLabel: `example/node-editor/src/${xml}`
  });
}

console.log('Built example/node-editor/dist from example/node-editor/src');
