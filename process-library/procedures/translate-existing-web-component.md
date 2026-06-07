# Procedure: Translate Existing Web Component to Gizmosis

## Purpose

Convert an existing imperative JavaScript Web Component into one or more `<gizmo/>` XML source files, without preserving the imperative implementation as a hidden bridge.

## Inputs

- Existing JavaScript source.
- CSS source, if any.
- Public examples from comments or docs.
- Known bugs, layout issues, and expected behavior.
- Desired component boundary: one Web Component or a component family.

## Outputs

- One `.xml` file per Web Component.
- Generated `.generated.js`, `.manifest.json`, and `.generated.d.ts` files in `dist/`.
- Optional support library containing only reusable mechanics.
- Probes, fixtures, and tests that capture behavior.

## Steps

1. Read `reference/js-to-gizmo-feature-map.md`.
2. Read `procedures/prevent-escape-hatches.md`.
3. Identify component boundaries. If the original class mixes graph/card/cable/panel responsibilities, split it into separate Web Components.
4. Extract the public contract using `procedures/extract-public-contract.md`.
5. Extract data, props, state, and normalization using `procedures/translate-data-props-state.md`.
6. Translate DOM construction using `procedures/translate-dom-construction.md`.
7. Translate event handlers using `procedures/translate-event-handlers.md`.
8. Translate multi-event browser behaviors using `procedures/translate-interactions.md`.
9. Translate coordinate math and SVG using `procedures/translate-svg-geometry.md`.
10. Translate observers, frames, measurement, and cleanup using `procedures/translate-effects-lifecycle.md`.
11. Add probes for every known visual or lifecycle bug using `procedures/add-application-probes.md`.
12. Add fixtures and tests for public behavior.
13. Compile and verify with `procedures/compile-wash-verify.md`.

## Approval points

Stop and ask for human review if:

- A single JavaScript class appears to contain multiple Web Components.
- You cannot decide whether behavior belongs in core tags or a package such as `gizmo/node-editor`.
- A feature seems impossible without adding imperative code to a support library.

## Quality gates

- No hand-written component implementation remains in a support library.
- Every emitted custom event is declared in `<events/>`.
- Every public prop/attribute is declared in `<props/>`.
- Repeated DOM uses `each` and `key`.
- Multi-event interactions use luxury tags.
- DOM measurement is in `<effects/>`, `<probe/>`, or `<layout-probe/>`.
- `npm run compile`, `npm run check`, and `npm test` pass.

## Failure recovery

If the generated output does not match the original behavior, do not patch generated JS by hand. Improve the XML, compiler, runtime helper, procedure, or test.
