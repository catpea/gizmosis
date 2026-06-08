# Gizmosis v0.5 Specification

Gizmosis is a compiler-oriented XML language for creating Web Components.

`<gizmo/>` source is written for humans and AI agents. The compiler washes away declarative XML and emits browser-ready ESM Web Components. Generated `dist/` files are distribution artifacts, not the source of truth.

## Component rule

One Web Component equals one `<gizmo/>` XML file.

```xml
<gizmo name="Node Card" tag="go-node-card" css="./node-graph.css" shadow="none">
  ...
</gizmo>
```

## Canonical component capsule

New Gizmos should use the contract-first capsule:

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

## Compatibility surfaces

The compiler also accepts earlier flat sections at root level for migration:

```xml
<props/>
<state/>
<events/>
<actions/>
<interactions/>
<effects/>
<frames/>
<fixtures/>
<tests/>
```

Prefer canonical grouped sections for new source.

## Feature memory

`features.json` is the canonical feature catalog. The compiler exports the same catalog from `src/compiler/features.js`, and the process library mirrors it at `process-library/features.json`.

Agents must read `features.json` before changing grammar, compiler behavior, or examples.

## Node editor package

`<use library="gizmo/node-editor"/>` enables node-editor vocabulary such as:

```xml
<connect/>
<node/>
<port/>
<edge/>
```

The example uses three generated components:

- `go-node-card`
- `go-node-cable`
- `go-node-graph`

`<connect/>` belongs to this package rather than universal core.

## Development probes

`<probe/>` and `<layout-probe/>` are application-layer diagnostics. They measure semantic UI laws and produce structured errors for agents.

```xml
<dev>
  <probes>
    <layout-probe name="edge-start-port-center"
                  subject="edge.start"
                  relation="same-point"
                  target="edge.from.port.dot.center"
                  space="world"
                  tolerance="2"
                  severity="error"/>
  </probes>
</dev>
```
