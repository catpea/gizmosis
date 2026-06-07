# Procedure: Translate Event Handlers

## Purpose

Convert imperative listeners and custom events into declarative view bindings, actions, and event contracts.

## JavaScript features covered

- `addEventListener` and `removeEventListener`.
- `this.on(...)` helper patterns.
- event delegation with `closest`.
- `stopPropagation` and `preventDefault`.
- `dispatchEvent(new CustomEvent(...))`.
- `setPointerCapture` when used inside simple handlers.

## Steps

1. Declare every emitted event in `<events/>`.
2. For simple local handlers, add a view event attribute such as `click="toggle-expanded"`.
3. Create an `<action/>` for the handler body.
4. Replace `stopPropagation` with `<stop/>`.
5. Replace `preventDefault` with `<prevent/>`.
6. Replace `dispatchEvent` with `<emit/>`.
7. If the handler starts a multi-event gesture, stop and use `procedures/translate-interactions.md`.

## Example

```xml
<button click="toggle-expanded"/>

<action name="toggle-expanded">
  <toggle prop="expanded"/>
  <emit name="fox-node-expand"><detail expanded="{expanded}"/></emit>
</action>
```

## Quality gates

- No simple handler remains hidden in support JS.
- Every custom event has a declared detail shape.
- Multi-event gestures are not represented as giant actions.
