# Procedure: Compile, Wash, Verify

## Purpose

Use the compiler to wash away declarative XML into standalone Web Component distribution files.

## Steps

1. Edit files under `src/` only.
2. Run `npm run compile`.
3. Confirm `dist/` was repopulated.
4. Run `npm run check`.
5. Run `npm test`.
6. Open the demo harness and verify the generated components behave correctly.

## Expected result

The XML remains the human/agent source of truth. The generated JavaScript is the browser artifact.

## Quality gates

- `dist/` imports only from `dist/` or from import-map package specifiers.
- `dist/` contains all generated component dependencies.
- No `dist` file imports from `../src/`.
- The generated result can be used as plain ESM in a browser.
