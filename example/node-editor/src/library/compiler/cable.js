{{banner}}
// Generated from <gizmo tag="{{tag-name}}">.
// The cable is a Web Component that draws its own SVG group into a shared SVG layer.

import { SVG_NS, edgePath, installNodeEditorStyles } from {{implementation-import}};

export const gizmoManifest = {{manifest}};
export const gizmoDiagnostics = {{diagnostics}};

export class {{class-name}} extends HTMLElement {
  static observedAttributes = ['edge-id', 'svg-selector', 'missing'];

  constructor() {
    super();
    this._from = null;
    this._to = null;
    this._group = null;
  }

  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  disconnectedCallback() { this.removeFromSharedSvg(); }

  get edgeId() { return this.getAttribute('edge-id') || this.dataset.edgeId || ''; }
  get svgSelector() { return this.getAttribute('svg-selector') || '.{{css-prefix}}-node-graph-edge-layer'; }
  get from() { return this._from; }
  set from(value) { this._from = pointOrNull(value); this.render(); }
  get to() { return this._to; }
  set to(value) { this._to = pointOrNull(value); this.render(); }

  render() {
    installNodeEditorStyles();
    this.hidden = true;
    if (!this.isConnected) return;
    const layer = this._findLayer();
    if (!layer) return;
    const id = this.edgeId;
    let group = this._group;
    if (!group || group.parentNode !== layer) {
      this.removeFromSharedSvg();
      group = document.createElementNS(SVG_NS, 'g');
      group.setAttribute('class', '{{css-prefix}}-node-graph-edge-group');
      group.dataset.edgeId = id;
      const hit = document.createElementNS(SVG_NS, 'path');
      hit.setAttribute('class', '{{css-prefix}}-node-graph-edge-hit');
      hit.dataset.edgeId = id;
      const line = document.createElementNS(SVG_NS, 'path');
      line.setAttribute('class', '{{css-prefix}}-node-graph-edge');
      line.dataset.edgeId = id;
      group.append(hit, line);
      layer.append(group);
      this._group = group;
    }
    group.dataset.edgeId = id;
    group.querySelectorAll('path').forEach(path => { path.dataset.edgeId = id; });
    group.classList.toggle('is-missing-endpoint', !(this._from && this._to) || this.hasAttribute('missing'));
    const d = this._from && this._to ? edgePath(this._from, this._to) : '';
    group.querySelector('.{{css-prefix}}-node-graph-edge-hit')?.setAttribute('d', d);
    group.querySelector('.{{css-prefix}}-node-graph-edge')?.setAttribute('d', d);
    this.dispatchEvent(new CustomEvent('fox-edge-render', { bubbles: true, detail: { id } }));
  }

  removeFromSharedSvg() {
    this._group?.remove();
    this._group = null;
  }

  _findLayer() {
    const host = this.closest('{{node-graph-tag}}') || this.getRootNode();
    return host?.querySelector?.(this.svgSelector) || document.querySelector(this.svgSelector);
  }
}

function pointOrNull(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

{{class-name}}.gizmoManifest = gizmoManifest;
{{class-name}}.gizmoDiagnostics = gizmoDiagnostics;

export function {{define-name}}(tag = {{tag}}) {
  installNodeEditorStyles();
  if (!customElements.get(tag)) customElements.define(tag, {{class-name}});
  return customElements.get(tag);
}

if (typeof customElements !== 'undefined') {{define-name}}();
export default {{class-name}};
