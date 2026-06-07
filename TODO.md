# TODO

## Current status

The v0.5 package now demonstrates the intended compiler workflow:

- `node-card.xml` compiles to `fox-ve-node-card`.
- `node-cable.xml` compiles to `fox-ve-node-cable`.
- `node-graph.xml` compiles to `fox-ve-node-graph`.
- The node editor harness imports only from `dist/`.
- The support library is selector-free and component-neutral.
- Package-specific node-editor behavior lowering lives under `example/node-editor/src/library/compiler/`, not in the general compiler.
- Package-specific interaction validation metadata lives with the package generator, not in core compiler validation.
- Node-editor markup is lowered from each component's XML `<view/>`; there are no duplicate package HTML templates, and `dist/library/` ships only runtime support helpers.
- XML view classes use `{{css-prefix}}` for project-level class prefixing.
- The process library documents mandatory agent procedures.

## Next compiler milestones


› /home/meow/Universe/Development/Containers/catpea-npm/catpea/npm/gizmosis/
  example/node-editor/src/library/compiler/graph-class.js appears to be an
  escape hatch. This maybe stale code and if so it should be removed. If this
  is live code then it is a violation of our principles and must be re-wrtten
  in the Gizmo language. If Gizmo language is missing features that are
  universal to graph/vpl user interfaces we can extent the Gizmo tag set with
  general purpose functionality via adding new featires in /home/meow/Universe/
  Development/Containers/catpea-npm/catpea/npm/gizmosis/example/node-editor/
  src/library you may also add a plug-in directory to /home/meow/Universe/
  Development/Containers/catpea-npm/catpea/npm/gizmosis root and there we can
  have additional general purpose functionality registered via .use(plugin)
  pattern.

  We must add testing for escape hatches. And continue working on TODO and
  ROADMAP remove the completed items.


1. Expand generic `<view/>` lowering from static HTML/repeat templates into full live DOM update plans for arbitrary components.
2. Lower `<actions/>` into generated methods instead of template-specific methods.
3. Lower `<drag/>`, `<pan/>`, `<zoom/>`, `<resize/>`, and package `<connect/>` through reusable runtime recognizers configured by XML.
4. Generate probe runtime code directly from `<dev><probes/></dev>` instead of relying on the node-editor template.
5. Add source-map-like diagnostics from generated JS back to XML node paths.
6. Add browser automation tests for the example harness.
7. Move stylesheet prefixing and formal project-level prefix metadata out of literal `fox-ve-*` CSS.
