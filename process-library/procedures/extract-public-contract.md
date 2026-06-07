# Procedure: Extract Public Contract

## Purpose

Make the public surface of an existing Web Component explicit before translating implementation details.

## Inputs

- JavaScript class source.
- Top-of-file comments.
- README/examples.
- Tests or demo usage.

## Steps

1. Find the custom element tag name from comments or `customElements.define`.
2. Find `observedAttributes` and every `getAttribute`, `hasAttribute`, `toggleAttribute`, and reflected attribute.
3. Find public getters and setters.
4. Find public methods called by demos or users.
5. Find every `dispatchEvent(new CustomEvent(...))` call.
6. Find supported CSS variables and external CSS classes.
7. Write `<about/>` and `<terms/>` to define the mental model.
8. Write `<props/>` for attributes/properties.
9. Write `<events/>` for emitted events and detail payloads.
10. Write `<contract/>` blocks for non-trivial interactions.

## Translation rules

- `node-label` plus internal `nodeLabel` becomes `<prop name="node-label" field="nodeLabel" kind="text"/>`.
- Presence attributes become `kind="boolean" reflect="true"`.
- Public arrays become `kind="list" of="Type"`.
- Public object properties become `kind="record" of="Type"`.
- Event details become `<detail><field .../></detail>`.

## Quality gates

- A user can understand how to use the component without reading JavaScript.
- No event is emitted without a matching `<event/>` declaration.
- No public prop is used in `<view/>` without being declared.
- Method behavior is either declared, lowered, or intentionally omitted with a note.
