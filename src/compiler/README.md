# Gizmosis Compiler

The compiler is a no-dependency Node.js tool for `.gizmo.xml` files.

## Commands

```bash
node src/compiler/cli.js check <file.gizmo.xml>
node src/compiler/cli.js inspect <file.gizmo.xml>
node src/compiler/cli.js compile <file.gizmo.xml> \
  --out <file.generated.js> \
  --manifest <file.manifest.json> \
  --dts <file.generated.d.ts>
```

For the bundled node-editor example:

```bash
npm run compile
```

The `--node-editor-import` option controls the generated import for components that use:

```xml
<use library="gizmo/node-editor"/>
```
