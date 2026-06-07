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
- Event listeners that know concrete graph/card/cable internals.

## Quality gates

- Generated component owns selectors and event wiring.
- Support library contains no component-specific implementation.
- Tests reject bridge classes and src imports from dist.
