# Translate Effects and Resources without Lifecycle Bugs

## Purpose

Teach agents the difference between one-shot effects and acquired resources that must be released.

## Required reading

- `features.json`
- `process-library/reference/full-gizmo-language.md`
- `process-library/procedures/translate-effects-lifecycle.md`

## Steps

1. Mark operations that call the outside world as `<effects>`.
2. Mark objects/listeners/observers/timers/workers that need cleanup as `<resources>`.
3. For every acquired resource, add both `<acquire>` and `<release>`.
4. For window/document listeners, use `<resources><listen>` or a luxury tag that owns cleanup.
5. For animation-frame work, use `<effects><frame>` or root compatibility `<frames>`.
6. For layout measurement, add probes that verify the semantic result.

## JavaScript translation hints

- `new ResizeObserver(...)` → `<resource>` or `<resize>`.
- `requestAnimationFrame(...)` → `<frame>`.
- `setInterval(...)` → `<timer>` with release.
- `window.addEventListener(...)` → `<listen>` with cleanup or a luxury interaction.
- `getBoundingClientRect()` → `<effects>` or `<geometry>` plus `<layout-probe>`.

## Quality gates

- Every acquire has a release.
- No observer/listener/timer/worker cleanup is missing.
- No DOM measurement is buried in a pure function without being declared.
