# Tutorial: Node Editor from Three Gizmo Components

This tutorial explains why the example is split into three Web Components.

## Components

1. `node-card.xml` declares `go-node-card`.
   - Owns caption, status, collapse button, input/output port rows, and port events.
2. `node-cable.xml` declares `go-node-cable`.
   - Owns one SVG cable group in a shared SVG layer.
3. `node-graph.xml` declares `go-node-graph`.
   - Owns graph state, pan/zoom, node dragging, connection gestures, probes, fixtures, and tests.

## Compile

```bash
npm run compile
npm run check
npm test
```

## Run demo

```bash
npm run demo
```

Open `example/node-editor/index.html`. The harness imports only from `dist/` and shows the generated XML sources.

## Rule

If a component has its own public tag and lifecycle, it deserves its own `.xml` file.
