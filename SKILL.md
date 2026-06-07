# Gizmosis Agent Skill

Use this skill when creating, converting, compiling, or reviewing `<gizmo/>` Web Components.

## Core doctrine

- Read `features.json` before altering language, compiler, examples, or process-library entries. It is the canonical feature memory for agents.

- `<gizmo/>` creates Web Components from declarative XML.
- Humans are discouraged from writing imperative component code; the compiler and AI agents can produce it more consistently.
- The project is a compiler: it washes away declarative XML and delivers clean, powerful Web Components.
- Web Components are not web applications. Example `index.html` and `styles.css` files are harnesses only.
- Each Web Component has one XML source file.
- Procedures are mandatory context for agents. Read `process-library/README.md` before modifying this project.

## Source/dist contract

- `src/` contains source files.
- `dist/` contains compiled, standalone ESM distribution files.
- Example harnesses must import only from `dist/`.
- No file in `dist/` may import from `../src/`.

## Node editor component contract

The node editor example is intentionally split into Web Components:

- `example/node-editor/src/node-card.xml` → `fox-ve-node-card`
- `example/node-editor/src/node-cable.xml` → `fox-ve-node-cable`
- `example/node-editor/src/node-graph.xml` → `fox-ve-node-graph`

Do not collapse these back into one imperative graph class.


## Procedure search protocol

Before translating or modifying a component, route the task through the procedure library:

1. Open `process-library/solutions/search-index.json`.
2. Match the current problem by JavaScript feature, Gizmo tag, or symptom.
3. Read every procedure and reference listed in the matching entry.
4. Follow the procedure quality gates.
5. Update the procedure library if a new rule was learned.

Common routes:

- Existing JS Web Component → `procedures/translate-existing-web-component.md`
- `createElement`, `append`, `replaceChildren` → `procedures/translate-dom-construction.md`
- `addEventListener`, `CustomEvent` → `procedures/translate-event-handlers.md`
- pointer/wheel/keyboard/resize behavior → `procedures/translate-interactions.md`
- `ResizeObserver`, `requestAnimationFrame`, measurement → `procedures/translate-effects-lifecycle.md`
- SVG paths/transforms/port geometry → `procedures/translate-svg-geometry.md`
- hidden support-library implementation → `procedures/prevent-escape-hatches.md`

## Required process

Canonical new Gizmos should use the contract-first capsule: `<contract/>`, `<requires/>`, `<model/>`, `<view/>`, `<behavior/>`, `<effects/>`, `<resources/>`, and `<dev/>`. Older flat sections are compatibility syntax only.

1. Read the relevant process in `process-library/procedures/`.
2. Modify XML source first.
3. Modify compiler/runtime only when the language cannot express the source.
4. Run:

```bash
npm run compile
npm run check
npm test
```

5. Verify that generated files remain self-contained in `dist/`.

## Forbidden shortcuts

- Do not place example-specific Web Component implementations in support libraries.
- Do not hardcode graph/card/cable selectors in generic helpers.
- Do not add hidden bridge classes that subclass or wrap a hand-written implementation.
- Do not split one component across many XML files unless each XML file represents a separate Web Component.
