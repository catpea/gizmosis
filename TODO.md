# TODO

## Current status

The v0.5 package now demonstrates the intended compiler workflow:

- `node-card.xml` compiles to `go-node-card`.
- `node-cable.xml` compiles to `go-node-cable`.
- `node-graph.xml` compiles to `go-node-graph`.
- The node editor harness imports only from `dist/`.
- The support library is selector-configured and contains no generated custom element implementations.
- Package-specific node-editor behavior lowering lives under `example/node-editor/src/library/compiler/`, not in the general compiler.
- Package-specific interaction validation metadata lives with the package generator, not in core compiler validation.
- Node-editor markup is lowered from each component's XML `<view/>`; there are no duplicate package HTML templates, and `dist/library/` ships only runtime support helpers.
- XML view classes use `{{css-prefix}}` for project-level class prefixing.
- Project prefixing is compiler-level: default prefix is `go`, and `giz --prefix gizmo ...` rewrites generated tags, class selectors, stylesheet templates, manifests, and package runtime config to `gizmo-*`.
- Standalone components now mount lowered `<view/>` HTML once and patch cached text, attribute, boolean-attribute, and repeat-anchor targets instead of replacing the whole DOM on every property update.
- `gizmosis.xml` project files provide lightweight Ant-like builds with `<project/>`, `<property/>`, `<target/>`, dependencies, `<giz/>`, `<mkdir/>`, `<delete/>`, `<copy/>`, and `<render-prefix/>`; `giz` with no arguments runs the default target from the nearest project file.
- The former `graph-class.js` escape hatch is removed. The generated graph shell delegates to descriptor-driven VPL runtime mechanics from `example/node-editor/src/library/graph-runtime.js`.
- Tests reject compiler templates, duplicate package HTML templates, runtime support custom element definitions, graph-class-style generator files, and project `src/` JavaScript that defines Web Components to bypass XML.
- The CLI supports direct compile usage: `giz hello.gizmo.xml -o hello.wc.js`, plus warning policies such as `--warn all extra error`.
- The process library documents mandatory agent procedures.

## Next compiler milestones

1. Expand generic `<view/>` lowering from cached standalone targets into full DOM update plans with keyed repeat diffing, event listener plans, ref plans, and package-reusable update helpers.
2. Lower `<actions/>` into generated methods instead of template-specific methods.
3. Split the descriptor-driven graph runtime into reusable `<drag/>`, `<pan/>`, `<zoom/>`, `<resize/>`, and package `<connect/>` recognizers configured directly by compiled XML descriptors.
4. Generate probe runtime code directly from `<dev><probes/></dev>` instead of relying on the node-editor template.
5. Add source-map-like diagnostics from generated JS back to XML node paths.
6. Add browser automation tests for the example harness.
7. Extend prefix projection to other collision-prone generated names where appropriate, such as package event names, without breaking existing component contracts.
8. Extend `gizmosis.xml` with incremental file checks, richer filesets, and target descriptions.
