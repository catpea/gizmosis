import { serializeXml } from './xml-parser.js';

export function generateManifest(ir, diagnostics = []) {
  return sanitize({
    $schema: 'https://gizmo-xml.local/schemas/gizmo-manifest-v0.5.json',
    version: ir.version,
    source: ir.source,
    name: ir.name,
    tag: ir.tag,
    css: ir.css,
    build: ir.build,
    diagnosticsPolicy: ir.diagnosticsPolicy,
    uses: ir.uses,
    about: ir.about,
    terms: ir.terms,
    contract: ir.contract,
    requires: ir.requires,
    provides: ir.provides,
    model: ir.model,
    types: ir.types,
    props: ir.props,
    attrs: ir.attrs,
    state: ir.state,
    events: ir.events,
    methods: ir.methods,
    slots: ir.slots,
    parts: ir.parts,
    view: ir.view ? {
      refs: ir.view.refs,
      repeated: ir.view.repeated,
      keys: ir.view.keys,
      bindings: ir.view.bindings,
      source: serializeXml(ir.view.ast, { indent: '  ' })
    } : null,
    geometry: ir.geometry,
    behavior: ir.behavior,
    actions: ir.actions,
    interactions: ir.interactions,
    effects: ir.effects,
    resources: ir.resources,
    frames: ir.frames,
    dev: ir.dev,
    fixtures: ir.fixtures,
    tests: ir.tests,
    features: { version: ir.featuresVersion, supported: ir.features },
    diagnostics
  });
}

export function generateJavaScript(ir, diagnostics = [], options = {}) {
  if ((ir.tag || '') === 'fox-ve-node-card') return generateNodeEditorCardComponent(ir, diagnostics, options);
  if ((ir.tag || '') === 'fox-ve-node-cable') return generateNodeEditorCableComponent(ir, diagnostics, options);
  if (usesNodeEditorImplementation(ir)) return generateNodeEditorBridge(ir, diagnostics, options);
  return generateStandaloneSkeleton(ir, diagnostics, options);
}

const NODE_EDITOR_GRAPH_CLASS = 'export class FoxVeNodeGraph extends HTMLElement {\n  constructor() {\n    super();\n    this._nodes = [];\n    this._edges = [];\n    this._selected = [];\n    this._view = { panX: 0, panY: 0, zoom: 1 };\n    this._nodeDrag = null;\n    this._pan = null;\n    this._connection = null;\n    this._spaceDown = false;\n    this._edgeRaf = 0;\n    this._edgeSettleRaf = 0;\n    this._probeRaf = 0;\n    this._devProbesEnabled = true;\n    this._probeBugMode = false;\n    this._lastProbeResults = [];\n  }\n\n  connectedCallback() {\n    this._build();\n    if (!this._installed) {\n      this._install();\n      this._installed = true;\n    }\n    this._resizeObserver = new ResizeObserver(() => this.scheduleEdges());\n    this._resizeObserver.observe(this);\n    this.render();\n  }\n\n  disconnectedCallback() {\n    this._resizeObserver?.disconnect();\n    if (this._edgeRaf) cancelAnimationFrame(this._edgeRaf);\n    if (this._edgeSettleRaf) cancelAnimationFrame(this._edgeSettleRaf);\n    if (this._probeRaf) cancelAnimationFrame(this._probeRaf);\n  }\n\n  get nodes() { return clone(this._nodes); }\n  set nodes(value) { this._nodes = Array.isArray(value) ? clone(value) : []; this.render(); }\n  get edges() { return clone(this._edges); }\n  set edges(value) { this._edges = Array.isArray(value) ? clone(value) : []; this.render(); }\n  get selected() { return this._selected.slice(); }\n  set selected(value) { this._selected = Array.isArray(value) ? value.map(String) : []; this.render(); }\n  get readonly() { return this.hasAttribute(\'readonly\'); }\n  get snapToGrid() { return this.hasAttribute(\'snap-to-grid\'); }\n  get gridSize() { return Math.max(4, Number(this.getAttribute(\'grid-size\')) || 24); }\n\n  loadGraph({ nodes = [], edges = [], selected = [], view = { panX: 0, panY: 0, zoom: 1 }, fit = false } = {}) {\n    this._nodes = clone(nodes);\n    this._edges = clone(edges);\n    this._selected = Array.isArray(selected) ? selected.map(String) : [];\n    this._view = {\n      panX: Number(view.panX) || 0,\n      panY: Number(view.panY) || 0,\n      zoom: clamp(Number(view.zoom) || 1, MIN_ZOOM, MAX_ZOOM)\n    };\n    this._connection = null;\n    this._nodeDrag = null;\n    this._pan = null;\n    this.removeAttribute(\'connection-mode\');\n    this.render();\n    if (fit) queueMicrotask(() => this.fitToNodes({ padding: 56, maxZoom: 1 }));\n  }\n\n  resetGraph(data) {\n    this.loadGraph(data);\n  }\n\n  _build() {\n    if (this._viewport) return;\n    this.className = \'fox-ve-node-graph-root\';\n    this.innerHTML = `\n      <div class="fox-ve-node-graph-viewport" tabindex="0" role="application" aria-label="Node graph">\n        <div class="status-strip">\n          <span class="pill"><span class="dot"></span><span data-readout="zoom">zoom 1.00</span></span>\n          <span class="pill"><span data-readout="mode">ready</span></span>\n        </div>\n        <svg class="fox-ve-node-graph-edges" aria-hidden="true">\n          <g class="fox-ve-node-graph-edge-layer"></g>\n          <path class="fox-ve-node-graph-ghost-edge" hidden></path>\n        </svg>\n        <div class="fox-ve-node-graph-nodes"></div>\n        <div class="fox-ve-node-graph-empty">Double-click empty space to add a node.</div>\n      </div>\n    `;\n    this._viewport = this.querySelector(\'.fox-ve-node-graph-viewport\');\n    this._svg = this.querySelector(\'.fox-ve-node-graph-edges\');\n    this._edgeLayer = this.querySelector(\'.fox-ve-node-graph-edge-layer\');\n    this._ghost = this.querySelector(\'.fox-ve-node-graph-ghost-edge\');\n    this._nodeLayer = this.querySelector(\'.fox-ve-node-graph-nodes\');\n    this._empty = this.querySelector(\'.fox-ve-node-graph-empty\');\n    this._zoomReadout = this.querySelector(\'[data-readout="zoom"]\');\n    this._modeReadout = this.querySelector(\'[data-readout="mode"]\');\n  }\n\n  _install() {\n    this._viewport.addEventListener(\'wheel\', event => this._onWheel(event), { passive: false });\n    this._viewport.addEventListener(\'pointerdown\', event => this._onViewportPointerDown(event));\n    this._viewport.addEventListener(\'dblclick\', event => this._onDoubleClick(event));\n    this._viewport.addEventListener(\'keydown\', event => this._onKeyDown(event));\n    this._nodeLayer.addEventListener(\'pointerdown\', event => this._onNodePointerDown(event));\n    this._nodeLayer.addEventListener(\'fox-node-port-down\', event => this._onPortDown(event));\n    this._nodeLayer.addEventListener(\'fox-node-port-up\', event => this._onPortUp(event));\n    this._edgeLayer.addEventListener(\'dblclick\', event => this._onEdgeDoubleClick(event));\n    window.addEventListener(\'pointermove\', event => this._onPointerMove(event));\n    window.addEventListener(\'pointerup\', event => this._onPointerUp(event));\n    window.addEventListener(\'pointercancel\', event => this._onPointerCancel(event));\n    window.addEventListener(\'keydown\', event => { if (event.code === \'Space\') this._spaceDown = true; });\n    window.addEventListener(\'keyup\', event => { if (event.code === \'Space\') this._spaceDown = false; });\n  }\n\n  render() {\n    if (!this._viewport) return;\n    this._empty.hidden = this._nodes.length !== 0;\n    this.classList.toggle(\'is-panning\', Boolean(this._pan));\n    this.classList.toggle(\'is-dragging-node\', Boolean(this._nodeDrag));\n    this.classList.toggle(\'is-connection-mode\', Boolean(this._connection));\n    this.classList.toggle(\'is-readonly\', this.readonly);\n    this._viewport.style.setProperty(\'--pan-x\', `${this._view.panX}px`);\n    this._viewport.style.setProperty(\'--pan-y\', `${this._view.panY}px`);\n    this._viewport.style.setProperty(\'--zoom\', this._view.zoom);\n    this._viewport.style.setProperty(\'--grid\', `${this.gridSize}px`);\n    this._zoomReadout.textContent = `zoom ${this._view.zoom.toFixed(2)}`;\n    this._modeReadout.textContent = this.readonly ? \'readonly\' : this._connection ? \'connecting\' : this._nodeDrag ? \'dragging\' : this._pan ? \'panning\' : \'ready\';\n\n    this._nodeLayer.style.transform = `translate(${this._view.panX}px, ${this._view.panY}px) scale(${this._view.zoom})`;\n    this._edgeLayer.setAttribute(\'transform\', `translate(${this._view.panX} ${this._view.panY}) scale(${this._view.zoom})`);\n\n    const active = new Set();\n    const selected = new Set(this._selected);\n    for (const node of this._nodes) {\n      active.add(String(node.id));\n      let card = this._nodeLayer.querySelector(`fox-ve-node-card[data-id="${cssEscape(node.id)}"]`);\n      if (!card) {\n        card = document.createElement(\'fox-ve-node-card\');\n        card.dataset.id = node.id;\n        this._nodeLayer.append(card);\n      }\n      card.dataset.type = node.type || \'\';\n      card.setAttribute(\'node-label\', node.label || node.id);\n      card.setAttribute(\'color\', node.color || \'#0d6efd\');\n      card.setAttribute(\'status\', node.status || \'ok\');\n      card.toggleAttribute(\'selected\', selected.has(String(node.id)));\n      card.toggleAttribute(\'expanded\', Boolean(node.expanded));\n      card.style.left = `${round(node.x)}px`;\n      card.style.top = `${round(node.y)}px`;\n      card.inputs = node.inputs || [];\n      card.outputs = node.outputs || [];\n    }\n    this._nodeLayer.querySelectorAll(\'fox-ve-node-card\').forEach(card => {\n      if (!active.has(card.dataset.id)) card.remove();\n    });\n    this.scheduleEdges();\n  }\n\n  _onViewportPointerDown(event) {\n    this._viewport.focus({ preventScroll: true });\n    if (event.target.closest(\'fox-ve-node-card\')) return;\n    if (this.readonly) return;\n    if (event.button === 1 || (event.button === 0 && this._spaceDown)) {\n      event.preventDefault();\n      this._pan = {\n        startX: event.clientX,\n        startY: event.clientY,\n        startPanX: this._view.panX,\n        startPanY: this._view.panY\n      };\n      this._viewport.setPointerCapture?.(event.pointerId);\n      this.render();\n      return;\n    }\n    if (event.button === 0) this._setSelected([]);\n  }\n\n  _onNodePointerDown(event) {\n    if (this.readonly || event.button !== 0) return;\n    if (event.target.closest(\'.fox-ve-node-card-port, button, input, textarea, select, [contenteditable]\')) return;\n    const card = event.target.closest(\'fox-ve-node-card\');\n    if (!card) return;\n    event.preventDefault();\n    this._viewport.focus({ preventScroll: true });\n    const id = card.dataset.id;\n    const additive = event.shiftKey || event.ctrlKey || event.metaKey;\n    const alreadySelected = this._selected.includes(id);\n    if (additive) this._selectNode(id, true);\n    else if (!alreadySelected) this._setSelected([id]);\n    const dragIds = this._selected.includes(id) ? this._selected.slice() : [id];\n    this._nodeDrag = {\n      id,\n      ids: dragIds,\n      starts: this._positionsOf(dragIds),\n      startClient: { x: event.clientX, y: event.clientY },\n      moved: false\n    };\n    card.setPointerCapture?.(event.pointerId);\n    this.render();\n  }\n\n  _onPointerMove(event) {\n    if (this._nodeDrag) {\n      const dxClient = event.clientX - this._nodeDrag.startClient.x;\n      const dyClient = event.clientY - this._nodeDrag.startClient.y;\n      const deltaWorld = { x: dxClient / this._view.zoom, y: dyClient / this._view.zoom };\n      this._nodeDrag.moved = this._nodeDrag.moved || Math.hypot(dxClient, dyClient) > 1;\n      const updates = this._moveNodeStarts(this._nodeDrag.starts, deltaWorld);\n      this._applyNodePositions(updates, { renderCardsOnly: true });\n      this.scheduleEdges();\n      return;\n    }\n\n    if (this._pan) {\n      this._view.panX = this._pan.startPanX + event.clientX - this._pan.startX;\n      this._view.panY = this._pan.startPanY + event.clientY - this._pan.startY;\n      this._reflectView();\n      this.render();\n      this._emit(\'fox-pan-zoom\', this._viewDetail());\n      return;\n    }\n\n    if (this._connection) {\n      this._connection.to = this._clientToViewport(event.clientX, event.clientY);\n      this._drawGhost();\n    }\n  }\n\n  _onPointerUp() {\n    if (this._nodeDrag) {\n      if (this._nodeDrag.moved) {\n        const movedNodes = this._positionsOf(this._nodeDrag.ids);\n        const primary = this._positionOf(this._nodeDrag.id) || movedNodes[0];\n        if (primary) this._emit(\'fox-node-move\', { id: primary.id, x: primary.x, y: primary.y, nodes: movedNodes });\n      }\n      this._nodeDrag = null;\n      this.render();\n    }\n    if (this._pan) {\n      this._pan = null;\n      this.render();\n    }\n    if (this._connection) this._endConnection();\n  }\n\n  _onPointerCancel() {\n    if (this._nodeDrag) {\n      this._applyNodePositions(this._nodeDrag.starts, { renderCardsOnly: true });\n      this._nodeDrag = null;\n    }\n    if (this._connection) this._endConnection();\n    this.render();\n  }\n\n  _onPortDown(event) {\n    if (this.readonly) return;\n    const card = event.target.closest(\'fox-ve-node-card\');\n    const start = { ...event.detail.port, nodeId: card?.dataset.id || \'\' };\n    this._connection = {\n      from: start,\n      to: this._portCenterViewport(start.nodeId, start.id, start.side)\n    };\n    this.setAttribute(\'connection-mode\', \'\');\n    this.render();\n    this._drawGhost();\n  }\n\n  _onPortUp(event) {\n    if (!this._connection || this.readonly) return;\n    const card = event.target.closest(\'fox-ve-node-card\');\n    const target = { ...event.detail.port, nodeId: card?.dataset.id || \'\' };\n    const start = this._connection.from;\n    if (this._validConnection(start, target)) {\n      const from = start.side === \'output\'\n        ? { nodeId: start.nodeId, portId: start.id }\n        : { nodeId: target.nodeId, portId: target.id };\n      const to = start.side === \'output\'\n        ? { nodeId: target.nodeId, portId: target.id }\n        : { nodeId: start.nodeId, portId: start.id };\n      this._emit(\'fox-edge-connect\', { from, to });\n      this._addEdge(from, to);\n    }\n    this._endConnection();\n  }\n\n  _endConnection() {\n    this._connection = null;\n    this.removeAttribute(\'connection-mode\');\n    if (!this._probeBugMode) {\n      this._ghost.hidden = true;\n      this._ghost.removeAttribute(\'d\');\n    }\n    this.render();\n    this.scheduleProbes(\'connection-ended\');\n  }\n\n  _onDoubleClick(event) {\n    if (this.readonly) return;\n    if (event.target.closest(\'fox-ve-node-card\') || event.target.closest(\'[data-edge-id]\')) return;\n    event.preventDefault();\n    const point = this.clientToWorld(event.clientX, event.clientY);\n    const node = this._makeNode(point);\n    this._nodes = [...this._nodes, node];\n    this._setSelected([node.id]);\n    this._emit(\'fox-node-add\', { id: node.id, type: node.type, x: node.x, y: node.y });\n    this.render();\n  }\n\n  _onEdgeDoubleClick(event) {\n    if (this.readonly) return;\n    const hit = event.target.closest(\'[data-edge-id]\');\n    if (!hit?.dataset.edgeId) return;\n    event.preventDefault();\n    event.stopPropagation();\n    const id = hit.dataset.edgeId;\n    this._edges = this._edges.filter(edge => edge.id !== id);\n    this._emit(\'fox-edge-disconnect\', { id });\n    this.render();\n  }\n\n  _onWheel(event) {\n    event.preventDefault();\n    const viewport = this._clientToViewport(event.clientX, event.clientY);\n    const before = this.viewportToWorld(viewport);\n    const zoom = clamp(this._view.zoom * Math.exp(-event.deltaY * 0.001), MIN_ZOOM, MAX_ZOOM);\n    this._view.zoom = zoom;\n    this._view.panX = viewport.x - before.x * zoom;\n    this._view.panY = viewport.y - before.y * zoom;\n    this._reflectView();\n    this.render();\n    this._emit(\'fox-pan-zoom\', this._viewDetail());\n  }\n\n  _onKeyDown(event) {\n    if (event.defaultPrevented) return;\n    if (event.key === \'0\') {\n      event.preventDefault();\n      this.fitToNodes();\n      return;\n    }\n    const dir = {\n      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]\n    }[event.key];\n    if (!dir || !this._selected.length || this.readonly) return;\n    event.preventDefault();\n    const step = (this.snapToGrid ? this.gridSize : 8) * (event.shiftKey ? 4 : 1);\n    this._moveSelectedBy(dir[0] * step, dir[1] * step);\n  }\n\n  _setSelected(ids, emit = true) {\n    this._selected = Array.isArray(ids) ? ids.map(String).filter(id => this._nodes.some(n => String(n.id) === id)) : [];\n    if (emit) this._emit(\'fox-node-select\', { ids: this.selected });\n    this.render();\n  }\n\n  _selectNode(id, additive) {\n    if (!additive) return this._setSelected([id]);\n    const next = this._selected.filter(item => item !== id);\n    if (next.length === this._selected.length) next.push(id);\n    this._setSelected(next);\n  }\n\n  _moveSelectedBy(dx, dy) {\n    const starts = this._positionsOf(this._selected);\n    const updates = this._moveNodeStarts(starts, { x: dx, y: dy });\n    this._applyNodePositions(updates);\n    const movedNodes = this._positionsOf(this._selected);\n    const primary = movedNodes[0];\n    if (primary) this._emit(\'fox-node-move\', { id: primary.id, x: primary.x, y: primary.y, nodes: movedNodes });\n  }\n\n  _positionsOf(ids) {\n    return ids.map(id => this._positionOf(id)).filter(Boolean);\n  }\n\n  _positionOf(id) {\n    const node = this._nodes.find(item => String(item.id) === String(id));\n    return node ? { id: String(node.id), x: node.x, y: node.y } : null;\n  }\n\n  _moveNodeStarts(starts, deltaWorld) {\n    return starts.map(start => {\n      const point = this._snapPoint({ x: start.x + deltaWorld.x, y: start.y + deltaWorld.y });\n      return { id: start.id, x: point.x, y: point.y };\n    });\n  }\n\n  _applyNodePositions(updates, { renderCardsOnly = false } = {}) {\n    const map = new Map(updates.map(update => [String(update.id), update]));\n    this._nodes = this._nodes.map(node => {\n      const next = map.get(String(node.id));\n      return next ? { ...node, x: next.x, y: next.y } : node;\n    });\n    for (const update of updates) {\n      const card = this._nodeLayer.querySelector(`fox-ve-node-card[data-id="${cssEscape(update.id)}"]`);\n      if (card) {\n        card.style.left = `${round(update.x)}px`;\n        card.style.top = `${round(update.y)}px`;\n      }\n    }\n    if (!renderCardsOnly) this.render();\n  }\n\n  _snapPoint(point) {\n    const x = Number(point.x) || 0;\n    const y = Number(point.y) || 0;\n    if (!this.snapToGrid) return { x: Math.round(x), y: Math.round(y) };\n    const grid = this.gridSize;\n    return { x: Math.round(x / grid) * grid, y: Math.round(y / grid) * grid };\n  }\n\n  _validConnection(start, target) {\n    if (!start || !target) return false;\n    if (!start.nodeId || !target.nodeId || !start.id || !target.id) return false;\n    if (start.nodeId === target.nodeId && start.id === target.id) return false;\n    if (start.side === target.side) return false;\n    return true;\n  }\n\n  _addEdge(from, to) {\n    const id = this._nextEdgeId();\n    this._edges = [...this._edges, { id, from, to }];\n    this.render();\n  }\n\n  _nextEdgeId() {\n    const used = new Set(this._edges.map(edge => edge.id));\n    let index = used.size + 1;\n    let id = `edge-${index}`;\n    while (used.has(id)) id = `edge-${++index}`;\n    return id;\n  }\n\n  _makeNode(point) {\n    const id = this._nextNodeId(\'effect\');\n    const snap = this._snapPoint(point);\n    const colors = [\'#49fafe\', \'#9d7cff\', \'#ffc857\', \'#44d07b\', \'#ff5d73\'];\n    return {\n      id,\n      type: \'effect\',\n      label: `Effect ${id.split(\'-\').at(-1)}`,\n      color: colors[this._nodes.length % colors.length],\n      status: \'ok\',\n      x: snap.x,\n      y: snap.y,\n      inputs: [{ id: \'in\', label: \'In\', type: \'rgba\' }],\n      outputs: [{ id: \'out\', label: \'Out\', type: \'rgba\' }]\n    };\n  }\n\n  _nextNodeId(type) {\n    const base = slugify(type) || \'node\';\n    const used = new Set(this._nodes.map(node => String(node.id)));\n    let index = used.size + 1;\n    let id = `${base}-${index}`;\n    while (used.has(id)) id = `${base}-${++index}`;\n    return id;\n  }\n\n  _portWorld(nodeId, portId, side) {\n    return this._portDotWorld(nodeId, portId, side) || this._fallbackPortWorld(nodeId, portId, side);\n  }\n\n  _portDotWorld(nodeId, portId, side) {\n    if (!this._nodeLayer || !this._viewport) return null;\n    const port = this._nodeLayer.querySelector(`fox-ve-node-card[data-id="${cssEscape(nodeId)}"] [data-port-side="${cssEscape(side)}"][data-port-id="${cssEscape(portId)}"]`);\n    const dot = port?.querySelector(\'.fox-ve-node-card-port-dot\');\n    if (!dot) return null;\n    const dotRect = dot.getBoundingClientRect();\n    const vp = this._viewport.getBoundingClientRect();\n    if (!dotRect.width && !dotRect.height) return null;\n    return this.viewportToWorld({\n      x: dotRect.left + dotRect.width / 2 - vp.left,\n      y: dotRect.top + dotRect.height / 2 - vp.top\n    });\n  }\n\n  _fallbackPortWorld(nodeId, portId, side) {\n    const node = this._nodes.find(item => String(item.id) === String(nodeId));\n    if (!node) return null;\n    const ports = side === \'output\' ? node.outputs || [] : node.inputs || [];\n    const index = Math.max(0, ports.findIndex(port => String(port.id) === String(portId)));\n    return {\n      x: node.x + (side === \'output\' ? DEFAULT_NODE_WIDTH - 13 : 13),\n      y: node.y + DEFAULT_PORT_HEADER + DEFAULT_PORT_STEP * (index + 0.5)\n    };\n  }\n\n  _portCenterViewport(nodeId, portId, side) {\n    const world = this._portWorld(nodeId, portId, side);\n    return world ? this.worldToViewport(world) : { x: 0, y: 0 };\n  }\n\n  scheduleEdges() {\n    if (this._edgeRaf) return;\n    this._edgeRaf = requestAnimationFrame(() => {\n      this._edgeRaf = 0;\n      this._drawEdges();\n      this._drawGhost();\n      if (this._edgeSettleRaf) cancelAnimationFrame(this._edgeSettleRaf);\n    if (this._probeRaf) cancelAnimationFrame(this._probeRaf);\n      this._edgeSettleRaf = requestAnimationFrame(() => {\n        this._edgeSettleRaf = 0;\n        this._drawEdges();\n        this._drawGhost();\n        this.scheduleProbes(\'after-frame\');\n      });\n    });\n  }\n\n  _drawEdges() {\n    const rect = this._viewport.getBoundingClientRect();\n    const width = this._viewport.clientWidth || rect.width || 800;\n    const height = this._viewport.clientHeight || rect.height || 420;\n    this._svg.setAttribute(\'viewBox\', `0 0 ${Math.max(1, width)} ${Math.max(1, height)}`);\n    this._edgeLayer.innerHTML = \'\';\n    for (const edge of this._edges) {\n      const from = this._portWorld(edge.from?.nodeId, edge.from?.portId, \'output\');\n      const to = this._portWorld(edge.to?.nodeId, edge.to?.portId, \'input\');\n      const group = document.createElementNS(SVG_NS, \'g\');\n      group.setAttribute(\'class\', \'fox-ve-node-graph-edge-group\');\n      group.dataset.edgeId = edge.id;\n      const hit = document.createElementNS(SVG_NS, \'path\');\n      hit.setAttribute(\'class\', \'fox-ve-node-graph-edge-hit\');\n      hit.dataset.edgeId = edge.id;\n      const line = document.createElementNS(SVG_NS, \'path\');\n      line.setAttribute(\'class\', \'fox-ve-node-graph-edge\');\n      line.dataset.edgeId = edge.id;\n      if (from && to) {\n        const drawFrom = this._probeBugMode ? { ...from, y: from.y + 8 } : from;\n        const d = edgePath(drawFrom, to);\n        hit.setAttribute(\'d\', d);\n        line.setAttribute(\'d\', d);\n      }\n      group.append(hit, line);\n      this._edgeLayer.append(group);\n    }\n  }\n\n  _drawGhost() {\n    if (!this._connection) {\n      if (!this._probeBugMode) {\n        this._ghost.hidden = true;\n        this._ghost.removeAttribute(\'d\');\n      }\n      return;\n    }\n    const from = this._portCenterViewport(this._connection.from.nodeId, this._connection.from.id, this._connection.from.side);\n    const to = this._connection.to || from;\n    this._ghost.hidden = false;\n    this._ghost.setAttribute(\'d\', edgePath(from, to));\n  }\n\n  _reflectView() {\n    this.setAttribute(\'pan-x\', formatNumber(this._view.panX));\n    this.setAttribute(\'pan-y\', formatNumber(this._view.panY));\n    this.setAttribute(\'zoom\', formatNumber(this._view.zoom));\n  }\n\n  _viewDetail() { return { panX: this._view.panX, panY: this._view.panY, zoom: this._view.zoom }; }\n\n  viewportToWorld(pointOrX, y) {\n    const p = readPoint(pointOrX, y);\n    return { x: (p.x - this._view.panX) / this._view.zoom, y: (p.y - this._view.panY) / this._view.zoom };\n  }\n\n  worldToViewport(pointOrX, y) {\n    const p = readPoint(pointOrX, y);\n    return { x: p.x * this._view.zoom + this._view.panX, y: p.y * this._view.zoom + this._view.panY };\n  }\n\n  clientToWorld(clientX, clientY) { return this.viewportToWorld(this._clientToViewport(clientX, clientY)); }\n\n  _clientToViewport(clientX, clientY) {\n    const rect = this._viewport.getBoundingClientRect();\n    return { x: clientX - rect.left, y: clientY - rect.top };\n  }\n\n  fitToNodes({ padding = 58, minZoom = 0.35, maxZoom = 1.2 } = {}) {\n    if (!this._nodes.length) {\n      this._view = { panX: 0, panY: 0, zoom: 1 };\n      this.render();\n      return;\n    }\n    const bounds = this._graphBounds();\n    const rect = this._viewport.getBoundingClientRect();\n    const availableWidth = Math.max(1, rect.width - padding * 2);\n    const availableHeight = Math.max(1, rect.height - padding * 2);\n    const zoom = clamp(Math.min(availableWidth / bounds.width, availableHeight / bounds.height), minZoom, maxZoom);\n    this._view.zoom = zoom;\n    this._view.panX = (rect.width - bounds.width * zoom) / 2 - bounds.minX * zoom;\n    this._view.panY = (rect.height - bounds.height * zoom) / 2 - bounds.minY * zoom;\n    this._reflectView();\n    this.render();\n    this._emit(\'fox-pan-zoom\', this._viewDetail());\n  }\n\n  _graphBounds() {\n    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;\n    for (const node of this._nodes) {\n      minX = Math.min(minX, node.x);\n      minY = Math.min(minY, node.y);\n      maxX = Math.max(maxX, node.x + DEFAULT_NODE_WIDTH);\n      maxY = Math.max(maxY, node.y + 130);\n    }\n    return { minX, minY, maxX, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };\n  }\n\n  _emit(name, detail) {\n    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: clone(detail) }));\n  }\n\n  setProbeBugMode(enabled) {\n    this._probeBugMode = Boolean(enabled);\n    this.toggleAttribute(\'data-probe-bugs\', this._probeBugMode);\n    if (this._probeBugMode && this._ghost) {\n      this._ghost.hidden = false;\n      if (!this._ghost.getAttribute(\'d\')) this._ghost.setAttribute(\'d\', edgePath({ x: 24, y: 24 }, { x: 180, y: 78 }));\n    }\n    if (!this._probeBugMode && !this._connection && this._ghost) {\n      this._ghost.hidden = true;\n      this._ghost.removeAttribute(\'d\');\n    }\n    this.render();\n    this.scheduleProbes(this._probeBugMode ? \'probe-bugs-enabled\' : \'probe-bugs-disabled\');\n  }\n\n  scheduleProbes(reason = \'scheduled\') {\n    if (!this._devProbesEnabled) return;\n    if (this._probeRaf) cancelAnimationFrame(this._probeRaf);\n    this._probeRaf = requestAnimationFrame(() => {\n      this._probeRaf = 0;\n      this.runDevProbes({ reason });\n    });\n  }\n\n  runDevProbes({ reason = \'manual\' } = {}) {\n    const results = [];\n    const pass = (name, message, detail = {}) => results.push({ name, pass: true, severity: \'info\', message, detail });\n    const fail = (name, message, detail = {}, hints = []) => results.push({ name, pass: false, severity: \'error\', message, detail, hints });\n\n    this._probeCollapseButtonAlignment(pass, fail);\n    this._probeGhostClears(pass, fail);\n    this._probeEdgesMeetPortDots(pass, fail);\n\n    this._lastProbeResults = results;\n    this.dispatchEvent(new CustomEvent(\'gizmo-probe-results\', {\n      bubbles: true,\n      detail: { reason, results, failed: results.filter(item => !item.pass).length }\n    }));\n    return results;\n  }\n\n  _probeCollapseButtonAlignment(pass, fail) {\n    const tolerance = 2;\n    let checked = 0;\n    let failed = false;\n    for (const card of this._nodeLayer.querySelectorAll(\'fox-ve-node-card\')) {\n      const title = card.querySelector(\'.fox-ve-node-card-title\');\n      const button = card.querySelector(\'.fox-ve-node-card-expand\');\n      if (!title || !button) continue;\n      checked++;\n      const titleY = centerY(title);\n      const buttonY = centerY(button);\n      const diff = buttonY - titleY;\n      if (Math.abs(diff) > tolerance) {\n        failed = true;\n        fail(\'collapse-button-alignment\', \'Collapse button is not vertically centered with the node title.\', {\n          nodeId: card.dataset.id,\n          titleCenterY: round(titleY),\n          buttonCenterY: round(buttonY),\n          difference: round(diff),\n          tolerance\n        }, [\n          \'Check button line-height, padding, and icon alignment.\',\n          \'Prefer display:grid; place-items:center; line-height:1 for compact caption buttons.\'\n        ]);\n      }\n    }\n    if (!failed) pass(\'collapse-button-alignment\', `Collapse buttons centered on ${checked} node card(s).`, { checked, tolerance });\n  }\n\n  _probeGhostClears(pass, fail) {\n    const d = this._ghost?.getAttribute(\'d\') || \'\';\n    const visible = this._ghost && !this._ghost.hidden && d.trim();\n    if (!this._connection && visible) {\n      fail(\'ghost-edge-clears\', \'Ghost edge is still visible after connection state ended.\', {\n        connection: this._connection,\n        hidden: this._ghost.hidden,\n        d\n      }, [\n        \'In the <connect/> finally block, clear connection, remove connection-mode, hide ghost, and remove svg.d.\',\n        \'Do not leave a stale ghost path after pointerup or pointercancel.\'\n      ]);\n      return;\n    }\n    pass(\'ghost-edge-clears\', \'Ghost edge is cleared when no connection is active.\', { hidden: this._ghost.hidden, d });\n  }\n\n  _probeEdgesMeetPortDots(pass, fail) {\n    const tolerance = 2;\n    let checked = 0;\n    let failed = false;\n    for (const edge of this._edges) {\n      const path = this._edgeLayer.querySelector(`.fox-ve-node-graph-edge[data-edge-id="${cssEscape(edge.id)}"]`);\n      if (!path) continue;\n      const parsed = parseEdgePath(path.getAttribute(\'d\'));\n      if (!parsed) continue;\n      const expectedStart = this._portDotWorld(edge.from.nodeId, edge.from.portId, \'output\');\n      const expectedEnd = this._portDotWorld(edge.to.nodeId, edge.to.portId, \'input\');\n      if (!expectedStart || !expectedEnd) continue;\n      checked++;\n      const startDiff = distance(parsed.start, expectedStart);\n      const endDiff = distance(parsed.end, expectedEnd);\n      if (startDiff > tolerance) {\n        failed = true;\n        fail(\'edge-start-port-center\', \'Cable start does not match the output port dot center in world space.\', {\n          edgeId: edge.id,\n          nodeId: edge.from.nodeId,\n          portId: edge.from.portId,\n          actual: roundPoint(parsed.start),\n          expected: roundPoint(expectedStart),\n          difference: round(startDiff),\n          tolerance\n        }, [\n          \'Check whether SVG path points are in viewport or world space.\',\n          \'Prefer measured DOM port dot centers over header/row constants.\',\n          \'Schedule draw-edges after node-card render and one settle frame.\'\n        ]);\n      }\n      if (endDiff > tolerance) {\n        failed = true;\n        fail(\'edge-end-port-center\', \'Cable end does not match the input port dot center in world space.\', {\n          edgeId: edge.id,\n          nodeId: edge.to.nodeId,\n          portId: edge.to.portId,\n          actual: roundPoint(parsed.end),\n          expected: roundPoint(expectedEnd),\n          difference: round(endDiff),\n          tolerance\n        }, [\n          \'Check input-side port dot measurement.\',\n          \'Check view transform symmetry between node layer and SVG edge layer.\'\n        ]);\n      }\n    }\n    if (!failed) {\n      pass(\'edge-port-center-alignment\', `All ${checked} cable endpoint(s) align with measured port dots.`, { checked, tolerance });\n    }\n  }\n\n  runBehaviorTests() {\n    const results = [];\n    const pass = (name, condition, detail = \'\') => results.push({ name, pass: Boolean(condition), detail });\n\n    const oldSnap = this.hasAttribute(\'snap-to-grid\');\n    const oldGrid = this.getAttribute(\'grid-size\');\n    const oldView = clone(this._view);\n    const oldNodes = clone(this._nodes);\n    const oldEdges = clone(this._edges);\n    const oldSelected = this._selected.slice();\n    const oldReadonly = this.readonly;\n\n    try {\n      this.removeAttribute(\'snap-to-grid\');\n      this._nodes = [{ id: \'a\', x: 100, y: 100, inputs: [], outputs: [{ id: \'out\' }] }];\n      this._selected = [\'a\'];\n      this._view = { panX: 0, panY: 0, zoom: 2 };\n      const updates = this._moveNodeStarts(this._positionsOf([\'a\']), { x: 20 / this._view.zoom, y: 10 / this._view.zoom });\n      pass(\'drag uses world delta under zoom\', updates[0].x === 110 && updates[0].y === 105, JSON.stringify(updates[0]));\n\n      this.setAttribute(\'snap-to-grid\', \'\');\n      this.setAttribute(\'grid-size\', \'24\');\n      const snapped = this._snapPoint({ x: 13, y: 13 });\n      pass(\'snap-to-grid rounds to grid-size\', snapped.x === 24 && snapped.y === 24, JSON.stringify(snapped));\n\n      pass(\'same-side port connection is invalid\', this._validConnection({ nodeId: \'a\', id: \'out\', side: \'output\' }, { nodeId: \'b\', id: \'out\', side: \'output\' }) === false);\n      pass(\'output-to-input port connection is valid\', this._validConnection({ nodeId: \'a\', id: \'out\', side: \'output\' }, { nodeId: \'b\', id: \'in\', side: \'input\' }) === true);\n\n      this.setAttribute(\'readonly\', \'\');\n      pass(\'readonly flag is visible to interactions\', this.readonly === true);\n    } finally {\n      this._nodes = oldNodes;\n      this._edges = oldEdges;\n      this._selected = oldSelected;\n      this._view = oldView;\n      if (oldSnap) this.setAttribute(\'snap-to-grid\', \'\'); else this.removeAttribute(\'snap-to-grid\');\n      if (oldGrid == null) this.removeAttribute(\'grid-size\'); else this.setAttribute(\'grid-size\', oldGrid);\n      if (oldReadonly) this.setAttribute(\'readonly\', \'\'); else this.removeAttribute(\'readonly\');\n      this.render();\n    }\n    return results;\n  }\n}\n\n';

function generateNodeEditorBridge(ir, diagnostics = [], options = {}) {
  return generateNodeEditorGraph(ir, diagnostics, options);
}

function generateNodeEditorGraph(ir, diagnostics = [], options = {}) {
  const manifest = generateManifest(ir, diagnostics);
  const implementationImport = options.nodeEditorImport || 'gizmo/node-editor';
  const diagnosticsLiteral = JSON.stringify(diagnostics, null, 2);
  const manifestLiteral = JSON.stringify(manifest, null, 2);
  const cardTag = findNodeCardTag(ir) || 'fox-ve-node-card';
  const tag = ir.tag || 'fox-ve-node-graph';
  return `${banner(ir)}
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
} from ${JSON.stringify(implementationImport)};

export const gizmoManifest = ${manifestLiteral};
export const gizmoDiagnostics = ${diagnosticsLiteral};
export const gizmoImplementation = 'generated:view+interactions+node-editor-support';

${NODE_EDITOR_GRAPH_CLASS}

// Generated lowering for <fox-ve-node-cable each="edges as edge"/>.
// The graph computes endpoint geometry; each cable Web Component owns its SVG group.
function ensureCableLayer(host) {
  if (host._cableLayer) return host._cableLayer;
  const layer = document.createElement('div');
  layer.className = 'fox-ve-node-graph-cables';
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
    let cable = cableLayer.querySelector('fox-ve-node-cable[data-edge-id="' + cssEscape(id) + '"]');
    if (!cable) {
      cable = document.createElement('fox-ve-node-cable');
      cable.dataset.edgeId = id;
      cable.setAttribute('edge-id', id);
      cable.setAttribute('svg-selector', '.fox-ve-node-graph-edge-layer');
      cableLayer.append(cable);
    }

    const from = this._portWorld(edge.from?.nodeId, edge.from?.portId, 'output');
    const to = this._portWorld(edge.to?.nodeId, edge.to?.portId, 'input');
    cable.from = this._probeBugMode && from ? { ...from, y: from.y + 8 } : from;
    cable.to = to;
    cable.toggleAttribute('missing', !(from && to));
    cable.render?.();
  }

  cableLayer.querySelectorAll('fox-ve-node-cable').forEach(cable => {
    if (!active.has(cable.dataset.edgeId || '')) cable.remove();
  });
};

FoxVeNodeGraph.gizmoManifest = gizmoManifest;
FoxVeNodeGraph.gizmoDiagnostics = gizmoDiagnostics;
FoxVeNodeGraph.gizmoSource = ${JSON.stringify(ir.source)};

export function defineFoxVeNodeGraph(tag = ${JSON.stringify(tag)}) {
  installNodeEditorStyles();
  if (!customElements.get(tag)) customElements.define(tag, FoxVeNodeGraph);
  return customElements.get(tag);
}

if (typeof customElements !== 'undefined') {
  defineFoxVeNodeGraph();
}

export default FoxVeNodeGraph;
`;
}


function generateNodeEditorCardComponent(ir, diagnostics = [], options = {}) {
  const manifest = generateManifest(ir, diagnostics);
  const implementationImport = options.nodeEditorImport || 'gizmo/node-editor';
  const manifestLiteral = JSON.stringify(manifest, null, 2);
  const diagnosticsLiteral = JSON.stringify(diagnostics, null, 2);
  const tag = ir.tag || 'fox-ve-node-card';
  return `${banner(ir)}
// Generated from <gizmo tag="fox-ve-node-card">.
// Humans write node-card.xml; this file is washed clean into an autonomous Web Component.

import { escapeAttr, escapeHtml, installNodeEditorStyles } from ${JSON.stringify(implementationImport)};

export const gizmoManifest = ${manifestLiteral};
export const gizmoDiagnostics = ${diagnosticsLiteral};

export class FoxVeNodeCard extends HTMLElement {
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
    this.classList.add('fox-ve-node-card-root');
    this.classList.toggle('is-selected', this.hasAttribute('selected'));
    this.classList.toggle('is-disabled', this.status === 'disabled');
    this.style.setProperty('--node-color', this.color);
    this.innerHTML = \
      '<div class="fox-ve-node-card-header">' +
      '<span class="fox-ve-node-card-status" data-status="' + escapeHtml(this.status) + '"></span>' +
      '<span class="fox-ve-node-card-title">' + escapeHtml(this.nodeLabel) + '</span>' +
      '<button type="button" class="fox-ve-node-card-expand" aria-label="Toggle node details" aria-expanded="' + (this.expanded ? 'true' : 'false') + '"><i aria-hidden="true">⌄</i></button>' +
      '</div>' +
      '<div class="fox-ve-node-card-port-grid">' +
      '<div class="fox-ve-node-card-ports fox-ve-node-card-inputs">' + this._inputs.map((port, index) => this._portHtml(port, index, 'input')).join('') + '</div>' +
      '<div class="fox-ve-node-card-ports fox-ve-node-card-outputs">' + this._outputs.map((port, index) => this._portHtml(port, index, 'output')).join('') + '</div>' +
      '</div>' +
      '<div class="fox-ve-node-card-details" ' + (this.expanded ? '' : 'hidden') + '>Ready · ' + escapeHtml(this.status) + '</div>';
    this._installViewEvents();
  }

  _installViewEvents() {
    this.querySelector('.fox-ve-node-card-expand')?.addEventListener('click', event => {
      event.stopPropagation();
      this.toggleAttribute('expanded', !this.expanded);
      this.dispatchEvent(new CustomEvent('fox-node-expand', { bubbles: true, detail: { expanded: this.expanded } }));
    });
    this.querySelectorAll('.fox-ve-node-card-port').forEach(portEl => {
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
    const core = side === 'output'
      ? '<span class="fox-ve-node-card-port-label">' + escapeHtml(label) + '</span><span class="fox-ve-node-card-port-dot"></span>'
      : '<span class="fox-ve-node-card-port-dot"></span><span class="fox-ve-node-card-port-label">' + escapeHtml(label) + '</span>';
    return '<button type="button" class="fox-ve-node-card-port" data-port-id="' + escapeAttr(id) + '" data-port-side="' + side + '" data-port-type="' + escapeAttr(type) + '" aria-label="' + side + ' ' + escapeAttr(label) + '">' + core + '</button>';
  }

  _portDetail(portEl) {
    return {
      id: portEl.dataset.portId || '',
      label: portEl.querySelector('.fox-ve-node-card-port-label')?.textContent || portEl.dataset.portId || '',
      type: portEl.dataset.portType || '',
      side: portEl.dataset.portSide || ''
    };
  }
}

FoxVeNodeCard.gizmoManifest = gizmoManifest;
FoxVeNodeCard.gizmoDiagnostics = gizmoDiagnostics;

export function defineFoxVeNodeCard(tag = ${JSON.stringify(tag)}) {
  installNodeEditorStyles();
  if (!customElements.get(tag)) customElements.define(tag, FoxVeNodeCard);
  return customElements.get(tag);
}

if (typeof customElements !== 'undefined') defineFoxVeNodeCard();
export default FoxVeNodeCard;
`;
}

function generateNodeEditorCableComponent(ir, diagnostics = [], options = {}) {
  const manifest = generateManifest(ir, diagnostics);
  const implementationImport = options.nodeEditorImport || 'gizmo/node-editor';
  const manifestLiteral = JSON.stringify(manifest, null, 2);
  const diagnosticsLiteral = JSON.stringify(diagnostics, null, 2);
  const tag = ir.tag || 'fox-ve-node-cable';
  return `${banner(ir)}
// Generated from <gizmo tag="fox-ve-node-cable">.
// The cable is a Web Component that draws its own SVG group into a shared SVG layer.

import { SVG_NS, edgePath, installNodeEditorStyles } from ${JSON.stringify(implementationImport)};

export const gizmoManifest = ${manifestLiteral};
export const gizmoDiagnostics = ${diagnosticsLiteral};

export class FoxVeNodeCable extends HTMLElement {
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
  get svgSelector() { return this.getAttribute('svg-selector') || '.fox-ve-node-graph-edge-layer'; }
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
      group.setAttribute('class', 'fox-ve-node-graph-edge-group');
      group.dataset.edgeId = id;
      const hit = document.createElementNS(SVG_NS, 'path');
      hit.setAttribute('class', 'fox-ve-node-graph-edge-hit');
      hit.dataset.edgeId = id;
      const line = document.createElementNS(SVG_NS, 'path');
      line.setAttribute('class', 'fox-ve-node-graph-edge');
      line.dataset.edgeId = id;
      group.append(hit, line);
      layer.append(group);
      this._group = group;
    }
    group.dataset.edgeId = id;
    group.querySelectorAll('path').forEach(path => { path.dataset.edgeId = id; });
    group.classList.toggle('is-missing-endpoint', !(this._from && this._to) || this.hasAttribute('missing'));
    const d = this._from && this._to ? edgePath(this._from, this._to) : '';
    group.querySelector('.fox-ve-node-graph-edge-hit')?.setAttribute('d', d);
    group.querySelector('.fox-ve-node-graph-edge')?.setAttribute('d', d);
    this.dispatchEvent(new CustomEvent('fox-edge-render', { bubbles: true, detail: { id } }));
  }

  removeFromSharedSvg() {
    this._group?.remove();
    this._group = null;
  }

  _findLayer() {
    const host = this.closest('fox-ve-node-graph') || this.getRootNode();
    return host?.querySelector?.(this.svgSelector) || document.querySelector(this.svgSelector);
  }
}

function pointOrNull(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

FoxVeNodeCable.gizmoManifest = gizmoManifest;
FoxVeNodeCable.gizmoDiagnostics = gizmoDiagnostics;

export function defineFoxVeNodeCable(tag = ${JSON.stringify(tag)}) {
  installNodeEditorStyles();
  if (!customElements.get(tag)) customElements.define(tag, FoxVeNodeCable);
  return customElements.get(tag);
}

if (typeof customElements !== 'undefined') defineFoxVeNodeCable();
export default FoxVeNodeCable;
`;
}

function generateStandaloneSkeleton(ir, diagnostics = [], { manifestImport = null } = {}) {
  const className = toClassName(ir.tag || ir.name || 'gizmo-element');
  const observed = ir.props.filter(prop => prop.reflect || isAttributeProp(prop)).map(prop => prop.name);
  const propDefs = ir.props;
  const viewSource = ir.view ? serializeXml(ir.view.ast, { indent: '  ' }) : '<view/>';
  const diagnosticsLiteral = JSON.stringify(diagnostics, null, 2);
  const manifestExpr = manifestImport ? `manifest` : JSON.stringify(generateManifest(ir, diagnostics), null, 2);
  const importManifest = manifestImport ? `import manifest from ${JSON.stringify(manifestImport)} assert { type: 'json' };\n` : '';

  return `${banner(ir)}
${importManifest}

export const gizmoManifest = ${manifestExpr};
export const gizmoDiagnostics = ${diagnosticsLiteral};

export class ${className} extends HTMLElement {
  static observedAttributes = ${JSON.stringify(observed)};

  constructor() {
    super();
    this.__gizmoProps = Object.create(null);
${propDefs.map(prop => `    this.__gizmoProps[${JSON.stringify(prop.field)}] = ${defaultExpression(prop)};`).join('\n')}
  }

  connectedCallback() {
    this.__upgradeProperties();
    this.__syncAttributesToProps();
    this.render();
  }

  attributeChangedCallback() {
    this.__syncAttributesToProps();
    this.render();
  }

${propDefs.map(prop => propertyAccessor(prop)).join('\n\n')}

  render() {
    if (this.__gizmoRendered) return;
    this.__gizmoRendered = true;
    this.dataset.gizmoCompiled = 'true';
    this.dataset.gizmoTag = ${JSON.stringify(ir.tag)};
    this.innerHTML = \`<pre class="gizmo-compiled-placeholder"></pre>\`;
    const pre = this.querySelector('pre');
    pre.textContent = [
      ${JSON.stringify(ir.name || ir.tag)},
      'compiled from Gizmosis v0.5',
      '',
      'Standalone skeleton generated:',
      '- prop/attribute contract',
      '- manifest IR',
      '- diagnostics',
      '- view/interactions metadata'
    ].join('\\n');
  }

  __upgradeProperties() {
${propDefs.map(prop => `    if (Object.prototype.hasOwnProperty.call(this, ${JSON.stringify(prop.field)})) { const value = this[${JSON.stringify(prop.field)}]; delete this[${JSON.stringify(prop.field)}]; this[${JSON.stringify(prop.field)}] = value; }`).join('\n')}
  }

  __syncAttributesToProps() {
${propDefs.map(prop => attributeSync(prop)).join('\n')}
  }

  __reflectAttribute(name, value, kind) {
    if (kind === 'boolean') {
      this.toggleAttribute(name, Boolean(value));
      return;
    }
    if (value == null || value === false) this.removeAttribute(name);
    else if (kind === 'list' || kind === 'record') this.setAttribute(name, JSON.stringify(value));
    else this.setAttribute(name, String(value));
  }

  __emit(name, detail = {}) {
    return this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
  }
}

export function define${className}(tag = ${JSON.stringify(ir.tag)}) {
  if (!customElements.get(tag)) customElements.define(tag, ${className});
  return ${className};
}

if (typeof customElements !== 'undefined' && ${JSON.stringify(Boolean(ir.tag))}) {
  define${className}();
}

export default ${className};

export const gizmoViewSource = ${JSON.stringify(viewSource)};
`;
}

export function generateDts(ir, options = {}) {
  const className = usesNodeEditorImplementation(ir) ? toClassName(`${ir.tag || ir.name}-compiled`) : toClassName(ir.tag || ir.name || 'gizmo-element');
  const base = 'HTMLElement';
  const importLine = '';
  return `${banner(ir)}
${importLine}export interface ${className}Props {
${ir.props.map(prop => `  ${safeField(prop.field)}${prop.default === undefined ? '?' : ''}: ${tsType(prop)};`).join('\n')}
}

export declare const gizmoManifest: Record<string, unknown>;
export declare const gizmoDiagnostics: Array<Record<string, unknown>>;
export declare class ${className} extends ${base} {
${ir.props.map(prop => `  ${safeField(prop.field)}: ${tsType(prop)};`).join('\n')}
}

export declare function define${className}(tag?: string): CustomElementConstructor | typeof ${className};
export default ${className};
`;
}


function findNodeCardTag(ir) {
  const source = ir.view?.source || (ir.view?.ast ? serializeXml(ir.view.ast, { indent: '' }) : '');
  const match = String(source).match(/<([a-z][a-z0-9-]*node-card\b|fox-ve-node-card\b)/i);
  return match?.[1] || null;
}

function usesNodeEditorImplementation(ir) {
  return ir.tag === 'fox-ve-node-graph' && ir.uses.some(use => use.library === 'gizmo/node-editor');
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'ast' || key === 'root' || key === 'children') continue;
    if (typeof item === 'function') continue;
    out[key] = sanitize(item);
  }
  return out;
}

function banner(ir) {
  return `// Generated by Gizmosis compiler v0.5\n// Source: ${ir.source}\n// Component: ${ir.name || '(unnamed)'} <${ir.tag}>\n// Do not edit generated output by hand.`;
}

function toClassName(value) {
  const raw = String(value || 'gizmo-element').replace(/[^A-Za-z0-9]+/g, ' ').trim();
  const name = raw.split(/\s+/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('') || 'GizmoElement';
  return /^[0-9]/.test(name) ? `Gizmo${name}` : name;
}

function isAttributeProp(prop) {
  return !['list', 'record'].includes(prop.kind) || prop.attrFormat;
}

function defaultExpression(prop) {
  if (prop.default !== undefined) return literalForKind(prop.default, prop.kind);
  if (prop.kind === 'boolean') return 'false';
  if (prop.kind === 'number') return '0';
  if (prop.kind === 'list') return '[]';
  if (prop.kind === 'record') return '{}';
  if (prop.kind === 'maybe') return 'null';
  return "''";
}

function literalForKind(value, kind) {
  if (kind === 'boolean') return value === 'true' ? 'true' : 'false';
  if (kind === 'number') return Number.isFinite(Number(value)) ? String(Number(value)) : '0';
  if (kind === 'list' || kind === 'record') {
    try { return JSON.stringify(JSON.parse(value)); } catch { return kind === 'list' ? '[]' : '{}'; }
  }
  return JSON.stringify(String(value));
}

function propertyAccessor(prop) {
  const field = safeField(prop.field);
  return `  get ${field}() { return this.__gizmoProps[${JSON.stringify(prop.field)}]; }\n  set ${field}(value) {\n    this.__gizmoProps[${JSON.stringify(prop.field)}] = ${coerceExpression('value', prop)};\n    ${prop.reflect ? `this.__reflectAttribute(${JSON.stringify(prop.name)}, this.__gizmoProps[${JSON.stringify(prop.field)}], ${JSON.stringify(prop.kind)});` : ''}\n    this.render();\n  }`;
}

function attributeSync(prop) {
  if (!isAttributeProp(prop)) return `    // ${prop.name}: property-only ${prop.kind}`;
  const field = JSON.stringify(prop.field);
  const attr = JSON.stringify(prop.name);
  if (prop.kind === 'boolean') return `    this.__gizmoProps[${field}] = this.hasAttribute(${attr});`;
  if (prop.kind === 'number') return `    if (this.hasAttribute(${attr})) this.__gizmoProps[${field}] = Number(this.getAttribute(${attr})) || 0;`;
  if (prop.kind === 'list' || prop.kind === 'record') return `    if (this.hasAttribute(${attr})) { try { this.__gizmoProps[${field}] = JSON.parse(this.getAttribute(${attr})); } catch { this.__gizmoProps[${field}] = ${prop.kind === 'list' ? '[]' : '{}'}; } }`;
  return `    if (this.hasAttribute(${attr})) this.__gizmoProps[${field}] = this.getAttribute(${attr}) || '';`;
}

function coerceExpression(value, prop) {
  if (prop.kind === 'boolean') return `Boolean(${value})`;
  if (prop.kind === 'number') return `Number(${value}) || 0`;
  if (prop.kind === 'list') return `Array.isArray(${value}) ? ${value}.map(item => typeof item === 'object' && item ? { ...item } : item) : []`;
  if (prop.kind === 'record') return `${value} && typeof ${value} === 'object' ? { ...${value} } : {}`;
  if (prop.kind === 'maybe') return `${value} ?? null`;
  return `String(${value} ?? '')`;
}

function safeField(value) {
  const field = String(value || 'value').replace(/[^A-Za-z0-9_$]/g, '_');
  return /^[A-Za-z_$]/.test(field) ? field : `_${field}`;
}

function tsType(prop) {
  if (prop.kind === 'number') return 'number';
  if (prop.kind === 'boolean') return 'boolean';
  if (prop.kind === 'list') return `${prop.of || 'unknown'}[]`;
  if (prop.kind === 'record') return prop.of || 'Record<string, unknown>';
  if (prop.kind === 'maybe') return `${prop.of || 'unknown'} | null`;
  if (prop.kind === 'choice' && prop.values.length) return prop.values.map(value => JSON.stringify(value)).join(' | ');
  return 'string';
}
