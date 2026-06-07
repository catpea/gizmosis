# Procedure: Translate Data, Props, and State

## Purpose

Convert JavaScript fields, arrays, JSON attributes, choices, defaults, getters, setters, and normalization helpers into Gizmo data declarations.

## JavaScript features covered

- Constructor fields such as `this._nodes = []`.
- Public accessors such as `get nodes()` and `set nodes(value)`.
- JSON attributes such as `nodes="[...]"`.
- Normalization helpers such as `normalizeNode`, `normalizePorts`, `finiteNumber`, and `textOr`.
- Choice constants such as `STATUS_VALUES`.

## Steps

1. Separate public data from private runtime state.
2. Put public data in `<props/>`.
3. Put private interaction/runtime data in `<state/>`.
4. Create `<types/>` for object shapes.
5. Replace TypeScript-like notation with XML-native notation.
6. Capture defaults and valid values.
7. Convert parsing and normalization into declarative props where possible.
8. Keep unusual normalization rules as named functions or tests.

## Examples

```xml
<type name="NodeGraphPort">
  <prop name="id" kind="text"/>
  <prop name="label" kind="text"/>
  <prop name="type" kind="text"/>
</type>

<prop name="inputs" kind="list" of="NodeGraphPort"/>
<prop name="selected" kind="list" of="text" attr-format="json-or-tokens"/>
<field name="connection" kind="maybe" of="Connection"/>
```

## Quality gates

- No `Port[]`, `Array<Port>`, or TypeScript syntax appears in user-facing XML.
- Every object literal shape has a `<type/>` unless it is trivial and local.
- Every choice set is declared with `kind="choice" values="..."`.
- Public setter side effects are represented as render/update rules, actions, or tests.
