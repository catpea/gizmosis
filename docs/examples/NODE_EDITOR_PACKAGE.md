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

## Support library rule

`example/node-editor/src/library/` exports runtime helper functions through `index.js`; those runtime helpers must not contain `node-card.js`, `node-cable.js`, or `node-graph.js` component implementations. Build-time package behavior generator assets may live under `example/node-editor/src/library/compiler/` because the node-editor package owns graph/card/cable behavior. View markup remains in each XML `<view/>` and is lowered by compiler infrastructure. Package generator assets must not be copied into `dist/library/` and must not live under the general compiler.
