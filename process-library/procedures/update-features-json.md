# Update features.json

## Purpose

Keep the compiler, process library, and AI agents synchronized about the supported Gizmo XML language.

## Required reading

- `features.json`
- `process-library/features.json`
- `src/compiler/features.js`

## Steps

1. When adding a language tag, add it to root `features.json`.
2. Mirror the update in `process-library/features.json` and `src/compiler/features.js`.
3. Update `process-library/reference/full-gizmo-language.md` when the feature changes authoring practice.
4. Update `process-library/solutions/search-index.json` so agents can discover the feature by JavaScript source symptom and Gizmo tag name.
5. Add or update a procedure if the feature changes conversion behavior.
6. Add tests that verify compiler parsing or manifest output.

## Quality gates

- `npm run features` prints the updated feature catalog.
- `npm test` verifies feature catalog coverage.
- The procedure library references the feature in at least one searchable route.
