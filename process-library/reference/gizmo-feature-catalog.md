# Gizmo Feature Catalog for JavaScript Translators

This guide presents Gizmo features in the context of translating JavaScript, because many agents will start from existing custom element code.

## `<gizmo/>`

Use when JavaScript contains `class Something extends HTMLElement` and `customElements.define(...)`.

```xml
<gizmo name="Node Card" tag="go-node-card" css="./node-graph.css">
</gizmo>
```

One `<gizmo/>` creates one Web Component.

## `<types/>`

Use when JavaScript has object shapes, comments describing data, schema constants, validators, normalization helpers, or repeated ad-hoc object literals.

```xml
<type name="Port">
  <prop name="id" kind="text"/>
  <prop name="label" kind="text"/>
  <prop name="type" kind="text"/>
</type>
```

## `<props/>`

Use when JavaScript has attributes, observed attributes, getters/setters, declarative JSON attributes, or public properties.

```xml
<prop name="inputs" kind="list" of="Port"/>
```

## `<state/>`

Use when JavaScript has private fields such as `_connection`, `_nodeDrag`, `_pan`, `_space`, or internal maps.

```xml
<field name="connection" kind="maybe" of="Connection"/>
```

## `<events/>`

Use when JavaScript emits `CustomEvent` or documents events in comments.

```xml
<event name="fox-node-move">
  <detail>
    <field name="id" kind="text"/>
    <field name="nodes" kind="list" of="NodePosition"/>
  </detail>
</event>
```

## `<view/>`

Use when JavaScript builds DOM with `createElement`, `append`, `replaceChildren`, `className`, `dataset`, `setAttribute`, `textContent`, or `innerHTML`.

```xml
<button each="inputs as port" key="{port.id}" data-port-id="{port.id}">
  {port.label}
</button>
```

## `<actions/>`

Use for simple event handlers that mutate local state, toggle attributes, or emit events.

```xml
<action name="toggle-expanded">
  <toggle prop="expanded"/>
  <emit name="fox-node-expand"><detail expanded="{expanded}"/></emit>
</action>
```

## `<interactions/>`

Use when JavaScript has a behavior spanning multiple native events.

```xml
<drag name="node-drag" from="nodeLayer" handle="go-node-card" space="world"/>
<pan name="viewport-pan" from="viewport" button="middle or space-primary" target="view"/>
<zoom name="wheel-zoom" from="viewport" gesture="wheel" around="pointer"/>
<connect name="port-connect" from="nodeLayer" handle=".go-node-card-port"/>
```

## `<geometry/>`

Use for coordinate transforms, hit testing, bounds, snapping, and path generation.

```xml
<function name="viewportToWorld">
  <return>{ x: (point.x - view.panX) / view.zoom, y: (point.y - view.panY) / view.zoom }</return>
</function>
```

## `<effects/>`

Use when JavaScript measures DOM, writes directly to SVG, calls external systems, or performs operations that are not pure state updates.

## `<frames/>`

Use when JavaScript uses `requestAnimationFrame`, coalescing, or second-frame layout settling.

```xml
<frame name="draw-edges" coalesce="true" settle="1"/>
```

## `<dev><probes/></dev>`

Use when JavaScript contains layout-sensitive code or bugs that screenshots cannot explain.

```xml
<layout-probe name="edge-start-port-center" subject="edge.start" relation="same-point" target="edge.from.port.dot.center"/>
```

## `<fixtures/>` and `<tests/>`

Use when existing behavior must be preserved. Tests teach agents what correct behavior means.
