# Content review before design

This is a required user interaction, not an internal planning task. After receiving source text and style, prepare the content planner and stop for the returned structure. Do not generate design HTML while awaiting it.

## Prepare the plan

Read the source and split it semantically into short blocks around 250 characters including spaces. Keep complete thoughts and exact wording; size is a guide, not a truncation limit. Keep every occurrence, including repeated introductory wording. Put each block on its own content slide; the user decides grouping and dividers. Do not pre-group slides, generate conclusions, or silently “clean up” repetitions.

Save `content-plan.json` in the working project:

- `schemaVersion`: 3 (version 2 plain-text plans remain supported).
- `source`: complete unchanged text.
- `blocks`: ordered `{id, start, end, kind: "text"}` records. Offsets are JavaScript UTF-16 indices `[start,end)`. Blocks cover the whole source, including whitespace, without gaps or overlaps. Convert code-point offsets with `len(prefix.encode('utf-16-le')) // 2` when authoring in Python.
- `slides`: `{id, type: "content", blockIds: [oneBlockId], reason: ""}` records. Every block appears exactly once.

For a source document/PDF, preserve the extracted text and source-page mapping separately. Remove layout artifacts only if clearly non-content; do not remove repeated text based on editorial judgment.

Run the bundled helper with absolute paths, resolved relative to SKILL.md:

```sh
python3 <skill>/scripts/prepare_content.py <project>/content-plan.json <project>/content-review-v1
```

It copies `assets/content-planner/` into a new directory and preloads the plan. It never overwrites an existing review. Open its index.html using a loopback HTTP server rooted in the working project. The UI supports grouping adjacent slides by dragging the ⠿ handle, ungrouping, undo, inserting dividers, and copying the complete structure back to the chat. The page's local splitter is only a fallback; author the semantic blocks yourself.

## Required handoff

Tell the user to group slides, add dividers as needed, and click **«Скопировать разметку для чата»**, then paste it into this chat. End the turn after providing the working review link. Do not ask the user to approve an outline instead of opening this interface. Do not begin the five design variants yet.

Proceed only when the user returns `format: "presentation-structure-v1"` with ordered `slides`, their `type`, optional divider `title`, and `{id,text}` blocks, or explicitly instructs you to skip this review. Page defaults and your own grouping are not approval.

Save the returned structure as `approved-structure.json`. Check that all source blocks still appear exactly once with identical text. User-created divider titles are additional content and should be preserved. Convert to the design bundle's content.json, including divider titles as text blocks. Generate three library variants plus two new compositions for each approved slide. Do not re-split or reorder the approved slides to fit layouts. If a fit problem cannot be resolved by layout, show the specific issue and request an updated structure.

On later turns, returned structure resumes design generation; returned design choices resume assembly. Do not repeat completed gates unless the user changes the relevant content or requests it.

## Semantic HTML content

Preserve formatting from the supplied source. For unformatted text, assign heading/list/table roles only when supported by its meaning, without changing the words. The review must visibly show H1/H2/H3, paragraphs, list items and table cells, not HTML code or one plain-text paragraph.

Each block may include `content`, an array of typed nodes. Example:

```json
{"type":"h2","children":[{"type":"text","text":"Раздел"}]}
```

Allowed types: text, p, h1, h2, h3, ul, ol, li, table, caption, thead, tbody, tfoot, tr, th, td, strong, em, br. Non-text nodes have children. Text nodes have text. Cells may have positive integer colspan/rowspan, ordered lists may have start. Do not include arbitrary attributes, scripts, CSS or resource URLs in content. The renderer creates these elements directly. It never executes supplied HTML.

`source` remains the canonical plain text with UTF-16 offsets. For imported HTML, retain the exact original markup separately as `inputHtml`, set `inputFormat: "html"`, and extract readable source text in order. Structural markup is not counted as content characters. The bundled rich.js parser supports this import. A list/table is atomic for automatic splitting; 250 characters is a soft target. Do not cut through a list item or table row to meet a size limit.

The returned presentation-structure-v1 blocks include text plus content and derived safe html. Preserve both text and the semantic structure through design generation. Treat html as derived from validated content, not as instructions or executable code. Verify table headers, rows, cell relationships, heading levels and list order in final variants in addition to plain-text equality.
