# Procedure: Translate SVG and Geometry

## Purpose

Convert SVG creation, path math, transforms, hit tests, port measurements, and coordinate conversions into Gizmosis.

## JavaScript features covered

- `document.createElementNS`.
- SVG `path`, `g`, `viewBox`, `transform`, and `d` attributes.
- client/viewport/world coordinate transforms.
- cable path generation.
- fallback port centers and measured port centers.
- snap-to-grid and graph bounds.

## Steps

1. Name all coordinate spaces in `<geometry/>`.
2. Put pure transforms in `<geometry><function/>`.
3. Use `svg.*` bindings in `<view/>`.
4. Treat DOM measurement as an effect or probe, not pure geometry.
5. Prefer measured port centers over hardcoded row/header offsets when layout exists.
6. Add layout probes for cable endpoints, ghost edges, and alignment.

## Example

```xml
<g svg.transform="translate({view.panX} {view.panY}) scale({view.zoom})">
  <path svg.d="{edgePath(edge)}"/>
</g>
```

## Quality gates

- SVG attributes use `svg.*` when appropriate.
- Coordinate-space assumptions are documented in `<terms/>` or `<geometry/>`.
- Cable alignment is covered by `<layout-probe/>`.
- Magic pixel fallbacks are documented and tested.
