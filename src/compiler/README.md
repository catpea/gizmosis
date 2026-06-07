# Gizmosis Compiler

The compiler is a no-dependency Node.js tool for `.gizmo.xml` files.

## Commands

```bash
node src/compiler/cli.js check <file.gizmo.xml>
node src/compiler/cli.js inspect <file.gizmo.xml>
node src/compiler/cli.js compile <file.gizmo.xml> \
  --out <file.generated.js> \
  --manifest <file.manifest.json> \
  --dts <file.generated.d.ts> \
  --package-generator <library=module> \
  --package-import <library=module>
```

For the bundled node-editor example:

```bash
npm run compile
```

The `--package-generator` option loads package-owned behavior lowering and validation metadata for components that use:

```xml
<use library="gizmo/node-editor"/>
```

The `--package-import` option controls the generated browser import specifier for that same package.
