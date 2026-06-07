# Escape Hatch Smells

An escape hatch is imperative code that hides component behavior outside the `<gizmo/>` source of truth. Escape hatches confuse agents, waste compute, and let low-quality code bypass contracts, probes, and tests.

## Critical smells

- A support library exports `defineNodeGraph`, `NodeGraphImplementation`, or a hidden class that owns the component.
- A support library contains `customElements.define` for a component that should come from XML.
- A support library contains component-specific selectors such as `.fox-ve-node-card-port` unless they are passed in from generated code as data.
- `dist/*.generated.js` imports from `../src/`.
- Generated code subclasses a hand-written implementation class.
- A Web Component's DOM tree exists in JavaScript while the XML `<view/>` is only documentation.
- Pointer events are hand-written in a component-specific helper when `<drag/>`, `<pan/>`, `<zoom/>`, or `<connect/>` would express the behavior.
- Layout bugs are fixed with magic pixels and no `<layout-probe/>`.

## Acceptable support library contents

- Generic geometry functions.
- Selector-free DOM utilities.
- Frame scheduling helpers.
- Observer/listener disposal helpers.
- Package-level interaction mechanics that receive selectors, refs, and callbacks from generated code.
- Shared constants that are not component-specific templates.

## Required response when a smell is found

1. Stop adding code to the support library.
2. Move component-specific structure into `<view/>`.
3. Move component-specific behavior into `<actions/>`, `<interactions/>`, `<effects/>`, or `<geometry/>`.
4. Keep only reusable mechanics in the library.
5. Add a test that prevents this escape hatch from returning.
