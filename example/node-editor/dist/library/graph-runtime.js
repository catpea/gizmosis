import {
  DEFAULT_NODE_WIDTH,
  DEFAULT_PORT_HEADER,
  DEFAULT_PORT_STEP,
  MAX_ZOOM,
  MIN_ZOOM
} from './constants.js';
import {
  centerY,
  clone,
  clamp,
  cssEscape,
  distance,
  edgePath,
  formatNumber,
  parseEdgePath,
  readPoint,
  round,
  roundPoint,
  slugify
} from './dom.js';

export class NodeEditorGraphRuntime {
  constructor(host, config = {}) {
    this.host = host;
    this.config = normalizeGraphConfig(config);
    this._nodes = [];
    this._edges = [];
    this._selected = [];
    this._view = { panX: 0, panY: 0, zoom: 1 };
    this._nodeDrag = null;
    this._pan = null;
    this._connection = null;
    this._spaceDown = false;
    this._edgeRaf = 0;
    this._edgeSettleRaf = 0;
    this._probeRaf = 0;
    this._devProbesEnabled = true;
    this._probeBugMode = false;
    this._lastProbeResults = [];
  }

  get classList() { return this.host.classList; }
  get className() { return this.host.className; }
  set className(value) { this.host.className = value; }
  get innerHTML() { return this.host.innerHTML; }
  set innerHTML(value) { this.host.innerHTML = value; }
  get dataset() { return this.host.dataset; }

  querySelector(...args) { return this.host.querySelector(...args); }
  querySelectorAll(...args) { return this.host.querySelectorAll(...args); }
  append(...args) { return this.host.append(...args); }
  closest(...args) { return this.host.closest(...args); }
  hasAttribute(...args) { return this.host.hasAttribute(...args); }
  getAttribute(...args) { return this.host.getAttribute(...args); }
  setAttribute(...args) { return this.host.setAttribute(...args); }
  removeAttribute(...args) { return this.host.removeAttribute(...args); }
  toggleAttribute(...args) { return this.host.toggleAttribute(...args); }
  dispatchEvent(...args) { return this.host.dispatchEvent(...args); }

  connectedCallback() {
    this._build();
    if (!this._installed) {
      this._install();
      this._installed = true;
    }
    this._resizeObserver = new ResizeObserver(() => this.scheduleEdges());
    this._resizeObserver.observe(this.host);
    this.render();
  }

  disconnectedCallback() {
    this._resizeObserver?.disconnect();
    if (this._edgeRaf) cancelAnimationFrame(this._edgeRaf);
    if (this._edgeSettleRaf) cancelAnimationFrame(this._edgeSettleRaf);
    if (this._probeRaf) cancelAnimationFrame(this._probeRaf);
  }

  get nodes() { return clone(this._nodes); }
  set nodes(value) { this._nodes = Array.isArray(value) ? clone(value) : []; this.render(); }
  get edges() { return clone(this._edges); }
  set edges(value) { this._edges = Array.isArray(value) ? clone(value) : []; this.render(); }
  get selected() { return this._selected.slice(); }
  set selected(value) { this._selected = Array.isArray(value) ? value.map(String) : []; this.render(); }
  get readonly() { return this.hasAttribute('readonly'); }
  get snapToGrid() { return this.hasAttribute('snap-to-grid'); }
  get gridSize() { return Math.max(4, Number(this.getAttribute('grid-size')) || 24); }

  loadGraph({ nodes = [], edges = [], selected = [], view = { panX: 0, panY: 0, zoom: 1 }, fit = false } = {}) {
    this._nodes = clone(nodes);
    this._edges = clone(edges);
    this._selected = Array.isArray(selected) ? selected.map(String) : [];
    this._view = {
      panX: Number(view.panX) || 0,
      panY: Number(view.panY) || 0,
      zoom: clamp(Number(view.zoom) || 1, MIN_ZOOM, MAX_ZOOM)
    };
    this._connection = null;
    this._nodeDrag = null;
    this._pan = null;
    this.removeAttribute('connection-mode');
    this.render();
    if (fit) queueMicrotask(() => this.fitToNodes({ padding: 56, maxZoom: 1 }));
  }

  resetGraph(data) {
    this.loadGraph(data);
  }

  _build() {
    if (this._viewport) return;
    this.className = this.config.classes.root;
    this.innerHTML = this.config.html;
    this._viewport = this.querySelector(this.config.selectors.viewport);
    this._svg = this.querySelector(this.config.selectors.svg);
    this._edgeLayer = this.querySelector(this.config.selectors.edgeLayer);
    this._ghost = this.querySelector(this.config.selectors.ghost);
    this._cableLayer = this.querySelector(this.config.selectors.cableLayer);
    this._nodeLayer = this.querySelector(this.config.selectors.nodeLayer);
    this._empty = this.querySelector(this.config.selectors.empty);
    this._zoomReadout = this.querySelector('[data-readout="zoom"]');
    this._modeReadout = this.querySelector('[data-readout="mode"]');
  }

  _install() {
    this._viewport.addEventListener('wheel', event => this._onWheel(event), { passive: false });
    this._viewport.addEventListener('pointerdown', event => this._onViewportPointerDown(event));
    this._viewport.addEventListener('dblclick', event => this._onDoubleClick(event));
    this._viewport.addEventListener('keydown', event => this._onKeyDown(event));
    this._nodeLayer.addEventListener('pointerdown', event => this._onNodePointerDown(event));
    this._nodeLayer.addEventListener(this.config.events.portDown, event => this._onPortDown(event));
    this._nodeLayer.addEventListener(this.config.events.portUp, event => this._onPortUp(event));
    this._edgeLayer.addEventListener('dblclick', event => this._onEdgeDoubleClick(event));
    window.addEventListener('pointermove', event => this._onPointerMove(event));
    window.addEventListener('pointerup', event => this._onPointerUp(event));
    window.addEventListener('pointercancel', event => this._onPointerCancel(event));
    window.addEventListener('keydown', event => { if (event.code === 'Space') this._spaceDown = true; });
    window.addEventListener('keyup', event => { if (event.code === 'Space') this._spaceDown = false; });
  }

  render() {
    if (!this._viewport) return;
    this._empty.hidden = this._nodes.length !== 0;
    this.classList.toggle('is-panning', Boolean(this._pan));
    this.classList.toggle('is-dragging-node', Boolean(this._nodeDrag));
    this.classList.toggle('is-connection-mode', Boolean(this._connection));
    this.classList.toggle('is-readonly', this.readonly);
    this._viewport.style.setProperty('--pan-x', `${this._view.panX}px`);
    this._viewport.style.setProperty('--pan-y', `${this._view.panY}px`);
    this._viewport.style.setProperty('--zoom', this._view.zoom);
    this._viewport.style.setProperty('--grid', `${this.gridSize}px`);
    this._zoomReadout.textContent = `zoom ${this._view.zoom.toFixed(2)}`;
    this._modeReadout.textContent = this.readonly ? 'readonly' : this._connection ? 'connecting' : this._nodeDrag ? 'dragging' : this._pan ? 'panning' : 'ready';

    this._nodeLayer.style.transform = `translate(${this._view.panX}px, ${this._view.panY}px) scale(${this._view.zoom})`;
    this._edgeLayer.setAttribute('transform', `translate(${this._view.panX} ${this._view.panY}) scale(${this._view.zoom})`);

    const active = new Set();
    const selected = new Set(this._selected);
    for (const node of this._nodes) {
      active.add(String(node.id));
      let card = this._nodeLayer.querySelector(`${this.config.tags.card}[data-id="${cssEscape(node.id)}"]`);
      if (!card) {
        card = document.createElement(this.config.tags.card);
        card.dataset.id = node.id;
        this._nodeLayer.append(card);
      }
      card.dataset.type = node.type || '';
      card.setAttribute('node-label', node.label || node.id);
      card.setAttribute('color', node.color || '#0d6efd');
      card.setAttribute('status', node.status || 'ok');
      card.toggleAttribute('selected', selected.has(String(node.id)));
      card.toggleAttribute('expanded', Boolean(node.expanded));
      card.style.left = `${round(node.x)}px`;
      card.style.top = `${round(node.y)}px`;
      card.inputs = node.inputs || [];
      card.outputs = node.outputs || [];
    }
    this._nodeLayer.querySelectorAll(this.config.tags.card).forEach(card => {
      if (!active.has(card.dataset.id)) card.remove();
    });
    this.scheduleEdges();
  }

  _onViewportPointerDown(event) {
    this._viewport.focus({ preventScroll: true });
    if (event.target.closest(this.config.tags.card)) return;
    if (this.readonly) return;
    if (event.button === 1 || (event.button === 0 && this._spaceDown)) {
      event.preventDefault();
      this._pan = {
        startX: event.clientX,
        startY: event.clientY,
        startPanX: this._view.panX,
        startPanY: this._view.panY
      };
      this._viewport.setPointerCapture?.(event.pointerId);
      this.render();
      return;
    }
    if (event.button === 0) this._setSelected([]);
  }

  _onNodePointerDown(event) {
    if (this.readonly || event.button !== 0) return;
    if (event.target.closest(this.config.selectors.nodeDragIgnore)) return;
    const card = event.target.closest(this.config.tags.card);
    if (!card) return;
    event.preventDefault();
    this._viewport.focus({ preventScroll: true });
    const id = card.dataset.id;
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    const alreadySelected = this._selected.includes(id);
    if (additive) this._selectNode(id, true);
    else if (!alreadySelected) this._setSelected([id]);
    const dragIds = this._selected.includes(id) ? this._selected.slice() : [id];
    this._nodeDrag = {
      id,
      ids: dragIds,
      starts: this._positionsOf(dragIds),
      startClient: { x: event.clientX, y: event.clientY },
      moved: false
    };
    card.setPointerCapture?.(event.pointerId);
    this.render();
  }

  _onPointerMove(event) {
    if (this._nodeDrag) {
      const dxClient = event.clientX - this._nodeDrag.startClient.x;
      const dyClient = event.clientY - this._nodeDrag.startClient.y;
      const deltaWorld = { x: dxClient / this._view.zoom, y: dyClient / this._view.zoom };
      this._nodeDrag.moved = this._nodeDrag.moved || Math.hypot(dxClient, dyClient) > 1;
      const updates = this._moveNodeStarts(this._nodeDrag.starts, deltaWorld);
      this._applyNodePositions(updates, { renderCardsOnly: true });
      this.scheduleEdges();
      return;
    }

    if (this._pan) {
      this._view.panX = this._pan.startPanX + event.clientX - this._pan.startX;
      this._view.panY = this._pan.startPanY + event.clientY - this._pan.startY;
      this._reflectView();
      this.render();
      this._emit(this.config.events.panZoom, this._viewDetail());
      return;
    }

    if (this._connection) {
      this._connection.to = this._clientToViewport(event.clientX, event.clientY);
      this._drawGhost();
    }
  }

  _onPointerUp() {
    if (this._nodeDrag) {
      if (this._nodeDrag.moved) {
        const movedNodes = this._positionsOf(this._nodeDrag.ids);
        const primary = this._positionOf(this._nodeDrag.id) || movedNodes[0];
        if (primary) this._emit(this.config.events.nodeMove, { id: primary.id, x: primary.x, y: primary.y, nodes: movedNodes });
      }
      this._nodeDrag = null;
      this.render();
    }
    if (this._pan) {
      this._pan = null;
      this.render();
    }
    if (this._connection) this._endConnection();
  }

  _onPointerCancel() {
    if (this._nodeDrag) {
      this._applyNodePositions(this._nodeDrag.starts, { renderCardsOnly: true });
      this._nodeDrag = null;
    }
    if (this._connection) this._endConnection();
    this.render();
  }

  _onPortDown(event) {
    if (this.readonly) return;
    const card = event.target.closest(this.config.tags.card);
    const start = { ...event.detail.port, nodeId: card?.dataset.id || '' };
    this._connection = {
      from: start,
      to: this._portCenterViewport(start.nodeId, start.id, start.side)
    };
    this.setAttribute('connection-mode', '');
    this.render();
    this._drawGhost();
  }

  _onPortUp(event) {
    if (!this._connection || this.readonly) return;
    const card = event.target.closest(this.config.tags.card);
    const target = { ...event.detail.port, nodeId: card?.dataset.id || '' };
    const start = this._connection.from;
    if (this._validConnection(start, target)) {
      const from = start.side === 'output'
        ? { nodeId: start.nodeId, portId: start.id }
        : { nodeId: target.nodeId, portId: target.id };
      const to = start.side === 'output'
        ? { nodeId: target.nodeId, portId: target.id }
        : { nodeId: start.nodeId, portId: start.id };
      this._emit(this.config.events.edgeConnect, { from, to });
      this._addEdge(from, to);
    }
    this._endConnection();
  }

  _endConnection() {
    this._connection = null;
    this.removeAttribute('connection-mode');
    if (!this._probeBugMode) {
      this._ghost.hidden = true;
      this._ghost.removeAttribute('d');
    }
    this.render();
    this.scheduleProbes('connection-ended');
  }

  _onDoubleClick(event) {
    if (this.readonly) return;
    if (event.target.closest(this.config.tags.card) || event.target.closest('[data-edge-id]')) return;
    event.preventDefault();
    const point = this.clientToWorld(event.clientX, event.clientY);
    const node = this._makeNode(point);
    this._nodes = [...this._nodes, node];
    this._setSelected([node.id]);
    this._emit(this.config.events.nodeAdd, { id: node.id, type: node.type, x: node.x, y: node.y });
    this.render();
  }

  _onEdgeDoubleClick(event) {
    if (this.readonly) return;
    const hit = event.target.closest('[data-edge-id]');
    if (!hit?.dataset.edgeId) return;
    event.preventDefault();
    event.stopPropagation();
    const id = hit.dataset.edgeId;
    this._edges = this._edges.filter(edge => edge.id !== id);
    this._emit(this.config.events.edgeDisconnect, { id });
    this.render();
  }

  _onWheel(event) {
    event.preventDefault();
    const viewport = this._clientToViewport(event.clientX, event.clientY);
    const before = this.viewportToWorld(viewport);
    const zoom = clamp(this._view.zoom * Math.exp(-event.deltaY * 0.001), MIN_ZOOM, MAX_ZOOM);
    this._view.zoom = zoom;
    this._view.panX = viewport.x - before.x * zoom;
    this._view.panY = viewport.y - before.y * zoom;
    this._reflectView();
    this.render();
    this._emit(this.config.events.panZoom, this._viewDetail());
  }

  _onKeyDown(event) {
    if (event.defaultPrevented) return;
    if (event.key === '0') {
      event.preventDefault();
      this.fitToNodes();
      return;
    }
    const dir = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]
    }[event.key];
    if (!dir || !this._selected.length || this.readonly) return;
    event.preventDefault();
    const step = (this.snapToGrid ? this.gridSize : 8) * (event.shiftKey ? 4 : 1);
    this._moveSelectedBy(dir[0] * step, dir[1] * step);
  }

  _setSelected(ids, emit = true) {
    this._selected = Array.isArray(ids) ? ids.map(String).filter(id => this._nodes.some(n => String(n.id) === id)) : [];
    if (emit) this._emit(this.config.events.nodeSelect, { ids: this.selected });
    this.render();
  }

  _selectNode(id, additive) {
    if (!additive) return this._setSelected([id]);
    const next = this._selected.filter(item => item !== id);
    if (next.length === this._selected.length) next.push(id);
    this._setSelected(next);
  }

  _moveSelectedBy(dx, dy) {
    const starts = this._positionsOf(this._selected);
    const updates = this._moveNodeStarts(starts, { x: dx, y: dy });
    this._applyNodePositions(updates);
    const movedNodes = this._positionsOf(this._selected);
    const primary = movedNodes[0];
    if (primary) this._emit(this.config.events.nodeMove, { id: primary.id, x: primary.x, y: primary.y, nodes: movedNodes });
  }

  _positionsOf(ids) {
    return ids.map(id => this._positionOf(id)).filter(Boolean);
  }

  _positionOf(id) {
    const node = this._nodes.find(item => String(item.id) === String(id));
    return node ? { id: String(node.id), x: node.x, y: node.y } : null;
  }

  _moveNodeStarts(starts, deltaWorld) {
    return starts.map(start => {
      const point = this._snapPoint({ x: start.x + deltaWorld.x, y: start.y + deltaWorld.y });
      return { id: start.id, x: point.x, y: point.y };
    });
  }

  _applyNodePositions(updates, { renderCardsOnly = false } = {}) {
    const map = new Map(updates.map(update => [String(update.id), update]));
    this._nodes = this._nodes.map(node => {
      const next = map.get(String(node.id));
      return next ? { ...node, x: next.x, y: next.y } : node;
    });
    for (const update of updates) {
      const card = this._nodeLayer.querySelector(`${this.config.tags.card}[data-id="${cssEscape(update.id)}"]`);
      if (card) {
        card.style.left = `${round(update.x)}px`;
        card.style.top = `${round(update.y)}px`;
      }
    }
    if (!renderCardsOnly) this.render();
  }

  _snapPoint(point) {
    const x = Number(point.x) || 0;
    const y = Number(point.y) || 0;
    if (!this.snapToGrid) return { x: Math.round(x), y: Math.round(y) };
    const grid = this.gridSize;
    return { x: Math.round(x / grid) * grid, y: Math.round(y / grid) * grid };
  }

  _validConnection(start, target) {
    if (!start || !target) return false;
    if (!start.nodeId || !target.nodeId || !start.id || !target.id) return false;
    if (start.nodeId === target.nodeId && start.id === target.id) return false;
    if (start.side === target.side) return false;
    return true;
  }

  _addEdge(from, to) {
    const id = this._nextEdgeId();
    this._edges = [...this._edges, { id, from, to }];
    this.render();
  }

  _nextEdgeId() {
    const used = new Set(this._edges.map(edge => edge.id));
    let index = used.size + 1;
    let id = `edge-${index}`;
    while (used.has(id)) id = `edge-${++index}`;
    return id;
  }

  _makeNode(point) {
    const id = this._nextNodeId('effect');
    const snap = this._snapPoint(point);
    const colors = ['#49fafe', '#9d7cff', '#ffc857', '#44d07b', '#ff5d73'];
    return {
      id,
      type: 'effect',
      label: `Effect ${id.split('-').at(-1)}`,
      color: colors[this._nodes.length % colors.length],
      status: 'ok',
      x: snap.x,
      y: snap.y,
      inputs: [{ id: 'in', label: 'In', type: 'rgba' }],
      outputs: [{ id: 'out', label: 'Out', type: 'rgba' }]
    };
  }

  _nextNodeId(type) {
    const base = slugify(type) || 'node';
    const used = new Set(this._nodes.map(node => String(node.id)));
    let index = used.size + 1;
    let id = `${base}-${index}`;
    while (used.has(id)) id = `${base}-${++index}`;
    return id;
  }

  _portWorld(nodeId, portId, side) {
    return this._portDotWorld(nodeId, portId, side) || this._fallbackPortWorld(nodeId, portId, side);
  }

  _portDotWorld(nodeId, portId, side) {
    if (!this._nodeLayer || !this._viewport) return null;
    const port = this._nodeLayer.querySelector(`${this.config.tags.card}[data-id="${cssEscape(nodeId)}"] [data-port-side="${cssEscape(side)}"][data-port-id="${cssEscape(portId)}"]`);
    const dot = port?.querySelector(this.config.selectors.cardPortDot);
    if (!dot) return null;
    const dotRect = dot.getBoundingClientRect();
    const vp = this._viewport.getBoundingClientRect();
    if (!dotRect.width && !dotRect.height) return null;
    return this.viewportToWorld({
      x: dotRect.left + dotRect.width / 2 - vp.left,
      y: dotRect.top + dotRect.height / 2 - vp.top
    });
  }

  _fallbackPortWorld(nodeId, portId, side) {
    const node = this._nodes.find(item => String(item.id) === String(nodeId));
    if (!node) return null;
    const ports = side === 'output' ? node.outputs || [] : node.inputs || [];
    const index = Math.max(0, ports.findIndex(port => String(port.id) === String(portId)));
    return {
      x: node.x + (side === 'output' ? DEFAULT_NODE_WIDTH - 13 : 13),
      y: node.y + DEFAULT_PORT_HEADER + DEFAULT_PORT_STEP * (index + 0.5)
    };
  }

  _portCenterViewport(nodeId, portId, side) {
    const world = this._portWorld(nodeId, portId, side);
    return world ? this.worldToViewport(world) : { x: 0, y: 0 };
  }

  scheduleEdges() {
    if (this._edgeRaf) return;
    this._edgeRaf = requestAnimationFrame(() => {
      this._edgeRaf = 0;
      this._drawEdges();
      this._drawGhost();
      if (this._edgeSettleRaf) cancelAnimationFrame(this._edgeSettleRaf);
    if (this._probeRaf) cancelAnimationFrame(this._probeRaf);
      this._edgeSettleRaf = requestAnimationFrame(() => {
        this._edgeSettleRaf = 0;
        this._drawEdges();
        this._drawGhost();
        this.scheduleProbes('after-frame');
      });
    });
  }

  _drawEdges() {
    const rect = this._viewport.getBoundingClientRect();
    const width = this._viewport.clientWidth || rect.width || 800;
    const height = this._viewport.clientHeight || rect.height || 420;
    this._svg.setAttribute('viewBox', `0 0 ${Math.max(1, width)} ${Math.max(1, height)}`);
    const cableLayer = this._ensureCableLayer();
    const active = new Set();
    for (const edge of this._edges) {
      const id = String(edge.id || '');
      active.add(id);
      let cable = cableLayer.querySelector(`${this.config.tags.cable}[data-edge-id="${cssEscape(id)}"]`);
      if (!cable) {
        cable = document.createElement(this.config.tags.cable);
        cable.dataset.edgeId = id;
        cable.setAttribute('edge-id', id);
        cable.setAttribute('svg-selector', this.config.selectors.edgeLayer);
        cableLayer.append(cable);
      }
      const from = this._portWorld(edge.from?.nodeId, edge.from?.portId, 'output');
      const to = this._portWorld(edge.to?.nodeId, edge.to?.portId, 'input');
      cable.from = this._probeBugMode && from ? { ...from, y: from.y + 8 } : from;
      cable.to = to;
      cable.toggleAttribute('missing', !(from && to));
      cable.render?.();
    }
    cableLayer.querySelectorAll(this.config.tags.cable).forEach(cable => {
      if (!active.has(cable.dataset.edgeId || '')) cable.remove();
    });
  }

  _ensureCableLayer() {
    if (this._cableLayer) return this._cableLayer;
    this._cableLayer = this.querySelector(this.config.selectors.cableLayer);
    if (this._cableLayer) return this._cableLayer;
    const layer = document.createElement('div');
    layer.className = this.config.classes.cables;
    layer.hidden = true;
    this.append(layer);
    this._cableLayer = layer;
    return layer;
  }

  _drawGhost() {
    if (!this._connection) {
      if (!this._probeBugMode) {
        this._ghost.hidden = true;
        this._ghost.removeAttribute('d');
      }
      return;
    }
    const from = this._portCenterViewport(this._connection.from.nodeId, this._connection.from.id, this._connection.from.side);
    const to = this._connection.to || from;
    this._ghost.hidden = false;
    this._ghost.setAttribute('d', edgePath(from, to));
  }

  _reflectView() {
    this.setAttribute('pan-x', formatNumber(this._view.panX));
    this.setAttribute('pan-y', formatNumber(this._view.panY));
    this.setAttribute('zoom', formatNumber(this._view.zoom));
  }

  _viewDetail() { return { panX: this._view.panX, panY: this._view.panY, zoom: this._view.zoom }; }

  viewportToWorld(pointOrX, y) {
    const p = readPoint(pointOrX, y);
    return { x: (p.x - this._view.panX) / this._view.zoom, y: (p.y - this._view.panY) / this._view.zoom };
  }

  worldToViewport(pointOrX, y) {
    const p = readPoint(pointOrX, y);
    return { x: p.x * this._view.zoom + this._view.panX, y: p.y * this._view.zoom + this._view.panY };
  }

  clientToWorld(clientX, clientY) { return this.viewportToWorld(this._clientToViewport(clientX, clientY)); }

  _clientToViewport(clientX, clientY) {
    const rect = this._viewport.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  fitToNodes({ padding = 58, minZoom = 0.35, maxZoom = 1.2 } = {}) {
    if (!this._nodes.length) {
      this._view = { panX: 0, panY: 0, zoom: 1 };
      this.render();
      return;
    }
    const bounds = this._graphBounds();
    const rect = this._viewport.getBoundingClientRect();
    const availableWidth = Math.max(1, rect.width - padding * 2);
    const availableHeight = Math.max(1, rect.height - padding * 2);
    const zoom = clamp(Math.min(availableWidth / bounds.width, availableHeight / bounds.height), minZoom, maxZoom);
    this._view.zoom = zoom;
    this._view.panX = (rect.width - bounds.width * zoom) / 2 - bounds.minX * zoom;
    this._view.panY = (rect.height - bounds.height * zoom) / 2 - bounds.minY * zoom;
    this._reflectView();
    this.render();
    this._emit(this.config.events.panZoom, this._viewDetail());
  }

  _graphBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of this._nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + DEFAULT_NODE_WIDTH);
      maxY = Math.max(maxY, node.y + 130);
    }
    return { minX, minY, maxX, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }

  _emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: clone(detail) }));
  }

  setProbeBugMode(enabled) {
    this._probeBugMode = Boolean(enabled);
    this.toggleAttribute('data-probe-bugs', this._probeBugMode);
    if (this._probeBugMode && this._ghost) {
      this._ghost.hidden = false;
      if (!this._ghost.getAttribute('d')) this._ghost.setAttribute('d', edgePath({ x: 24, y: 24 }, { x: 180, y: 78 }));
    }
    if (!this._probeBugMode && !this._connection && this._ghost) {
      this._ghost.hidden = true;
      this._ghost.removeAttribute('d');
    }
    this.render();
    this.scheduleProbes(this._probeBugMode ? 'probe-bugs-enabled' : 'probe-bugs-disabled');
  }

  scheduleProbes(reason = 'scheduled') {
    if (!this._devProbesEnabled) return;
    if (this._probeRaf) cancelAnimationFrame(this._probeRaf);
    this._probeRaf = requestAnimationFrame(() => {
      this._probeRaf = 0;
      this.runDevProbes({ reason });
    });
  }

  runDevProbes({ reason = 'manual' } = {}) {
    const results = [];
    const pass = (name, message, detail = {}) => results.push({ name, pass: true, severity: 'info', message, detail });
    const fail = (name, message, detail = {}, hints = []) => results.push({ name, pass: false, severity: 'error', message, detail, hints });

    this._probeCollapseButtonAlignment(pass, fail);
    this._probeGhostClears(pass, fail);
    this._probeEdgesMeetPortDots(pass, fail);

    this._lastProbeResults = results;
    this.dispatchEvent(new CustomEvent(this.config.events.probeResults, {
      bubbles: true,
      detail: { reason, results, failed: results.filter(item => !item.pass).length }
    }));
    return results;
  }

  _probeCollapseButtonAlignment(pass, fail) {
    const tolerance = 2;
    let checked = 0;
    let failed = false;
    for (const card of this._nodeLayer.querySelectorAll(this.config.tags.card)) {
      const title = card.querySelector(this.config.selectors.cardTitle);
      const button = card.querySelector(this.config.selectors.cardExpand);
      if (!title || !button) continue;
      checked++;
      const titleY = centerY(title);
      const buttonY = centerY(button);
      const diff = buttonY - titleY;
      if (Math.abs(diff) > tolerance) {
        failed = true;
        fail('collapse-button-alignment', 'Collapse button is not vertically centered with the node title.', {
          nodeId: card.dataset.id,
          titleCenterY: round(titleY),
          buttonCenterY: round(buttonY),
          difference: round(diff),
          tolerance
        }, [
          'Check button line-height, padding, and icon alignment.',
          'Prefer display:grid; place-items:center; line-height:1 for compact caption buttons.'
        ]);
      }
    }
    if (!failed) pass('collapse-button-alignment', `Collapse buttons centered on ${checked} node card(s).`, { checked, tolerance });
  }

  _probeGhostClears(pass, fail) {
    const d = this._ghost?.getAttribute('d') || '';
    const visible = this._ghost && !this._ghost.hidden && d.trim();
    if (!this._connection && visible) {
      fail('ghost-edge-clears', 'Ghost edge is still visible after connection state ended.', {
        connection: this._connection,
        hidden: this._ghost.hidden,
        d
      }, [
        'In the <connect/> finally block, clear connection, remove connection-mode, hide ghost, and remove svg.d.',
        'Do not leave a stale ghost path after pointerup or pointercancel.'
      ]);
      return;
    }
    pass('ghost-edge-clears', 'Ghost edge is cleared when no connection is active.', { hidden: this._ghost.hidden, d });
  }

  _probeEdgesMeetPortDots(pass, fail) {
    const tolerance = 2;
    let checked = 0;
    let failed = false;
    for (const edge of this._edges) {
      const path = this._edgeLayer.querySelector(`${this.config.selectors.edge}[data-edge-id="${cssEscape(edge.id)}"]`);
      if (!path) continue;
      const parsed = parseEdgePath(path.getAttribute('d'));
      if (!parsed) continue;
      const expectedStart = this._portDotWorld(edge.from.nodeId, edge.from.portId, 'output');
      const expectedEnd = this._portDotWorld(edge.to.nodeId, edge.to.portId, 'input');
      if (!expectedStart || !expectedEnd) continue;
      checked++;
      const startDiff = distance(parsed.start, expectedStart);
      const endDiff = distance(parsed.end, expectedEnd);
      if (startDiff > tolerance) {
        failed = true;
        fail('edge-start-port-center', 'Cable start does not match the output port dot center in world space.', {
          edgeId: edge.id,
          nodeId: edge.from.nodeId,
          portId: edge.from.portId,
          actual: roundPoint(parsed.start),
          expected: roundPoint(expectedStart),
          difference: round(startDiff),
          tolerance
        }, [
          'Check whether SVG path points are in viewport or world space.',
          'Prefer measured DOM port dot centers over header/row constants.',
          'Schedule draw-edges after node-card render and one settle frame.'
        ]);
      }
      if (endDiff > tolerance) {
        failed = true;
        fail('edge-end-port-center', 'Cable end does not match the input port dot center in world space.', {
          edgeId: edge.id,
          nodeId: edge.to.nodeId,
          portId: edge.to.portId,
          actual: roundPoint(parsed.end),
          expected: roundPoint(expectedEnd),
          difference: round(endDiff),
          tolerance
        }, [
          'Check input-side port dot measurement.',
          'Check view transform symmetry between node layer and SVG edge layer.'
        ]);
      }
    }
    if (!failed) {
      pass('edge-port-center-alignment', `All ${checked} cable endpoint(s) align with measured port dots.`, { checked, tolerance });
    }
  }

  runBehaviorTests() {
    const results = [];
    const pass = (name, condition, detail = '') => results.push({ name, pass: Boolean(condition), detail });

    const oldSnap = this.hasAttribute('snap-to-grid');
    const oldGrid = this.getAttribute('grid-size');
    const oldView = clone(this._view);
    const oldNodes = clone(this._nodes);
    const oldEdges = clone(this._edges);
    const oldSelected = this._selected.slice();
    const oldReadonly = this.readonly;

    try {
      this.removeAttribute('snap-to-grid');
      this._nodes = [{ id: 'a', x: 100, y: 100, inputs: [], outputs: [{ id: 'out' }] }];
      this._selected = ['a'];
      this._view = { panX: 0, panY: 0, zoom: 2 };
      const updates = this._moveNodeStarts(this._positionsOf(['a']), { x: 20 / this._view.zoom, y: 10 / this._view.zoom });
      pass('drag uses world delta under zoom', updates[0].x === 110 && updates[0].y === 105, JSON.stringify(updates[0]));

      this.setAttribute('snap-to-grid', '');
      this.setAttribute('grid-size', '24');
      const snapped = this._snapPoint({ x: 13, y: 13 });
      pass('snap-to-grid rounds to grid-size', snapped.x === 24 && snapped.y === 24, JSON.stringify(snapped));

      pass('same-side port connection is invalid', this._validConnection({ nodeId: 'a', id: 'out', side: 'output' }, { nodeId: 'b', id: 'out', side: 'output' }) === false);
      pass('output-to-input port connection is valid', this._validConnection({ nodeId: 'a', id: 'out', side: 'output' }, { nodeId: 'b', id: 'in', side: 'input' }) === true);

      this.setAttribute('readonly', '');
      pass('readonly flag is visible to interactions', this.readonly === true);
    } finally {
      this._nodes = oldNodes;
      this._edges = oldEdges;
      this._selected = oldSelected;
      this._view = oldView;
      if (oldSnap) this.setAttribute('snap-to-grid', ''); else this.removeAttribute('snap-to-grid');
      if (oldGrid == null) this.removeAttribute('grid-size'); else this.setAttribute('grid-size', oldGrid);
      if (oldReadonly) this.setAttribute('readonly', ''); else this.removeAttribute('readonly');
      this.render();
    }
    return results;
  }
}

export function createNodeEditorGraphRuntime(host, config) {
  return new NodeEditorGraphRuntime(host, config);
}

function normalizeGraphConfig(config = {}) {
  return {
    html: config.html || '',
    tags: {
      card: config.tags?.card || 'go-node-card',
      cable: config.tags?.cable || 'go-node-cable'
    },
    classes: {
      root: config.classes?.root || 'go-node-graph-root',
      cables: config.classes?.cables || 'go-node-graph-cables'
    },
    selectors: {
      viewport: config.selectors?.viewport || '.go-node-graph-viewport',
      svg: config.selectors?.svg || '.go-node-graph-edges',
      edgeLayer: config.selectors?.edgeLayer || '.go-node-graph-edge-layer',
      ghost: config.selectors?.ghost || '.go-node-graph-ghost-edge',
      cableLayer: config.selectors?.cableLayer || '.go-node-graph-cables',
      nodeLayer: config.selectors?.nodeLayer || '.go-node-graph-nodes',
      empty: config.selectors?.empty || '.go-node-graph-empty',
      cardPortDot: config.selectors?.cardPortDot || '.go-node-card-port-dot',
      cardTitle: config.selectors?.cardTitle || '.go-node-card-title',
      cardExpand: config.selectors?.cardExpand || '.go-node-card-expand',
      edge: config.selectors?.edge || '.go-node-graph-edge',
      nodeDragIgnore: config.selectors?.nodeDragIgnore || '.go-node-card-port, button, input, textarea, select, [contenteditable]'
    },
    events: {
      portDown: config.events?.portDown || 'gizmo-node-port-down',
      portUp: config.events?.portUp || 'gizmo-node-port-up',
      nodeSelect: config.events?.nodeSelect || 'gizmo-node-select',
      nodeMove: config.events?.nodeMove || 'gizmo-node-move',
      edgeConnect: config.events?.edgeConnect || 'gizmo-edge-connect',
      edgeDisconnect: config.events?.edgeDisconnect || 'gizmo-edge-disconnect',
      nodeAdd: config.events?.nodeAdd || 'gizmo-node-add',
      panZoom: config.events?.panZoom || 'gizmo-pan-zoom',
      probeResults: config.events?.probeResults || 'gizmo-probe-results'
    }
  };
}
