# Procedure: Translate Effects and Lifecycle

## Purpose

Move DOM measurement, observers, frames, timers, global listeners, and external calls into explicit lifecycle-aware Gizmo sections.

## JavaScript features covered

- `getBoundingClientRect`.
- `ResizeObserver`, `MutationObserver`, `IntersectionObserver`.
- `requestAnimationFrame`.
- `setTimeout`, `setInterval`.
- global listeners on `window` or `document`.
- external effects such as fetch or worker calls.

## Steps

1. Identify every operation that touches DOM reality or the outside world.
2. Put pure math in `<geometry/>`, not `<effects/>`.
3. Put DOM measurement and direct DOM mutation in `<effects/>`.
4. Put frame scheduling in `<frames/>`.
5. Use `<resize/>` for ResizeObserver.
6. Add `<scope/>` or a luxury tag for any listener/observer/timer that needs cleanup.
7. Add probes for layout-sensitive effects.

## Examples

```xml
<resize target="self">
  <schedule frame="draw-edges"/>
</resize>

<frames>
  <frame name="draw-edges" coalesce="true" settle="1">
    <effect name="draw-edges"/>
  </frame>
</frames>
```

## Quality gates

- Every observer, timer, frame, and global listener has cleanup ownership.
- Layout-sensitive effects have probes.
- Pure coordinate math is not mixed with DOM measurement.
