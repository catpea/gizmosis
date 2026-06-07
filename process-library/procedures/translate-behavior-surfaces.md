# Translate JavaScript Behavior into the Correct Gizmo Surface

## Purpose

Prevent agents from dumping all behavior into actions, streams, or hand-written listeners.

## Required reading

- `features.json`
- `process-library/reference/full-gizmo-language.md`
- `process-library/procedures/translate-interactions.md`

## Steps

1. For a simple local state update, use `<action>`.
2. For an app/domain event with a payload, use `<event>` and optionally `<reducer>`.
3. For continuous input composition, use `<stream>` only when no luxury tag exists.
4. For formal modes, use `<machine>`.
5. For host/application operations, use `<command>` or `<capability>`.
6. For browser gestures, prefer luxury tags:
   - `<drag>` for movement
   - `<pan>` for viewport movement
   - `<zoom>` for wheel/pinch zoom
   - `<key>` for keyboard
   - `<resize>` for resize observation
   - `<connect>` from `gizmo/node-editor` for port connections

## Quality gates

- No pointerdown/pointermove/pointerup stream is written by hand when `<drag>` fits.
- No graph connection plumbing is written by hand when `<connect>` fits.
- Behavior contracts list reads, mutations, emissions, schedules, and forbidden mutations.
