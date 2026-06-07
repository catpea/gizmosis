import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadGizmoXml } from './loader.js';
import { buildIr } from './ir.js';
import { validateIr } from './validate.js';
import { generateDts, generateJavaScript, generateManifest } from './generator.js';

export { loadGizmoXml } from './loader.js';
export { buildIr } from './ir.js';
export { validateIr, hasErrors } from './validate.js';
export { generateDts, generateJavaScript, generateManifest } from './generator.js';
export { parseXml, serializeXml } from './xml-parser.js';
export { GIZMO_FEATURES } from './features.js';

export async function compileGizmo(entryFile, options = {}) {
  const loaded = await loadGizmoXml(entryFile);
  const ir = buildIr(loaded.document, { filename: loaded.filename });
  if (options.sourceLabel) ir.source = options.sourceLabel;
  const diagnostics = validateIr(ir);
  const manifest = generateManifest(ir, diagnostics);
  const js = generateJavaScript(ir, diagnostics, options);
  const dts = generateDts(ir, options);
  return { ...loaded, ir, diagnostics, manifest, js, dts };
}

export async function writeCompilation(entryFile, options = {}) {
  const result = await compileGizmo(entryFile, options);
  const outFile = options.out ? resolve(options.out) : null;
  const manifestFile = options.manifest ? resolve(options.manifest) : null;
  const dtsFile = options.dts ? resolve(options.dts) : null;

  if (outFile) {
    await mkdir(dirname(outFile), { recursive: true });
    await writeFile(outFile, result.js, 'utf8');
  }
  if (manifestFile) {
    await mkdir(dirname(manifestFile), { recursive: true });
    await writeFile(manifestFile, `${JSON.stringify(result.manifest, null, 2)}\n`, 'utf8');
  }
  if (dtsFile) {
    await mkdir(dirname(dtsFile), { recursive: true });
    await writeFile(dtsFile, result.dts, 'utf8');
  }
  return result;
}
