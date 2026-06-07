# Use the Full Gizmo Component Capsule

## Purpose

Guide agents from flat XML or imperative JavaScript into the canonical contract-first component capsule.

## Required reading

- `features.json`
- `process-library/reference/full-gizmo-language.md`
- `process-library/reference/gizmo-feature-catalog.md`

## Steps

1. Start with `<gizmo name="..." tag="..." shadow="...">`.
2. Put public API into `<contract>`:
   - attributes/properties in `<props>` or `<attrs>`
   - custom events in `<events>`
   - public methods in `<methods>`
   - slots in `<slots>`
   - CSS shadow parts in `<parts>`
3. Put all dependencies into `<requires>`:
   - Web Components as `<component>`
   - CSS as `<style>`
   - assets as `<asset>`
   - host powers as `<capability>`
   - network/app endpoints as `<service>`
4. Put internal memory into `<model>`:
   - mutable fields in `<state>`
   - derived values in `<computed>`
   - reactive values in `<signal>`
   - external state reads in `<subscription>`
5. Put DOM into `<view>` only.
6. Put reactions into `<behavior>`.
7. Put outside-world operations into `<effects>`.
8. Put acquired/cleaned-up things into `<resources>`.
9. Put stories, tests, traces, probes, and layout checks into `<dev>`.

## Quality gates

- No public API remains only in prose comments.
- No dependency is hidden as a random import when it should be a capability, component, style, asset, or service.
- No lifecycle cleanup is hidden inside actions or effects.
- `npm run compile`, `npm run check`, and `npm test` pass.
