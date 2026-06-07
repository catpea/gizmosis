{{banner}}
// Fully generated from Gizmosis v0.5.
// The support library below is generic: it provides geometry, frame, and DOM helpers.
// Component-specific card, cable, graph structure, selectors, and event wiring come from XML-generated modules.

import './node-card.generated.js';
import './node-cable.generated.js';

import {
  DEFAULT_NODE_WIDTH,
  DEFAULT_PORT_HEADER,
  DEFAULT_PORT_STEP,
  MAX_ZOOM,
  MIN_ZOOM,
  SVG_NS,
  center,
  centerY,
  clone,
  clamp,
  cssEscape,
  distance,
  edgePath,
  formatNumber,
  installNodeEditorStyles,
  parseEdgePath,
  readPoint,
  rect,
  round,
  roundPoint,
  slugify
} from {{implementation-import}};

export const gizmoManifest = {{manifest}};
export const gizmoDiagnostics = {{diagnostics}};
export const gizmoImplementation = 'generated:view+interactions+node-editor-support';

{{graph-class}}

// Generated lowering for <{{node-cable-tag}} each="edges as edge"/>.
// The graph computes endpoint geometry; each cable Web Component owns its SVG group.
function ensureCableLayer(host) {
  if (host._cableLayer) return host._cableLayer;
  host._cableLayer = host.querySelector?.('.{{css-prefix}}-node-graph-cables') || null;
  if (host._cableLayer) return host._cableLayer;
  const layer = document.createElement('div');
  layer.className = '{{css-prefix}}-node-graph-cables';
  layer.hidden = true;
  host.append(layer);
  host._cableLayer = layer;
  return layer;
}

FoxVeNodeGraph.prototype._drawEdges = function generatedDrawEdgesWithCableComponents() {
  const rect = this._viewport.getBoundingClientRect();
  const width = this._viewport.clientWidth || rect.width || 800;
  const height = this._viewport.clientHeight || rect.height || 420;
  this._svg.setAttribute('viewBox', '0 0 ' + Math.max(1, width) + ' ' + Math.max(1, height));

  const cableLayer = ensureCableLayer(this);
  const active = new Set();

  for (const edge of this._edges) {
    const id = String(edge.id || '');
    active.add(id);
    let cable = cableLayer.querySelector('{{node-cable-tag}}[data-edge-id="' + cssEscape(id) + '"]');
    if (!cable) {
      cable = document.createElement('{{node-cable-tag}}');
      cable.dataset.edgeId = id;
      cable.setAttribute('edge-id', id);
      cable.setAttribute('svg-selector', '.{{css-prefix}}-node-graph-edge-layer');
      cableLayer.append(cable);
    }

    const from = this._portWorld(edge.from?.nodeId, edge.from?.portId, 'output');
    const to = this._portWorld(edge.to?.nodeId, edge.to?.portId, 'input');
    cable.from = this._probeBugMode && from ? { ...from, y: from.y + 8 } : from;
    cable.to = to;
    cable.toggleAttribute('missing', !(from && to));
    cable.render?.();
  }

  cableLayer.querySelectorAll('{{node-cable-tag}}').forEach(cable => {
    if (!active.has(cable.dataset.edgeId || '')) cable.remove();
  });
};

FoxVeNodeGraph.gizmoManifest = gizmoManifest;
FoxVeNodeGraph.gizmoDiagnostics = gizmoDiagnostics;
FoxVeNodeGraph.gizmoSource = {{source}};

export function defineFoxVeNodeGraph(tag = {{tag}}) {
  installNodeEditorStyles();
  if (!customElements.get(tag)) customElements.define(tag, FoxVeNodeGraph);
  return customElements.get(tag);
}

if (typeof customElements !== 'undefined') {
  defineFoxVeNodeGraph();
}

export default FoxVeNodeGraph;
