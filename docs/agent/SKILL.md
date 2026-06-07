# Gizmo XML Agent Skill

Use this skill when creating, converting, compiling, or reviewing `<gizmo/>` Web Components.

## Core doctrine

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

## Required process

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
