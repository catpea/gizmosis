# Procedure: Translate Browser Interactions

## Purpose

Convert multi-event browser behavior into first-class Gizmo luxury tags.

## JavaScript features covered

- pointerdown/pointermove/pointerup drag streams.
- pointer capture and cancellation.
- wheel zoom.
- viewport pan.
- keyboard shortcuts.
- ResizeObserver.
- port-to-port connection gestures.

## Selection rule

If behavior requires three or more browser events, repeated cleanup, coordinate translation, or pointer capture, prefer a luxury tag.

## Mapping

- Node/object movement → `<drag/>`.
- Viewport movement → `<pan/>`.
- Wheel or pinch zoom → `<zoom/>`.
- Keyboard shortcuts → `<key/>`.
- ResizeObserver → `<resize/>`.
- Node-editor port wiring → `<use library="gizmo/node-editor"/>` plus `<connect/>`.
- Rare low-level cases → `<pointer/>` only after documenting why no luxury tag fits.

## Steps

1. Name the interaction.
2. Add `<about/>`, `<contract/>`, `<invariants/>`, and `<agent-notes/>` for non-trivial interactions.
3. Select the luxury tag.
4. Move start/move/end/cancel/finally logic into named action steps.
5. Ensure coordinate space is explicit: `client`, `viewport`, or `world`.
6. Add probes or tests for edge cases.

## Example

```xml
<drag name="node-drag"
      from="nodeLayer"
      handle="fox-ve-node-card"
      ignore=".fox-ve-node-card-port, button, input, textarea, select, [contenteditable]"
      button="primary"
      capture="true"
      threshold="1"
      space="world"
      when="!readonly"/>
```

## Quality gates

- No hand-written pointer stream replaces a luxury tag.
- Gesture cleanup is automatic or explicit.
- Guards such as `when="!readonly"` are present.
- Coordinate space is named.
- Events emitted at interaction end are declared.
