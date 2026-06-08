# Procedure: Translate DOM Construction

## Purpose

Convert imperative DOM construction into `<view/>` markup that the compiler can lower into DOM code.

## JavaScript features covered

- `document.createElement`.
- `document.createElementNS`.
- `append`, `prepend`, `replaceChildren`, `remove`.
- `textContent`, `innerHTML`.
- `className`, `classList.toggle`.
- `setAttribute`, `removeAttribute`, `toggleAttribute`.
- `dataset.*`.
- `style.*` and CSS custom properties.
- `querySelector` for persistent nodes.
- repeated child creation with `map`.

## Steps

1. Draw the DOM tree as XML before translating behavior.
2. Convert stable DOM nodes to XML elements under `<view/>`.
3. Convert `className` to `class="..."`.
4. Convert `classList.toggle(name, expr)` to `class.name="{expr}"`.
5. Convert `style.setProperty('--x', value)` to `style.--x="{value}"`.
6. Convert normal style assignments to `style.name="..."`.
7. Convert `dataset.fooBar` to `data-foo-bar`.
8. Convert repeated arrays to `each="items as item"` and add `key`.
9. Convert custom element object/array assignments to `bind.*`.
10. Convert stable query targets to `ref="name"`.

## Examples

```xml
<go-node-card each="nodes as node"
                  key="{node.id}"
                  data-id="{node.id}"
                  node-label="{node.label}"
                  style.left="{node.x}px"
                  bind.inputs="{node.inputs}"
                  bind.outputs="{node.outputs}"/>
```

## Quality gates

- The DOM shape is understandable without reading JavaScript.
- No raw `innerHTML` string is used for static XML that can be represented as child elements.
- Every interactive repeated element has a key.
- The support library does not create component-specific DOM trees.
