# Roadmap

## v0.5 — Compiler-shaped prototype

- XML source of truth for Web Components.
- Three-component VPL example: card, cable, graph.
- Development probes for application-layer diagnostics.
- Procedure library for AI agents.
- Dist-clean ESM package layout.

## v0.6 — General lowering

- Package-owned `.js` behavior generator assets instead of generated-code blobs inside the general compiler.
- Package-owned validation metadata for package interaction tags.
- XML-owned view markup lowered by compiler infrastructure, without duplicate package HTML templates.
- Project-level CSS prefix configuration for generated node-editor classes.
- Generic DOM lowering for `<view/>` static markup and repeated fragments, followed by live DOM update plans.
- Generic action lowering.
- Runtime interaction helpers configured by compiled descriptors.
- Cross-component import graph generation.

## v0.7 — Agent procedure enforcement

- Machine-readable process index.
- Process quality gates that can be executed by CI or a local agent harness.
- Procedure result journals for compiler/example changes.

## v1.0 — Publishable language package

- Stable `.xml` schema.
- Stable compiler CLI.
- Stable runtime helper contracts.
- Documented package libraries such as `gizmo/node-editor`.
