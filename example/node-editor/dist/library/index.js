export * from './constants.js';
export * from './dom.js';
export * from './graph-runtime.js';
export * from './interactions.js';

let nodeEditorStylesInstalled = false;

export function installNodeEditorStyles(href = new URL('../node-graph.css', import.meta.url)) {
  if (nodeEditorStylesInstalled || typeof document === 'undefined') return;
  const absoluteHref = String(href);
  const existing = document.querySelector(`link[data-gizmo-node-editor-styles][href="${absoluteHref}"]`);
  if (existing) {
    nodeEditorStylesInstalled = true;
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = absoluteHref;
  link.dataset.gizmoNodeEditorStyles = 'true';
  document.head.append(link);
  nodeEditorStylesInstalled = true;
}

export function installNodeEditorSupport() {
  installNodeEditorStyles();
}
