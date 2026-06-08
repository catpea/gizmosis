# Gizmo node-editor support library

This directory contains the node-editor package support code.

Runtime files exported through `index.js` are a **support library**, not an implementation escape hatch. They must not define `go-node-graph`, `go-node-card`, or `go-node-cable`. Those Web Components are generated from:

- `../node-graph.xml`
- `../node-card.xml`
- `../node-cable.xml`

Runtime support files may contain only reusable, selector-configured mechanics:

- constants
- geometry helpers
- SVG path helpers
- frame/listener/observer helpers
- stylesheet installation
- descriptor-driven VPL graph mechanics that receive tags, selectors, events, and view HTML from generated code

The `compiler/` subdirectory is different: it is build-time package generator source for this example package. It may contain thin generated-shell templates because the package owns those concepts. It must not contain a hand-written graph class or duplicate component view markup in parallel HTML files; markup comes from the XML `<view/>` and the generic compiler view lowerer. It is not copied into `dist/library/` and it is not browser runtime support code.

If a runtime file starts containing concrete element names, project-specific prefixes, custom element definitions, or fixed selectors that are not passed through config, move that logic into a `<gizmo/>` source file or the package generator and regenerate.
