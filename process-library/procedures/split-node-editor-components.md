# Procedure: Split Node Editor Components

## Purpose

Prevent visual programming language examples from collapsing into one large graph implementation.

## Required components

A node editor must be decomposed into at least:

- `node-card.xml` → `fox-ve-node-card`
- `node-cable.xml` → `fox-ve-node-cable`
- `node-graph.xml` → `fox-ve-node-graph`

## Steps

1. Inspect the source component and list each visual responsibility.
2. Create `node-card.xml` for caption, collapse state, ports, and port events.
3. Create `node-cable.xml` for cable SVG path ownership.
4. Create `node-graph.xml` for graph state, selection, pan/zoom, dragging, and connection orchestration.
5. Move reusable selector-free runtime mechanics into `src/library/` only when they are shared across components.
6. Keep package-specific graph/card/cable behavior generator templates under `src/library/compiler/` for this package, not under the general compiler.
7. Compile all three XML files and verify the graph composes generated card and cable components.

## Rules

1. The graph coordinates state and interactions.
2. The card owns its caption, ports, collapse button, and port events.
3. The cable owns its SVG group/path lifecycle in a shared SVG layer.
4. Runtime support files may provide geometry and browser-resource helpers only.
5. Runtime support files must not contain graph-specific selectors, card-specific templates, or cable-specific drawing ownership.
6. Package generator files under `src/library/compiler/` may contain graph/card/cable behavior lowering templates because they are build-time source owned by this package.
7. Component markup must remain in XML `<view/>` and be lowered by compiler infrastructure, not duplicated in package HTML files.

## Quality gates

- `example/node-editor/src/` contains `node-card.xml`, `node-cable.xml`, and `node-graph.xml`.
- `example/node-editor/dist/` contains generated JS, manifests, declarations, and copied XML for all three.
- `node-graph.generated.js` imports `node-card.generated.js` and `node-cable.generated.js`.
- `dist/library/` does not contain `node-card.js`, `node-cable.js`, or `node-graph.js`.
- `src/compiler/` does not contain node-editor graph/card/cable templates.
- `example/node-editor/src/library/compiler/` does not contain duplicate `.html` view templates.
