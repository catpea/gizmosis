# Node Editor Package Example

The node editor example demonstrates a package boundary:

```xml
<use library="gizmo/node-editor"/>
```

The package provides reusable helpers and package vocabulary, but it does not hide Web Component implementations.

## Generated Web Components

- `example/node-editor/src/node-card.xml` → `dist/node-card.generated.js`
- `example/node-editor/src/node-cable.xml` → `dist/node-cable.generated.js`
- `example/node-editor/src/node-graph.xml` → `dist/node-graph.generated.js`

The default generated tag prefix is `go`, so the bundled example emits `go-node-card`, `go-node-cable`, and `go-node-graph`. Use `giz --prefix <prefix> ...` to change that conflict-avoidance prefix for generated tags, CSS selectors, manifests, and package runtime config.

The multi-file build is declared in `example/node-editor/gizmosis.xml`. Running `giz` from `example/node-editor/` executes the default project target and compiles card, cable, and graph in dependency order after preparing `dist/`.

## Support library rule

`example/node-editor/src/library/` exports runtime helper functions through `index.js`; those runtime helpers must not contain `node-card.js`, `node-cable.js`, or `node-graph.js` component implementations. Descriptor-driven VPL mechanics such as `graph-runtime.js` are allowed when generated code provides concrete tags, selectors, events, and view HTML. Build-time package shell generator assets may live under `example/node-editor/src/library/compiler/` because the node-editor package owns graph/card/cable shells. View markup remains in each XML `<view/>` and is lowered by compiler infrastructure. Package generator assets must not be copied into `dist/library/` and must not live under the general compiler. Package source CSS uses `{{prefix}}` and `{{css-prefix}}` placeholders and is rendered during the build.
