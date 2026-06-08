# Procedure: Prevent Escape Hatches

## Purpose

Stop agents from hiding imperative Web Component implementations in support libraries.

## Definition

An escape hatch is code that should be generated from `<gizmo/>` but is instead hand-written and hidden in JavaScript.

## Steps

1. Read `reference/escape-hatch-smells.md`.
2. Inspect support libraries for `customElements.define`, `extends HTMLElement`, hardcoded component selectors, or hidden implementation classes.
3. Inspect each project `src/` directory for JavaScript files that define Web Components instead of using XML.
4. Inspect generated files for imports from `../src/`.
5. Inspect XML to ensure it actually contains the view, interactions, events, and probes.
6. Move component-specific code from support libraries into XML or compiler lowering.
7. Keep only reusable, descriptor-configured mechanics in support libraries.
8. Add tests that fail if the escape hatch returns.
9. Keep package-specific generated component JavaScript in package-owned `.js` template assets. Component view markup should come from XML `<view/>` lowering, not package or compiler HTML blobs.

## Good support library examples

- `createFrameScheduler(name, callback)`.
- `edgePath(from, to)` when parameterized and reusable.
- `installStylesheet(url)`.
- `createPointerDragRecognizer(options)` when selectors/callbacks come from generated code.
- `createNodeEditorGraphRuntime(host, config)` when tags, selectors, events, and view HTML come from generated descriptors.

## Bad support library examples

- `class NodeGraphImplementation extends HTMLElement`.
- `defineNodeGraph()`.
- `.querySelector('.go-node-card-port')` hardcoded in generic helpers.
- View templates embedded as strings.
- Project-specific class prefixes such as `fox-ve-*` embedded directly in package or compiler templates instead of `{{css-prefix}}`.
- Event listeners that know concrete graph/card/cable internals.

## Quality gates

- Generated component owns selectors and event wiring.
- Runtime support files contain no custom element definitions, project-specific selectors, or generated component classes.
- Runtime support library dist contains no package compiler templates.
- Project `src/` JavaScript does not contain `customElements.define`, `extends HTMLElement`, or `attachShadow` outside package compiler shell templates.
- Package-owned node-editor generator source does not duplicate XML view markup in HTML templates.
- Package-owned node-editor generator source does not contain graph-class-style implementation files.
- `src/compiler/` does not contain escaped node-editor implementation strings, graph/card/cable templates, or node-editor HTML markup.
- Tests reject bridge classes and src imports from dist.
