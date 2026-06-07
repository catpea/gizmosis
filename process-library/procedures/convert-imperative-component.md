# Procedure: Convert Imperative Web Component to Gizmosis

## Purpose

A concise checklist for converting complex custom element JavaScript into one or more `<gizmo/>` sources. For full detail, use `translate-existing-web-component.md`.

## Required reading

1. `procedures/translate-existing-web-component.md`
2. `reference/js-to-gizmo-feature-map.md`
3. `procedures/prevent-escape-hatches.md`

## Steps

1. Extract public contract: tag, attributes, properties, methods, custom events.
2. Decide component boundaries. Split separate UI responsibilities into separate Web Components.
3. Extract data shapes into `<types/>`, `<props/>`, and `<state/>`.
4. Extract DOM construction into `<view/>`.
5. Replace repeated DOM construction with `each` and `key`.
6. Replace DOM property assignments with `bind.*`.
7. Replace class toggles with `class.name="{expr}"`.
8. Replace CSS variables and style assignments with `style.*`.
9. Replace SVG attributes with `svg.*`.
10. Extract pure coordinate math into `<geometry/>`.
11. Extract simple handlers into `<actions/>`.
12. Replace pointer plumbing with `<drag/>`, `<pan/>`, `<zoom/>`, `<resize/>`, and package tags such as `<connect/>`.
13. Extract DOM measurement, observers, requestAnimationFrame, timers, and external calls into `<effects/>`, `<frames/>`, `<resize/>`, or `<scope/>`.
14. Add `<dev><probes/></dev>` for live layout/runtime laws.
15. Add `<fixtures/>` and `<tests/>`.
16. Compile and verify.

## Forbidden shortcuts

- Do not hide the old component inside a support library.
- Do not preserve one giant component when the UI clearly contains smaller Web Components.
- Do not remove agent-facing documentation to make the XML shorter.
- Do not patch generated JavaScript by hand.

## Quality gates

```bash
npm run compile
npm run check
npm test
```

The generated distribution must be standalone and must not import from `../src/`.
