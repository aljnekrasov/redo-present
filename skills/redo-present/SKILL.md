---
name: redo-present
description: Create branded slide design alternatives with an interactive five-option selector, then assemble the user's chosen presentation.
---

# Redo Present

Use the bundled viewer and assembler; do not recreate them. Resolve all paths relative to this SKILL.md, never to a developer's machine. Python 3.9+ and a browser are required. Write working files in the user's project, outside this installed skill.

## Brand and source material

Identify the requested client, business task, audience, source content and output format. Read the client's supplied brand rules, template catalog, fonts and assets. If a `clients/<client>/` library exists in the user's project, use it. A neutral 53-layout library is bundled at `assets/templates/neutral/`; read its [adaptation instructions](assets/templates/neutral/instructions.md) when using it. When creating a client template, follow the separate [client styling guide](assets/templates/neutral/client-styling.md): replace the demonstration pattern with the brandbook pattern, or omit patterns entirely if none exists. It includes Helvetica/system fallbacks, replaceable black/white/blue tokens, a wave mask and anonymous placeholders. Use it when a neutral template is requested or as a starting point to apply the supplied brand. No real client assets are bundled. If essential branding or source content is missing, ask for it rather than silently substituting another client's style.

Keep brand rules in that client library, not in this generic skill. Preserve source facts and material caveats. Establish slide order and content before making variants; if a crowded slide needs splitting, do that first. Preserve the original deck unless replacement was requested.

## Create alternatives

Read [the bundle format and commands](references/format.md). Store canonical text in content.json. Create five genuinely different appropriate compositions for each slide, sharing exactly the same content; five recolorings are not five designs. Follow client-specific rules on typography, imagery, backgrounds and narrative rhythm. Keep content and designs separate.

Generate static HTML variants and variants.json. All dependencies must live inside the working bundle. Run the bundled `scripts/studio.py validate` and `prepare` commands with absolute paths. Prepare copies the existing `assets/viewer/` into the bundle and records its identity; do not generate a new selector. Visually inspect every variant for loading, clipping, collisions and readability. Text validation is not a substitute for visual inspection.

Open the bundle's selector.html, preferably through a loopback-only local HTTP server rooted at the working project. Reuse an existing suitable server when available. The selector is a vertically scrolling deck with slide navigation on the left and five variants on the right of each slide. Variant 1 is selected by default; clicking a variant immediately saves that choice, with no confirmation button. Give the selector link and wait for the user to return their list or selection file before assembly; default values alone do not mean the user has finished reviewing. If the user explicitly bypasses this stage or requests a different scope, honor the request.

## Assemble the chosen presentation

Accept the downloaded selection.json or a number list. Identify the reviewed project and version. For a plain list, use the fingerprint from that reviewed manifest, not a regenerated set. Ask only if the intended set is ambiguous or the list invalid.

Run `scripts/studio.py assemble` to a new output directory. It copies the chosen designs without regenerating them. Preserve selections even if their combination could improve in rhythm; report suggestions separately. Verify the assembled presentation loads with its dependencies.

Deliver HTML by default. If the requested output is Figma, PowerPoint or another format, continue using available format-specific tools and skills, transfer only selected designs, and visually verify the result. This package does not provide those exporters or account access. Do not call HTML delivery complete when another format was requested. Preserve editable text when supported and disclose any font/vector limitation.
