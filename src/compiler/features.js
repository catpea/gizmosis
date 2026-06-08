export const GIZMO_FEATURES = {
  "name": "Gizmosis",
  "version": "0.5",
  "classification": "contract-first component capsule language for declarative Web Components and AI-assisted UI development",
  "principles": [
    "<gizmo/> creates Web Components from declarative XML.",
    "Humans write contracts, model, view, behavior, effects, resources, diagnostics, stories, tests, and probes; the compiler washes away XML into ESM Web Components.",
    "Prefer grouped canonical grammar while supporting earlier flat sections for migration.",
    "Runtime support libraries provide reusable, descriptor-configured mechanics only; package-specific compiler generators live with the package that owns them and must not live in the general compiler.",
    "Agents must read features.json and process-library before changing components or compiler behavior."
  ],
  "canonicalRoot": [
    "about",
    "terms",
    "contract",
    "types",
    "requires",
    "provides",
    "model",
    "view",
    "behavior",
    "effects",
    "resources",
    "dev"
  ],
  "compatibilityRoot": [
    "build",
    "diagnostics",
    "use",
    "props",
    "state",
    "events",
    "geometry",
    "interactions",
    "actions",
    "frames",
    "fixtures",
    "tests"
  ],
  "rootAttributes": {
    "gizmo": [
      "name",
      "tag",
      "css",
      "shadow"
    ]
  },
  "projectFiles": {
    "file": "gizmosis.xml",
    "root": "project",
    "purpose": "lightweight XML project runner for multi-file Gizmosis builds",
    "children": [
      "property",
      "target"
    ],
    "targetTasks": [
      "giz",
      "mkdir",
      "delete",
      "copy",
      "render-prefix",
      "property"
    ]
  },
  "sections": {
    "about": {
      "children": [
        "summary"
      ],
      "purpose": "semantic summary for humans and agents"
    },
    "terms": {
      "children": [
        "term"
      ],
      "purpose": "domain vocabulary lock"
    },
    "build": {
      "purpose": "dev/prod/test build policy",
      "attributes": [
        "mode",
        "probes",
        "diagnostics"
      ]
    },
    "diagnostics": {
      "purpose": "application-layer reporting policy",
      "attributes": [
        "report",
        "throw"
      ]
    },
    "use": {
      "purpose": "import a Gizmo package such as gizmo/package-name",
      "attributes": [
        "library"
      ]
    },
    "contract": {
      "children": [
        "props",
        "attrs",
        "events",
        "methods",
        "slots",
        "parts"
      ],
      "purpose": "public surface exposed by a Web Component"
    },
    "types": {
      "children": [
        "type"
      ],
      "purpose": "data records and choices"
    },
    "requires": {
      "children": [
        "component",
        "style",
        "script",
        "asset",
        "capability",
        "service",
        "theme"
      ],
      "purpose": "dependencies and host capabilities"
    },
    "provides": {
      "children": [
        "capability",
        "service"
      ],
      "purpose": "capabilities/services provided to descendants or host systems"
    },
    "model": {
      "children": [
        "state",
        "signal",
        "computed",
        "subscription",
        "store"
      ],
      "purpose": "internal memory and derived state"
    },
    "view": {
      "purpose": "DOM projection with XHTML-like XML and binding attributes"
    },
    "behavior": {
      "children": [
        "event",
        "action",
        "reducer",
        "stream",
        "machine",
        "command",
        "interactions"
      ],
      "purpose": "reactions and component behavior"
    },
    "effects": {
      "children": [
        "effect",
        "task",
        "worker",
        "frame"
      ],
      "purpose": "operations that touch DOM/world or async work"
    },
    "resources": {
      "children": [
        "resource",
        "listen",
        "observe",
        "timer"
      ],
      "purpose": "acquire/release lifecycle resources"
    },
    "geometry": {
      "children": [
        "space",
        "function"
      ],
      "purpose": "coordinate spaces and pure geometry math"
    },
    "interactions": {
      "children": [
        "drag",
        "pan",
        "zoom",
        "key",
        "tap",
        "press",
        "resize",
        "pointer"
      ],
      "purpose": "luxury browser gestures"
    },
    "frames": {
      "children": [
        "frame"
      ],
      "purpose": "requestAnimationFrame scheduling"
    },
    "dev": {
      "children": [
        "story",
        "test",
        "fixture",
        "trace",
        "probes"
      ],
      "purpose": "development-only intelligence layer"
    },
    "fixtures": {
      "children": [
        "fixture"
      ],
      "purpose": "reusable component/test data"
    },
    "tests": {
      "children": [
        "test"
      ],
      "purpose": "executable behavior expectations"
    }
  },
  "dataKinds": [
    "text",
    "number",
    "boolean",
    "css-color",
    "choice",
    "list",
    "record",
    "maybe",
    "url",
    "string",
    "unknown"
  ],
  "legacyTypesAccepted": [
    "String",
    "Number",
    "Boolean",
    "URL",
    "Array",
    "Object",
    "String?",
    "Number?",
    "Boolean?"
  ],
  "viewBindings": {
    "text": "{expr} inside text nodes",
    "attribute": "attr=\"{expr}\"",
    "class": "class.name=\"{expr}\"",
    "style": "style.name=\"{expr}\" and style.--token=\"{expr}\"",
    "svg": "svg.d=\"{expr}\" svg.transform=\"{expr}\"",
    "bind": "bind.prop=\"{expr}\" for DOM/custom-element properties",
    "customEvent": "on.event-name=\"action\"",
    "repeat": "each=\"items as item\" key=\"{item.id}\"",
    "conditional": "if=\"{expr}\" hidden=\"{expr}\""
  },
  "behaviorSurfaces": [
    "action",
    "event",
    "reducer",
    "stream",
    "machine",
    "command"
  ],
  "interactionTags": {
    "core": [
      "drag",
      "pan",
      "zoom",
      "key",
      "tap",
      "press",
      "resize",
      "pointer"
    ]
  },
  "resourceTags": [
    "resource",
    "acquire",
    "release",
    "listen",
    "observe",
    "timer"
  ],
  "effectTags": [
    "effect",
    "task",
    "worker",
    "frame",
    "call",
    "schedule",
    "measure"
  ],
  "devTags": [
    "story",
    "test",
    "fixture",
    "trace",
    "probes",
    "probe",
    "layout-probe"
  ],
  "commandTags": [
    "set",
    "toggle",
    "append",
    "remove",
    "update",
    "emit",
    "dispatch",
    "run",
    "call",
    "guard",
    "let",
    "when",
    "otherwise",
    "case",
    "prevent",
    "stop",
    "capture-pointer",
    "focus",
    "schedule",
    "reflect",
    "hide"
  ],
  "compilerStatus": {
    "recognized": "all entries in this file are parsed/manifested/validated by v0.5 compiler",
    "lowered": "generic view lowering handles static markup, bindings, and repeat fragments; package-specific behavior lowering remains incremental",
    "manifest": "compiler emits the full semantic IR for agents and future lowerers"
  }
};

export default GIZMO_FEATURES;
