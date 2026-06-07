# Full Gizmosis Language Map

## Purpose

This reference is the agent-facing memory of the full Gizmosis language. Read it with `features.json` before converting JavaScript Web Components.

Gizmosis is a **contract-first component capsule** language. It creates Web Components from declarative XML and lets the compiler wash away the XML into clean ESM output.

## Canonical component capsule

```xml
<gizmo name="x-widget" tag="x-widget" shadow="open">
  <about/>
  <terms/>

  <contract>
    <props/>
    <attrs/>
    <events/>
    <methods/>
    <slots/>
    <parts/>
  </contract>

  <types/>

  <requires>
    <component/>
    <style/>
    <script/>
    <asset/>
    <capability/>
    <service/>
  </requires>

  <provides>
    <capability/>
    <service/>
  </provides>

  <model>
    <state/>
    <signal/>
    <computed/>
    <subscription/>
    <store/>
  </model>

  <view/>

  <behavior>
    <event/>
    <action/>
    <reducer/>
    <stream/>
    <machine/>
    <command/>
    <interactions/>
  </behavior>

  <geometry/>

  <effects>
    <effect/>
    <task/>
    <worker/>
    <frame/>
  </effects>

  <resources>
    <resource/>
    <listen/>
    <observe/>
    <timer/>
  </resources>

  <dev>
    <story/>
    <fixture/>
    <test/>
    <trace/>
    <probes/>
  </dev>
</gizmo>
```

## Compatibility grammar

The compiler also accepts older flat sections such as `<props/>`, `<state/>`, `<events/>`, `<actions/>`, `<interactions/>`, `<effects/>`, `<frames/>`, `<fixtures/>`, and `<tests/>` at the root. Use the canonical grouped grammar for new work.

## The four questions

Every component must answer these questions:

1. **What does it expose?** Use `<contract/>`.
2. **What does it need?** Use `<requires/>`.
3. **What does it remember?** Use `<model/>`.
4. **What does it do?** Use `<behavior/>`, `<effects/>`, and `<resources/>`.

## Capabilities over random imports

Do not hide environment assumptions in scripts. Declare them:

```xml
<requires>
  <capability name="clipboard.write" as="clipboard"/>
  <capability name="resize.observe" as="resizeObserver"/>
  <service name="search" url="/api/search" optional="true"/>
</requires>
```

This lets tests provide fake capabilities and lets hosts wire real implementations.

## Resources are not effects

An effect is an operation. A resource is acquired and released.

```xml
<effects>
  <effect name="save">
    <call service="storage" method="write" value="{document}"/>
  </effect>
</effects>

<resources>
  <resource name="resizeObserver">
    <acquire><call capability="resize.observe" target="{host}"/></acquire>
    <release><call target="resizeObserver" method="disconnect"/></release>
  </resource>
</resources>
```

If JavaScript has `new ResizeObserver`, `setInterval`, window listeners, workers, audio nodes, file handles, or pointer capture cleanup, look for `<resources/>`.

## Behavior surface selection

Use the smallest correct surface:

- Local state change: `<action>`.
- External/app event: `<event>` + `<reducer>`.
- Continuous event pipeline: `<stream>`.
- Formal modes: `<machine>`.
- Host operation: `<command>` or `<capability>`.
- Pointer gesture: `<drag>`, `<pan>`, `<zoom>`, `<connect>`.

Do not force everything into one ideology.
