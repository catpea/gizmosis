# Procedure: Compile, Wash, Verify

## Purpose

Use the compiler to wash away declarative XML into standalone Web Component distribution files.

## Steps

1. Edit files under `src/` only.
2. Confirm multi-file examples declare their build in `gizmosis.xml`.
3. Run `npm run compile` or run `giz` from the project directory.
4. Confirm `dist/` was repopulated.
5. Run `npm run check`.
6. Run `npm test`.
7. Open the demo harness and verify the generated components behave correctly.
8. When changing generated node-editor output, confirm package-specific shell generation lives under `example/node-editor/src/library/compiler/`, descriptor-driven runtime mechanics live under `example/node-editor/src/library/`, and view markup is lowered from XML `<view/>` with `{{css-prefix}}` class placeholders.

## Expected result

The XML remains the human/agent source of truth. The generated JavaScript is the browser artifact.

## Quality gates

- `dist/` imports only from `dist/` or from import-map package specifiers.
- `dist/` contains all generated component dependencies.
- No `dist` file imports from `../src/`.
- The generated result can be used as plain ESM in a browser.
- `generator.js` does not contain escaped node-editor implementation strings or node-editor HTML markup.
- `src/compiler/` does not contain node-editor graph/card/cable templates.
- Node-editor package generator source does not duplicate XML view markup in HTML templates.
- Node-editor package generator source does not contain graph-class-style implementation files.
- Runtime support files do not define custom elements or hardcode project-specific selectors.
- Project `src/` JavaScript does not define Web Components to bypass XML.
- `dist/library/` contains runtime support helpers only, not package compiler templates.
- Multi-file examples can be rebuilt through `gizmosis.xml` with `giz` and do not require a hidden custom build script.
