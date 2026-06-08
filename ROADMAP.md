# Roadmap

## v0.5 — Compiler-shaped prototype

- XML source of truth for Web Components.
- Three-component VPL example: card, cable, graph.
- Development probes for application-layer diagnostics.
- Procedure library for AI agents.
- Dist-clean ESM package layout.
- Package-owned `.js` behavior generator assets instead of generated-code blobs inside the general compiler.
- Package-owned validation metadata for package interaction tags.
- XML-owned view markup lowered by compiler infrastructure, without duplicate package HTML templates.
- Descriptor-driven VPL graph runtime support instead of graph-class generator escape hatches.
- Compiler-level project prefix projection, defaulting to `go` and configurable with `--prefix`.
- Standalone generated components mount lowered `<view/>` HTML once and patch cached DOM binding targets instead of replacing the whole view.
- Initial `gizmosis.xml` project runner for multi-file builds and no-argument `giz`.

## v0.6 — General Lowering

- DOM update plans beyond the current standalone target cache: keyed repeat diffing, event listener plans, ref plans, and reusable patch helpers.
- Generic action lowering.
- Runtime interaction helpers configured by compiled descriptors.
- Cross-component import graph generation.
- Richer `gizmosis.xml` project features: filesets, incremental checks, and target metadata.

## v0.7 — Agent procedure enforcement

- Machine-readable process index.
- Process quality gates that can be executed by CI or a local agent harness.
- Procedure result journals for compiler/example changes.

## v1.0 — Publishable language package

- Stable `.xml` schema.
- Stable compiler CLI.
- Stable runtime helper contracts.
- Documented package libraries such as `gizmo/node-editor`.
