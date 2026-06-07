# src layout

This directory contains only reusable Gizmo XML package code.

- `compiler/` contains the no-dependency `.gizmo.xml` parser, IR builder, validator, generator, and CLI.
- `core/` contains small DOM/XML helpers used by the prototype runtime.
- `runtime/` contains reusable diagnostics and frame scheduling helpers.

Example-specific code does not live here. The reference node-editor example lives in:

```text
example/node-editor/
```

That example has its own `src/` and `dist/` directories.
