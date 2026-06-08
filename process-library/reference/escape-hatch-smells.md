# Escape Hatch Smells

An escape hatch is imperative code that hides component behavior outside the `<gizmo/>` source of truth. Escape hatches confuse agents, waste compute, and let low-quality code bypass contracts, probes, and tests.

## Critical smells

- A support library exports `defineNodeGraph`, `NodeGraphImplementation`, or a hidden class that owns the component.
- A support library contains `customElements.define` for a component that should come from XML.
- A project `src/` JavaScript file contains `customElements.define`, `extends HTMLElement`, or `attachShadow` to implement a component that should be a `.gizmo.xml` file.
- A runtime support library contains component-specific selectors such as `.go-node-card-port` unless they are passed in from generated code as data.
- A package compiler directory contains graph-class-style files that splice a hand-written custom element implementation into generated output.
- The general compiler contains package-specific graph/card/cable templates instead of loading an explicit package generator from the package that owns them.
- `dist/*.generated.js` imports from `../src/`.
- Generated code subclasses a hand-written implementation class.
- A Web Component's DOM tree exists in JavaScript while the XML `<view/>` is only documentation.
- Pointer events are hand-written in a component-specific helper when `<drag/>`, `<pan/>`, `<zoom/>`, or `<connect/>` would express the behavior.
- Layout bugs are fixed with magic pixels and no `<layout-probe/>`.

## Acceptable support library contents

- Generic geometry functions.
- Selector-free or selector-configured DOM utilities.
- Frame scheduling helpers.
- Observer/listener disposal helpers.
- Package-level VPL/interaction mechanics that receive tags, selectors, refs, events, view HTML, and callbacks from generated code.
- Shared constants that are not component-specific templates.
- Thin build-time package shell generator templates under that package's own source tree, when they are not copied into runtime support-library distribution files and do not duplicate XML view markup or graph-class implementation bodies.

## Required response when a smell is found

1. Stop adding code to runtime support files.
2. Move component-specific structure into `<view/>` and compiler view lowering.
3. Move component-specific behavior into `<actions/>`, `<interactions/>`, `<effects/>`, `<geometry/>`, package-owned lowering, or descriptor-driven runtime mechanics.
4. Keep only reusable, descriptor-configured mechanics in runtime support files.
5. Add a test that prevents this escape hatch from returning.
