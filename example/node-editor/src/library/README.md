# Gizmo node-editor support library

This is a **support library**, not an implementation escape hatch.

It must not define `fox-ve-node-graph`, `fox-ve-node-card`, or `fox-ve-node-cable`.
Those Web Components are generated from:

- `../node-graph.xml`
- `../node-card.xml`
- `../node-cable.xml`

This library may contain only reusable, selector-free mechanics:

- constants
- geometry helpers
- SVG path helpers
- frame/listener/observer helpers
- stylesheet installation

If a file starts containing concrete element names, selectors, graph event wiring, or component structure, move that logic into a `<gizmo/>` source file and regenerate.
