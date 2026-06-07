# Node Editor Example

This example intentionally has one canonical XML source file:

```text
src/node-graph.xml
```

Everything needed by the browser demo is copied or generated into:

```text
dist/
```

The demo harness is `index.html`. It uses an import map and loads only ESM modules from `dist/`, plus its own minimal `styles.css`.

```html
<script type="importmap">
  {
    "imports": {
      "gizmo/node-graph": "./dist/node-graph.generated.js",
      "gizmo/node-editor": "./dist/library/index.js"
    }
  }
</script>
```

`dist/node-graph.css` is loaded by the node-editor Web Component library itself, not by the demo harness.

Rebuild the example from the repository root:

```bash
npm run compile
```
