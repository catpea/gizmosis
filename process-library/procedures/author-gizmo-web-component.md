# Procedure: Author a Gizmo Web Component

## Purpose

Create one Web Component from one `<gizmo/>` XML source file.

## Inputs

- Component tag name, such as `fox-ve-node-card`.
- Public attributes/properties.
- Events emitted by the component.
- DOM view structure.
- Interactions, effects, probes, fixtures, and tests.

## Steps

1. Create exactly one XML source file for the component in the relevant `src/` directory.
2. Use `<gizmo name="..." tag="..." css="...">` as the root.
3. Add `<about/>` and `<terms/>` before implementation details.
4. Add `<types/>`, then `<props/>`, then `<state/>` if internal state exists.
5. Add `<events/>` for every emitted event.
6. Add `<view/>` using declarative bindings. Do not write imperative DOM construction by hand.
7. Add `<interactions/>` using luxury tags such as `<drag/>`, `<pan/>`, `<zoom/>`, `<resize/>`, or package-specific tags such as `<connect/>`.
8. Add `<effects/>` only for DOM measurement, external calls, or lifecycle-sensitive side effects.
9. Add `<dev><probes/></dev>` for semantic runtime/layout invariants.
10. Add `<fixtures/>` and `<tests/>` for behavior expectations.
11. Run `npm run compile`, `npm run check`, and `npm test`.

## Quality gates

- The XML compiles with no diagnostics.
- The generated component is in `dist/`.
- The demo imports only from `dist/`.
- No generated file imports from `../src/`.
- Every non-trivial component has probes or tests.

## Failure recovery

If an AI agent feels tempted to add imperative code to a support library, stop and create or update the component XML instead.
