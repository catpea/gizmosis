#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGizmosisProject } from '../src/compiler/project.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const result = await runGizmosisProject(join(root, 'example/node-editor/gizmosis.xml'), {
  prefix: process.env.GIZMO_PREFIX || process.env.GIZMOSIS_PREFIX || undefined,
  log: message => console.log(message)
});

console.log(`Built ${result.project.name || 'project'} target "${result.target}"`);
