# Gizmosis Compiler

The compiler is a no-dependency Node.js tool for `.gizmo.xml` files.

## Commands

```bash
giz
giz project [target] --file gizmosis.xml
giz <file.gizmo.xml> -o <file.wc.js>
giz --prefix gizmo <file.gizmo.xml> -o <file.wc.js>
giz --warn all extra error <file.gizmo.xml> -o <file.wc.js>
node src/compiler/cli.js check <file.gizmo.xml>
node src/compiler/cli.js inspect <file.gizmo.xml>
node src/compiler/cli.js compile <file.gizmo.xml> \
  --out <file.generated.js> \
  --manifest <file.manifest.json> \
  --dts <file.generated.d.ts> \
  --package-generator <library=module> \
  --package-import <library=module> \
  --prefix <prefix>
```

For the bundled node-editor example:

```bash
npm run compile
cd example/node-editor && giz
```

`giz` with no arguments searches upward from the current directory for `gizmosis.xml` and runs the project's default target. Project files support `<project/>`, `<property/>`, `<target/>`, target dependencies, `<giz/>`, `<mkdir/>`, `<delete/>`, `<copy/>`, and `<render-prefix/>`.

The `--package-generator` option loads package-owned behavior lowering and validation metadata for components that use:

```xml
<use library="gizmo/node-editor"/>
```

The `--package-import` option controls the generated browser import specifier for that same package.

The compiler default project prefix is `go`. `--prefix gizmo` rewrites generated prefixable tags, class selectors, stylesheet templates, manifests, and package runtime config from the source prefix to `gizmo-*`. `--css-prefix` remains a compatibility alias for older scripts.

Standalone generated components mount lowered `<view/>` markup once and patch cached DOM targets for text, attributes, boolean attributes, and repeat anchors. This is the baseline for richer keyed DOM update plans.

`--warn error` makes warning diagnostics fail the command. `--warn all` and `--warn extra` are accepted warning-policy modes for stricter compile workflows.
