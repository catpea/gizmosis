# Procedure: Prevent Escape Hatches

## Purpose

Stop agents from hiding imperative Web Component implementations in support libraries.

## Definition

An escape hatch is code that should be generated from `<gizmo/>` but is instead hand-written and hidden in JavaScript.

## Steps

1. Read `reference/escape-hatch-smells.md`.
2. Inspect support libraries for `customElements.define`, `extends HTMLElement`, hardcoded component selectors, or hidden implementation classes.
3. Inspect generated files for imports from `../src/`.
4. Inspect XML to ensure it actually contains the view, interactions, events, and probes.
5. Move component-specific code from support libraries into XML or compiler lowering.
6. Keep only reusable mechanics in support libraries.
7. Add tests that fail if the escape hatch returns.
8. Keep package-specific generated component JavaScript in package-owned `.js` template assets. Component view markup should come from XML `<view/>` lowering, not package or compiler HTML blobs.

## Good support library examples

- `createFrameScheduler(name, callback)`.
- `edgePath(from, to)` when parameterized and reusable.
- `installStylesheet(url)`.
- `createPointerDragRecognizer(options)` when selectors/callbacks come from generated code.

## Bad support library examples

- `class NodeGraphImplementation extends HTMLElement`.
- `defineNodeGraph()`.
- `.querySelector('.fox-ve-node-card-port')` hardcoded in generic helpers.
- View templates embedded as strings.
- Project-specific class prefixes such as `fox-ve-*` embedded directly in package or compiler templates instead of `{{css-prefix}}`.
- Event listeners that know concrete graph/card/cable internals.

## Quality gates

- Generated component owns selectors and event wiring.
- Runtime support files contain no component-specific implementation.
- Runtime support library dist contains no package compiler templates.
- Package-owned node-editor generator source does not duplicate XML view markup in HTML templates.
- `src/compiler/` does not contain escaped node-editor implementation strings, graph/card/cable templates, or node-editor HTML markup.
- Tests reject bridge classes and src imports from dist.
