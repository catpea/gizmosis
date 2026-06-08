{{banner}}
// Generated from <gizmo tag="{{tag-name}}">.
// Runtime graph mechanics are provided by a configurable node-editor VPL runtime.

import './node-card.generated.js';
import './node-cable.generated.js';

import {
  createNodeEditorGraphRuntime,
  installNodeEditorStyles
} from {{implementation-import}};

export const gizmoManifest = {{manifest}};
export const gizmoDiagnostics = {{diagnostics}};
export const gizmoImplementation = 'generated:view+vpl-runtime';

const NODE_GRAPH_CONFIG = {{graph-config}};

export class {{class-name}} extends HTMLElement {
  constructor() {
    super();
    this.__nodeEditorGraph = createNodeEditorGraphRuntime(this, NODE_GRAPH_CONFIG);
  }

  connectedCallback() {
    installNodeEditorStyles();
    this.__nodeEditorGraph.connectedCallback();
  }

  disconnectedCallback() { this.__nodeEditorGraph.disconnectedCallback(); }

  get nodes() { return this.__nodeEditorGraph.nodes; }
  set nodes(value) { this.__nodeEditorGraph.nodes = value; }
  get edges() { return this.__nodeEditorGraph.edges; }
  set edges(value) { this.__nodeEditorGraph.edges = value; }
  get selected() { return this.__nodeEditorGraph.selected; }
  set selected(value) { this.__nodeEditorGraph.selected = value; }
  get readonly() { return this.__nodeEditorGraph.readonly; }
  get snapToGrid() { return this.__nodeEditorGraph.snapToGrid; }
  get gridSize() { return this.__nodeEditorGraph.gridSize; }

  loadGraph(data) { return this.__nodeEditorGraph.loadGraph(data); }
  resetGraph(data) { return this.__nodeEditorGraph.resetGraph(data); }
  render() { return this.__nodeEditorGraph.render(); }
  scheduleEdges() { return this.__nodeEditorGraph.scheduleEdges(); }
  viewportToWorld(pointOrX, y) { return this.__nodeEditorGraph.viewportToWorld(pointOrX, y); }
  worldToViewport(pointOrX, y) { return this.__nodeEditorGraph.worldToViewport(pointOrX, y); }
  clientToWorld(clientX, clientY) { return this.__nodeEditorGraph.clientToWorld(clientX, clientY); }
  fitToNodes(options) { return this.__nodeEditorGraph.fitToNodes(options); }
  setProbeBugMode(enabled) { return this.__nodeEditorGraph.setProbeBugMode(enabled); }
  scheduleProbes(reason) { return this.__nodeEditorGraph.scheduleProbes(reason); }
  runDevProbes(options) { return this.__nodeEditorGraph.runDevProbes(options); }
  runBehaviorTests() { return this.__nodeEditorGraph.runBehaviorTests(); }
}

{{class-name}}.gizmoManifest = gizmoManifest;
{{class-name}}.gizmoDiagnostics = gizmoDiagnostics;
{{class-name}}.gizmoSource = {{source}};

export function {{define-name}}(tag = {{tag}}) {
  installNodeEditorStyles();
  if (!customElements.get(tag)) customElements.define(tag, {{class-name}});
  return customElements.get(tag);
}

if (typeof customElements !== 'undefined') {
  {{define-name}}();
}

export default {{class-name}};
