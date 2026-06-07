# Gizmo node-editor support library

This directory contains the node-editor package support code.

Runtime files exported through `index.js` are a **support library**, not an implementation escape hatch. They must not define `fox-ve-node-graph`, `fox-ve-node-card`, or `fox-ve-node-cable`. Those Web Components are generated from:

- `../node-graph.xml`
- `../node-card.xml`
- `../node-cable.xml`

Runtime support files may contain only reusable, selector-free mechanics:

- constants
- geometry helpers
- SVG path helpers
- frame/listener/observer helpers
- stylesheet installation

The `compiler/` subdirectory is different: it is build-time package generator source for this example package. It may contain node-editor graph/card/cable behavior lowering templates because the package owns those concepts. It must not duplicate component view markup in parallel HTML files; markup comes from the XML `<view/>` and the generic compiler view lowerer. It is not copied into `dist/library/` and it is not browser runtime support code.

If a runtime file starts containing concrete element names, selectors, graph event wiring, or component structure, move that logic into a `<gizmo/>` source file or the package generator and regenerate.
