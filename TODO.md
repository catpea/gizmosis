# TODO

## Current status

The v0.5 package now demonstrates the intended compiler workflow:

- `node-card.xml` compiles to `fox-ve-node-card`.
- `node-cable.xml` compiles to `fox-ve-node-cable`.
- `node-graph.xml` compiles to `fox-ve-node-graph`.
- The node editor harness imports only from `dist/`.
- The support library is selector-free and component-neutral.
- The process library documents mandatory agent procedures.

## Next compiler milestones

1. Replace the graph-specific generator template with a general lowering pipeline for arbitrary `<view/>` trees.
2. Lower `<actions/>` into generated methods instead of template-specific methods.
3. Lower `<drag/>`, `<pan/>`, `<zoom/>`, `<resize/>`, and package `<connect/>` through reusable runtime recognizers configured by XML.
4. Generate probe runtime code directly from `<dev><probes/></dev>` instead of relying on the node-editor template.
5. Add source-map-like diagnostics from generated JS back to XML node paths.
6. Add browser automation tests for the example harness.

## Non-goals for v0.5

- AI chat panel.
- Server runtime.
- Framework dependency.
- Bundler dependency.
