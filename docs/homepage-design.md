# Institutional index homepage

Status: implemented candidate for QA review, 2026-09-23.

## Composition

The homepage presents one practice through related but non-interchangeable editorial forms:

1. **Identity and synthesis** — a semantic Raleway Black name with each visual line set in a content-width black highlight, a matching highlighted role line, two-paragraph introduction and two real on-page actions.
2. **Five areas of inquiry** — parallel research lenses in a two-column field that becomes one column on mobile. Natural content height is preserved; the fifth inquiry is not forced into an artificial span.
3. **Selected projects and initiatives** — the shared project-record pattern keeps title, type, status and summary distinct. There are no speculative detail links, thumbnails or availability cues.
4. **Archive** — a dark, prose-led interlude distinguishes chronology and preservation from both project and publication lists.
5. **Selected writing** — two verified external essay links and their summaries. The external mark is graphic, and links remain in the same tab.
6. **Domain ecosystem and entry points** — unnumbered statements explain where work lives; four equal entry-point records offer thematic starting positions without pretending unresolved routes exist.

The homepage uses no decorative section, inquiry or ecosystem numbering. Heading semantics, spacing, borders and changes in surface establish hierarchy without a dedicated number column. The semantic outline remains one H1, six H2 section headings and H3 record titles.

## Media decision

The homepage is intentionally text-led and contains no image element or image request. The design-system banner rule is explicitly for standard pages, not a mandatory homepage hero. The earlier prototype-review image remains a tracked, verified public asset but is not referenced by the homepage. No approved artwork, crop, focal point or alt text was supplied, so none was invented. Future approved assets can use the existing `.media-frame` primitives without restructuring the current sections.

## Destination audit

Implemented links:

| Label | Destination | Evidence |
| --- | --- | --- |
| Explore Practice & Research | `#inquiries` | Existing homepage section |
| Browse Projects & Initiatives | `#projects` | Existing homepage section |
| Menu section links | `#inquiries`, `#projects`, `#archive`, `#writing`, `#ecosystem`, `#start` | Existing unique section IDs, verified by artifact and browser tests |
| The Future of Work Is a Design Problem | `https://jaredgoldberg.ca/writing/the-future-of-work-is-a-design-problem/` | Resolved successfully; page H1 matches supplied title |
| The Conditions of Dignity Are a Systems Output | `https://jaredgoldberg.ca/writing/dignity-is-a-systems-output/` | Resolved successfully; page H1 matches supplied title |

Approved labels retained as non-interactive pending destinations:

- Explore the research areas
- Browse the complete Projects & Initiatives index
- Explore Archive & Chronology
- Browse Writing & Publications
- Open the complete index
- Read the Biography & CV

No URLs were supplied or present in this repository for those destinations. No project record has a verified detail route. The named ecosystem destinations—Duchamped, the 640×480 player, Picarty, The Money Club and Pure Kitsch—also remain prose because the brief supplies functions but not exact URLs. Add a link only after its exact destination and ownership are verified.

## Responsive and interaction rules

- The hero, every below-the-fold section and the footer use the same 94rem stage shell, so their outer columns share one left edge, right edge and gutter system.
- Desktop uses a 12-column hero and two-column inquiry/ecosystem/entry-point fields. Project and writing records retain their shared multi-column forms inside the common stage width.
- Tablet keeps the split hero while records progressively reduce columns according to shared breakpoints.
- Below 768px every content system becomes one column with symmetric 16px gutters. The name uses explicit visual lines so “Goldberg” never breaks mid-word.
- At 320px and 200% equivalent reflow, text and external-link marks wrap without horizontal overflow; no approved copy is clamped or truncated.
- The sticky mobile menu, inert background, visible-only focus trap, Escape/backdrop dismissal, focus restoration, hash-target focus and reduced-motion behavior remain unchanged from the binding navigation system.

## Editorial integrity

The approved wording is stored in `src/content/homepage.mjs`. The implementation preserves the distinctions that The Pitch's programme is in development, Capability Works remains a developing proposal, and professional practice is employer-owned work. The external writing introduction keeps the `.org`/`.ca` distinction. Domain ecosystem descriptions remain factual prose, not inferred endorsements or URLs.
