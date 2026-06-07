# JavaScript to Gizmo Feature Map

Use this reference when converting existing JavaScript Web Components into `<gizmo/>` XML. Search this file by JavaScript feature name.

## Component class and registration

| JavaScript feature | Gizmo translation | Notes |
|---|---|---|
| `class X extends HTMLElement` | `<gizmo tag="x-name">` | The class is generated. Do not preserve the class body. |
| `customElements.define("x-name", X)` | `<gizmo tag="x-name">` | Registration is generated. |
| `static observedAttributes = [...]` | `<props><prop name="..." reflect="true"/></props>` | Include every public attribute. |
| `connectedCallback()` | `<scope/>`, `<interactions/>`, initial render rules | Do not dump all connected logic into a helper. |
| `disconnectedCallback()` | `<scope><dispose/></scope>` | Cleanup is part of lifecycle. |
| `attributeChangedCallback()` | prop reflection and generated render scheduling | Use `field="camelName"` for kebab-case attrs. |
| constructor state fields | `<state><field/></state>` | Public data goes in `<props/>`; private runtime state goes in `<state/>`. |

## Properties, attributes, and data

| JavaScript feature | Gizmo translation | Notes |
|---|---|---|
| `get inputs() / set inputs(value)` | `<prop name="inputs" kind="list" of="Port"/>` | Use `kind="list" of="Port"`, never `Port[]`. |
| Boolean attributes | `<prop kind="boolean" reflect="true"/>` | Presence maps to `true`. |
| JSON attributes | `<prop kind="list" of="Thing" attr-format="json"/>` | Add tests for invalid JSON fallback. |
| `STATUS_VALUES.includes(value)` | `<prop kind="choice" values="ok warning error disabled"/>` | Choices are machine-readable. |
| normalization helpers | `<types/>`, defaults, tests | Keep rules visible to agents. |
| `null` optional state | `<field kind="maybe" of="Thing"/>` and `value="nothing"` | The compiler may emit `null`. |

## DOM construction

| JavaScript feature | Gizmo translation | Notes |
|---|---|---|
| `document.createElement("div")` | element in `<view/>` | Humans should see the DOM structure. |
| `document.createElementNS(SVG_NS, "path")` | SVG element in `<view/>` with `svg.*` bindings | Preserve namespace semantics through compiler. |
| `append(...)` / `replaceChildren(...)` | nested XML in `<view/>` | Repeated regions use `each`. |
| `ports.map(...)` | `each="ports as port" key="{port.id}"` | Use keys for interactive children. |
| `textContent = expr` | `{expr}` or `text="{expr}"` | Prefer text interpolation for normal content. |
| `innerHTML = '<i ...>'` | literal child XML | Avoid raw HTML strings. |
| `className = "..."` | `class="..."` | Static class. |
| `classList.toggle("x", expr)` | `class.x="{expr}"` | Boolean class binding. |
| `style.setProperty("--x", value)` | `style.--x="{value}"` | CSS variable binding. |
| `style.left = ...` | `style.left="{x}px"` | CSS property binding. |
| `dataset.portId = id` | `data-port-id="{id}"` | Keep data contract visible. |
| `setAttribute("aria-label", value)` | `aria-label="{value}"` | Accessibility remains in XML. |
| DOM property assignment | `bind.name="{value}"` | Use for arrays, objects, custom-element props. |
| `querySelector` for stable elements | `ref="name"` | The generated component owns refs. |

## Events and actions

| JavaScript feature | Gizmo translation | Notes |
|---|---|---|
| `addEventListener("click", handler)` | `click="action-name"` plus `<action/>` | Simple handlers become actions. |
| custom event listener | `on.event-name="action-name"` | Use for child Web Component events. |
| `dispatchEvent(new CustomEvent(...))` | `<emit name="..."><detail .../></emit>` | Also declare in `<events/>`. |
| `event.stopPropagation()` | `<stop/>` | Inside action/interaction step. |
| `event.preventDefault()` | `<prevent/>` | Inside action/interaction step. |
| `setPointerCapture` | `<drag capture="true"/>` or `<capture-pointer/>` | Prefer luxury tags. |
| `closest(selector)` | `handle="selector"`, `ignore="selector"`, or explicit `<let/>` | If used often, promote to interaction. |

## Interactions

| JavaScript feature | Gizmo translation | Notes |
|---|---|---|
| pointerdown + pointermove + pointerup | `<drag/>` | Do not write pointer stream plumbing. |
| middle/space drag viewport | `<pan/>` | Panning is not generic node drag. |
| wheel zoom around pointer | `<zoom around="pointer" gesture="wheel"/>` | Compiler/helper handles anchor math. |
| keyboard shortcuts | `<key/>` | Include `prevent="true"` when needed. |
| ResizeObserver | `<resize/>` | It owns observer setup and cleanup. |
| requestAnimationFrame | `<frames><frame coalesce="true"/></frames>` | Use `settle="1"` for layout settling. |
| port-to-port wiring | `<use library="gizmo/node-editor"/>` + `<connect/>` | Package-specific luxury tag. |

## Geometry and SVG

| JavaScript feature | Gizmo translation | Notes |
|---|---|---|
| `clientX/clientY` conversion | `<geometry><function name="clientToWorld"/></geometry>` | Name spaces: client, viewport, world. |
| `getBoundingClientRect()` | `<effect/>` or `<probe/>` | Measurement is not pure. |
| edge path function | `<geometry><function name="edgePath"/></geometry>` | Pure path math. |
| SVG path `d` | `svg.d="{edgePath(edge)}"` | Do not use normal `d` binding when SVG-specific behavior matters. |
| transform attr | `svg.transform="..."` | SVG transform is attribute-level. |
| cable/port alignment bug | `<layout-probe/>` | Express relative geometry, not screenshots. |

## Effects and resources

| JavaScript feature | Gizmo translation | Notes |
|---|---|---|
| DOM measurement | `<effects><effect/></effects>` | Effects may touch DOM. |
| global listeners | `<scope><listen target="window"/></scope>` or luxury tag | Cleanup required. |
| timers | `<scope/>` + `<dispose/>` | Timers must be cancelled. |
| observers | `<resize/>`, `<scope><observe/></scope>` | Disconnect on dispose. |
| async/fetch | `<effects/>` | Add failure and cancellation policy. |

## Diagnostics

| JavaScript concern | Gizmo translation | Notes |
|---|---|---|
| visual alignment bug | `<layout-probe/>` | Compare relative geometry. |
| stale state/DOM bug | `<probe/>` | Use structured `expect`. |
| regression fixture | `<fixtures/>` + `<tests/>` | Teach agents exact expected behavior. |
| agent guidance | `<agent-notes/>`, procedures | Do not rely on comments alone. |
