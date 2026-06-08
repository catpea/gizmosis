{{banner}}
// Generated from <gizmo tag="{{tag-name}}">.
// Humans write node-card.xml; this file is washed clean into an autonomous Web Component.

import { escapeAttr, escapeHtml, installNodeEditorStyles } from {{implementation-import}};

export const gizmoManifest = {{manifest}};
export const gizmoDiagnostics = {{diagnostics}};

const NODE_CARD_HTML = {{node-card-html}};
const NODE_CARD_INPUT_PORT_HTML = {{node-card-input-port-html}};
const NODE_CARD_OUTPUT_PORT_HTML = {{node-card-output-port-html}};

export class {{class-name}} extends HTMLElement {
  static observedAttributes = ['node-label', 'color', 'status', 'expanded', 'selected'];

  constructor() {
    super();
    this._inputs = [];
    this._outputs = [];
  }

  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }

  get inputs() { return this._inputs.map(port => ({ ...port })); }
  set inputs(value) { this._inputs = Array.isArray(value) ? value.map(port => ({ ...port })) : []; this.render(); }
  get outputs() { return this._outputs.map(port => ({ ...port })); }
  set outputs(value) { this._outputs = Array.isArray(value) ? value.map(port => ({ ...port })) : []; this.render(); }

  get nodeLabel() { return this.getAttribute('node-label') || 'Node'; }
  get color() { return this.getAttribute('color') || '#0d6efd'; }
  get status() { return this.getAttribute('status') || 'ok'; }
  get expanded() { return this.hasAttribute('expanded'); }

  render() {
    installNodeEditorStyles();
    this.classList.add('{{css-prefix}}-node-card-root');
    this.classList.toggle('is-selected', this.hasAttribute('selected'));
    this.classList.toggle('is-disabled', this.status === 'disabled');
    this.style.setProperty('--node-color', this.color);
    this.innerHTML = renderNodeTemplate(NODE_CARD_HTML, {
      status: escapeHtml(this.status),
      'node-label': escapeHtml(this.nodeLabel),
      expanded: this.expanded ? 'true' : 'false',
      inputs: this._inputs.map((port, index) => this._portHtml(port, index, 'input')).join(''),
      outputs: this._outputs.map((port, index) => this._portHtml(port, index, 'output')).join(''),
      hidden: this.expanded ? '' : 'hidden'
    });
    this._installViewEvents();
  }

  _installViewEvents() {
    this.querySelector('.{{css-prefix}}-node-card-expand')?.addEventListener('click', event => {
      event.stopPropagation();
      this.toggleAttribute('expanded', !this.expanded);
      this.dispatchEvent(new CustomEvent('fox-node-expand', { bubbles: true, detail: { expanded: this.expanded } }));
    });
    this.querySelectorAll('.{{css-prefix}}-node-card-port').forEach(portEl => {
      portEl.addEventListener('pointerdown', event => {
        event.stopPropagation();
        portEl.setPointerCapture?.(event.pointerId);
        this.dispatchEvent(new CustomEvent('fox-node-port-down', { bubbles: true, composed: true, detail: { port: this._portDetail(portEl) } }));
      });
      portEl.addEventListener('pointerup', event => {
        event.stopPropagation();
        this.dispatchEvent(new CustomEvent('fox-node-port-up', { bubbles: true, composed: true, detail: { port: this._portDetail(portEl) } }));
      });
    });
  }

  _portHtml(port, index, side) {
    const id = String(port?.id ?? side + '-' + index);
    const label = String(port?.label ?? id);
    const type = String(port?.type ?? '');
    const template = side === 'output' ? NODE_CARD_OUTPUT_PORT_HTML : NODE_CARD_INPUT_PORT_HTML;
    return renderNodeTemplate(template, {
      id: escapeAttr(id),
      type: escapeAttr(type),
      label: escapeHtml(label),
      'aria-label': side + ' ' + escapeAttr(label)
    });
  }

  _portDetail(portEl) {
    return {
      id: portEl.dataset.portId || '',
      label: portEl.querySelector('.{{css-prefix}}-node-card-port-label')?.textContent || portEl.dataset.portId || '',
      type: portEl.dataset.portType || '',
      side: portEl.dataset.portSide || ''
    };
  }
}

function renderNodeTemplate(template, values) {
  return template.replace(/\{\{([a-z0-9-]+)\}\}/g, (match, key) => Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match);
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
