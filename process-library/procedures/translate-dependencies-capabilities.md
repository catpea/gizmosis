# Translate JavaScript Dependencies into <requires/> and <provides/>

## Purpose

Teach agents to replace hidden imports and environment assumptions with explicit Gizmo dependency declarations.

## Required reading

- `features.json`
- `process-library/reference/full-gizmo-language.md`

## Steps

1. Inspect JavaScript imports and globals.
2. Classify each dependency:
   - Custom element dependency → `<component tag="..." src="..."/>`
   - CSS dependency → `<style src="..."/>`
   - Static file → `<asset name="..." src="..."/>`
   - Browser/host power → `<capability name="..." as="..."/>`
   - API endpoint or app service → `<service name="..." url="..."/>`
3. If the component exposes a capability to children, add `<provides>`.
4. In tests, use `<provide capability="..." fake="..."/>` when host powers must be faked.

## Translation examples

```js
navigator.clipboard.writeText(text)
```

becomes:

```xml
<requires>
  <capability name="clipboard.write" as="clipboard"/>
</requires>
```

```js
import './x-popover.js';
```

becomes:

```xml
<requires>
  <component tag="x-popover" src="./x-popover.js"/>
</requires>
```

## Quality gates

- No dependency is silently assumed.
- Optional dependencies use `optional="true"`.
- Support libraries remain generic and parameterized.
