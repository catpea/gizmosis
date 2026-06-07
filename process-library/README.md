# Gizmo Procedure Library

This repository ships a procedure library because Gizmosis is designed for the age of AI-assisted programming. Agents are real maintainers of this project, and they need a searchable cookbook of procedures, feature translations, quality gates, and anti-escape-hatch rules.

The library follows the same broad principle as process-library systems: reusable processes should name their inputs, steps, quality checks, and approval points. Keep procedures in git because they are institutional knowledge for humans and agents.

## Mission

Help AI agents convert existing imperative Web Components into declarative `<gizmo/>` XML without confusion, hidden bridge classes, or low-quality support-library escape hatches.

## Discovery order for agents

0. Read root `features.json`. It is the canonical feature memory for compiler, procedures, and agents.

1. Read root `SKILL.md`.
2. Read this file.
3. Search `process-library/solutions/search-index.json` for the closest problem.
4. Read the referenced procedure or guide.
5. Perform the conversion in XML first.
6. Run the listed quality gates.
7. If a new rule was learned, update the procedure library before finishing.

## Quick search

Use plain text tools. No service is required.

```bash
grep -R "ResizeObserver" process-library
grep -R "classList" process-library
grep -R "escape hatch" process-library
grep -R "pointer capture" process-library
```

Or inspect the structured index:

```bash
node -e "console.log(require('./process-library/solutions/search-index.json').entries.map(e => e.id).join('\n'))"
```

## Core procedures

- `procedures/use-full-language-capsule.md` — use the canonical `<contract/><requires/><model/><view/><behavior/><effects/><resources/><dev/>` capsule.
- `procedures/translate-dependencies-capabilities.md` — translate imports and host powers into `<requires/>` and `<provides/>`.
- `procedures/translate-behavior-surfaces.md` — choose actions, events, reducers, streams, machines, commands, and luxury tags.
- `procedures/translate-resources-vs-effects.md` — keep effects and acquired resources separate.
- `procedures/update-features-json.md` — keep feature memory synchronized.

- `procedures/author-gizmo-web-component.md` — create one Web Component from one XML source.
- `procedures/convert-imperative-component.md` — concise conversion checklist.
- `procedures/translate-existing-web-component.md` — full conversion process for existing JavaScript components.
- `procedures/extract-public-contract.md` — extract tag, props, methods, events, and public guarantees.
- `procedures/translate-data-props-state.md` — translate constructors, fields, accessors, arrays, JSON attrs, and normalization.
- `procedures/translate-dom-construction.md` — translate `createElement`, `append`, `replaceChildren`, classes, styles, refs, and repeated DOM.
- `procedures/translate-event-handlers.md` — translate listeners, custom events, stop/prevent, actions, and event detail.
- `procedures/translate-interactions.md` — translate drag, pan, zoom, connect, key, resize, and pointer plumbing.
- `procedures/translate-effects-lifecycle.md` — translate observers, RAF, timers, measurement, cleanup, and resource ownership.
- `procedures/translate-svg-geometry.md` — translate SVG namespace, paths, transforms, coordinate spaces, and cable geometry.
- `procedures/prevent-escape-hatches.md` — detect and remove hidden imperative implementations.
- `procedures/create-process-library-entry.md` — add new procedures when the project learns a new rule.
- `procedures/compile-wash-verify.md` — compile declarative XML into standalone distribution files.
- `procedures/add-application-probes.md` — add semantic runtime/layout probes.
- `procedures/split-node-editor-components.md` — keep VPL card/cable/graph components separate.

## Reference guides

- `../features.json` and `features.json` — canonical feature catalog.
- `reference/full-gizmo-language.md` — full contract-first capsule grammar and authoring philosophy.

- `reference/js-to-gizmo-feature-map.md` — JavaScript feature-by-feature translation table.
- `reference/gizmo-feature-catalog.md` — every major Gizmo language feature in conversion context.
- `reference/escape-hatch-smells.md` — warning signs that imperative code has escaped the language.

## Non-negotiable rules

- One Web Component equals one source XML file.
- `<gizmo/>` creates Web Components from declarative XML.
- Humans should avoid imperative component code; the compiler and AI should wash XML into JavaScript.
- `src/` contains source files. `dist/` contains standalone compiled distribution files.
- Example harnesses may live beside `src/` and `dist/`, but they must import only from `dist/`.
- Support libraries may provide reusable mechanics only. They must not contain component-specific listeners, selectors, templates, or hidden component implementations.
- If an agent is tempted to write a hand-coded Web Component, it must write or improve the `.xml` source instead.

## Quality gates for every agent task

```bash
npm run compile
npm run check
npm test
```

A task is not complete until these pass and the relevant procedure's specific gates are satisfied.
