# Gizmosis

Gizmosis is an XML-first compiler for modern Web Components.

`<gizmo/>` creates Web Components from declarative XML. The compiler washes away the declarative source and emits clean ESM components for the browser. Humans should work in XML contracts, views, interactions, probes, and tests; imperative JavaScript is generated because machines are now better at repetitive browser plumbing.

This project deliberately begins with a Visual Programming Language node editor because VPLs stress the hard parts: cards, cables, pan/zoom, drag, connection gestures, geometry, SVG, probes, and cross-browser diagnostics.

## Source of truth

The node editor example is split into real Web Components:

- `example/node-editor/src/node-card.xml` → `go-node-card`
- `example/node-editor/src/node-cable.xml` → `go-node-cable`
- `example/node-editor/src/node-graph.xml` → `go-node-graph`

`example/node-editor/index.html` and `example/node-editor/styles.css` are only the demo harness. Web Components are not web applications.


## Full language memory

`features.json` is the canonical catalog of supported Gizmosis features. The compiler also exports the same catalog from `src/compiler/features.js` and the process library mirrors it at `process-library/features.json` so local agents can search without guessing.

New Gizmos should use the contract-first component capsule:

```xml
<gizmo>
  <contract/>
  <requires/>
  <model/>
  <view/>
  <behavior/>
  <effects/>
  <resources/>
  <dev/>
</gizmo>
```

Use compatibility root sections only when converting older examples.

## Agent procedure library

AI agents must read `process-library/README.md` before modifying this project. The procedure library records how to author, split, compile, probe, verify, and translate existing JavaScript Web Components into `<gizmo/>` XML so agents do not invent shortcuts under context pressure.

The library is searchable:

```bash
grep -R "createElement" process-library
grep -R "ResizeObserver" process-library
grep -R "escape hatch" process-library
```

Structured routing lives in:

```text
process-library/solutions/search-index.json
```

The main JavaScript translation reference is:

```text
process-library/reference/js-to-gizmo-feature-map.md
```

## Directory Layout

```text
src/                         reusable Gizmosis package code
  compiler/                  no-dependency XML compiler CLI/API
  core/                      small DOM/XML helpers
  runtime/                   diagnostics and frame helpers

example/node-editor/         complete example application
  index.html                 example page
  src/app/                   demo harness source
  src/library/               selector-configured node-editor support library
  src/node-graph.xml          canonical single XML source of truth
  dist/                      standalone ESM distribution: generated files, copied library, copied app, CSS, XML copy

docs/                        language, examples, and tutorial docs
test/                        Node-based unit/integration tests
```

The node-editor code is intentionally **not** kept in root `src/` because it is an example package that demonstrates `<use library="gizmo/node-editor"/>` and node-editor luxury tags such as `<connect/>`.

## Run the Demo

No npm dependencies are required.

```bash
npm run demo
```

Open:

```text
http://localhost:8080/
http://localhost:8080/example/node-editor/
```

## Compile the Node Editor Example

```bash
npm run compile
```

The example build is declared in:

```text
example/node-editor/gizmosis.xml
```

From the example directory, the default project target can also be run with no arguments:

```bash
cd example/node-editor
giz
```

The project file reads:

```text
example/node-editor/src/node-graph.xml
```

and writes:

```text
example/node-editor/dist/node-graph.generated.js
example/node-editor/dist/node-graph.manifest.json
example/node-editor/dist/node-graph.generated.d.ts
```

Direct CLI usage:

```bash
giz project --file example/node-editor/gizmosis.xml
giz hello.gizmo.xml -o hello.wc.js
giz --prefix gizmo hello.gizmo.xml -o hello.wc.js
giz --warn all extra error hello.gizmo.xml -o hello.wc.js
```

Equivalent direct Node usage:

```bash
node src/compiler/cli.js compile example/node-editor/src/node-graph.xml \
  --out example/node-editor/dist/node-graph.generated.js \
  --manifest example/node-editor/dist/node-graph.manifest.json \
  --dts example/node-editor/dist/node-graph.generated.d.ts \
  --package-generator gizmo/node-editor=./example/node-editor/src/library/compiler/index.js \
  --package-import gizmo/node-editor=gizmo/node-editor \
  --prefix go
```

## Check and Test

```bash
npm run check
npm test
```

`npm run check` syntax-checks the package, the example, generated files, and canonical XML. `npm test` recompiles the node graph, validates the manifest, verifies the `gizmo/node-editor` boundary, and scans project `src/` JavaScript for XML-bypassing Web Component implementations.

## Compiler Status

The compiler parses XML, builds IR, validates it, lowers `<view/>` markup through generic compiler infrastructure, and emits JS, manifest JSON, and `.d.ts`. Standalone components mount lowered view HTML once and patch cached DOM binding targets for text, attributes, boolean attributes, and repeat anchors. Package-specific shell generation and package interaction validation are supplied through explicit package generators, such as `gizmo/node-editor=./example/node-editor/src/library/compiler/index.js`. For `<use library="gizmo/node-editor"/>`, generated output imports the `gizmo/node-editor` runtime support package for generic geometry, stylesheet, and descriptor-driven VPL mechanics. The generated file owns the concrete graph Web Component, element names, refs, selectors, events, and runtime config. The example page maps `gizmo/node-editor` to `./dist/library/index.js`, so the browser distribution is self-contained.

## v0.5 Highlight: Development Probes

```xml
<dev>
  <probes>
    <probe/>
    <layout-probe/>
  </probes>
</dev>
```

A probe is an application-layer diagnostic. It measures rendered DOM reality and reports semantic UI failures, such as stale ghost edges or cables that do not start at the measured center of a port dot.

## Package Exports

```js
import { compileGizmo } from 'gizmosis/compiler';
import { createFrameScheduler } from 'gizmosis/runtime';
```

## Lowering Model

In Gizmosis, “lowering” means turning a high-level XML construct into executable JavaScript.

- View lowering turns `<view>`, `{bindings}`, `each`, `key`, `class.*`, `style.*`, `svg.*`, `bind.*`, and `on.*` into generated static markup, repeat fragments, and binding metadata. Standalone output now mounts the lowered view once and patches cached targets; keyed repeat diffing, event listener plans, and reusable DOM patch helpers are the next expansion of this lowerer.
- Interaction lowering turns `<drag>`, `<pan>`, `<zoom>`, `<resize>`, and package tags such as `<connect/>` into generated listener wiring plus calls to generic support helpers.
- Runtime support libraries must not contain concrete component definitions or hardcoded project selectors. Package compiler generators may live beside an example package under `src/library/compiler/`; they are build-time source for thin generated shells and package validation, not browser runtime escape hatches.

This keeps the XML as the source of truth and prevents `src/library/` from becoming an escape hatch.
