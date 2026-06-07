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

`example/node-editor/src/library/` may provide helper functions only. It must not contain `node-card.js`, `node-cable.js`, or `node-graph.js` component implementations.
