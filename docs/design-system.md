# JaredGoldberg.org design system

Status: **binding for implementation** as of 2026-09-25. This document governs the shared site shell and content primitives. The institutional index and its four supporting pages apply these rules; their page-specific decisions are recorded separately in `docs/homepage-design.md`. The route inventory and findings from the hardening pass are in `docs/design-system-review.md`.

## Decision status

Implemented and binding:

- Self-hosted Raleway 4.026 is the only typeface. Body text is 400, supporting headings and UI are 700, prominent display/H1 text is Black 900 with `0.90` leading and `-0.03em` tracking, and large primary menu labels use the authentic ExtraLight 200 instance.
- `#990202` is the accent for links and the outer focus ring. The menu remains predominantly white and neutral; its control icons are CSS-drawn, not emoji.
- The mobile menu control is a 44×44 icon button in a zero-height sticky header. It remains available while scrolling without imposing an asymmetric content gutter.
- Desktop and tablet use a 4.75rem sticky header with the menu control inside it and a subtle lower rule. The control's right edge follows the shared stage/article edge. Sticky tables of contents and anchored article headings clear that header rather than sitting behind it.
- Standard-page banners use 16:9 through desktop and tablet and 1:1 below 768px. Final banner assets are still an input; a neutral labelled placeholder is available in the meantime.
- The page, stage, content and reading-width shells, the spacing scale, the 48rem/64rem breakpoints and reduced-motion policy below are shared rules.

Page-specific status and open inputs:

- The homepage uses the approved semantic two-line wordmark treatment: white Raleway Black text in independently sized black highlights. Its role line uses the same highlight language. The earlier prototype image remains fixture-only, and the homepage uses no imagery.
- The supporting-page architecture is established for the four practice routes. Each page uses the standard-page banner primitive, local table of contents, long-form article, supplied onward links and four-route sibling navigation.
- Final supporting-page artwork remains an editorial input. Until an asset, crop and alt text are supplied, the banner is an explicitly labelled decorative placeholder and can be replaced through `renderMediaSlot` without changing the page layout.
- Image focal points, alt text and whether a missing image is meaningful or decorative depend on the supplied asset and page context. Do not invent them.
- Physical iOS Safari, VoiceOver and non-Chromium browser review remain outstanding.

## Foundations

### Colour and contrast

Use semantic tokens from `src/styles/tokens.css`; do not place raw palette values in page-specific CSS.

| Role | Token | Value/use |
| --- | --- | --- |
| Page / raised / muted surfaces | `--color-background`, `--color-surface`, `--color-surface-muted` | `#eceae4`, `#f7f5f0`, `#e3e0d9` |
| Primary / secondary text | `--color-text-primary`, `--color-text-secondary` | `#141412`, `#57544f` |
| Accent and links | `--color-accent`, `--color-link` | `#990202` |
| Link hover | `--color-link-hover` | `#650101` |
| Focus separator | `--color-focus-contrast` | white inner edge behind the red ring |
| Menu | `--menu-*` | white/near-white surfaces and neutral text/state colours |

Dark red has a 7.38:1 ratio on the page background, 8.15:1 on the raised surface and 6.74:1 on the muted surface. It is not a valid differentiator on dark ink, where the ratio is 2.08:1. On dark controls the one-pixel white separator plus the red outer ring is therefore mandatory. Primary ink on the page background is 15.33:1; secondary text is 6.26:1. Never encode status using colour alone.

### Type and text

- Use `h1` only for the page title. Its Black display treatment is reserved for the most prominent page title, not every oversized phrase.
- Use `h2` for section names, `h3` for record/inquiry/writing titles and `h4` only for a nested subdivision.
- Paragraphs cap at 66ch by default. Long-form introductions and prose may use `--container-reading-max` (44rem) through `.section-introduction`, `.prose` or `.layout-shell--reading`. The supporting-page article is the documented exception: its block width reaches the right edge of the stage media to complete the contents/article composition.
- Headings balance lines and break long words only when necessary. Record titles and metadata may break anywhere as an overflow safeguard; content must not be truncated or line-clamped.
- Every visible page or section heading uses `.heading-highlight`: white text on the black wordmark surface with content-width padding. Record titles retain their own documented project, inquiry or writing treatment. The element retains its semantic heading level; the highlight is a nested presentation span and may wrap naturally.
- `.type-eyebrow`, `.type-meta`, `.type-caption`, `.type-nav`, `.type-button` and `.type-utility` are uppercase UI/editorial roles. They are not substitutes for heading semantics.
- `.record-meta` holds factual type and status as separate, wrapping spans. Spacing—not punctuation that can strand at a line start—distinguishes the items. Preserve source wording such as “in development”, “Developing proposal” and “Employer-owned work”; styling must not imply availability.

### Spacing, widths and grids

Use only the `--space-0` through `--space-10` scale for component spacing. Sections use `--section-space-tight`, `--section-space` or `--section-space-loose`; do not introduce one-off vertical padding for a page section.

- `.layout-shell`: maximum 82rem, general page content.
- `.layout-shell--stage`: maximum 94rem, broad media/stage content.
- `.layout-shell--content`: maximum 70rem, editorial sections and records.
- `.layout-shell--reading`: maximum 44rem, sustained prose.
- The institutional-index homepage uses `.layout-shell--stage` for the hero, every subsequent section and the footer. Below-the-fold width must follow the above-the-fold stage width rather than narrowing to the editorial content shell.
- Shared footers use the literal uppercase domain `JAREDGOLDBERG.ORG` as their identity; do not substitute the personal name.
- The institutional-index hero is capped at 44rem on desktop/tablet; its opening copy aligns with the top of the second highlighted name line. The practice-index heading and explanatory sentence share a stacked eight-track column. Mobile returns both regions to natural-height single-column flow.
- Below 768px, boxed content indexes bleed to both viewport edges while their internal text retains the shared 1rem page-column alignment. Media frames continue to follow the standard page gutter and banner rules.
- Supporting pages also use `.layout-shell--stage` for their outer hero, media, article grid, sibling navigation and footer. The contents column occupies the first two tracks; the article starts in track three and reaches the stage’s right edge. A fixed `1.618rem` gap separates the two columns on desktop/tablet.
- Do not add decorative section numbers, inquiry counters or ecosystem markers to the homepage. They must not reserve a grid column or create an artificial left offset.
- Desktop is 1024px and wider; tablet is 768–1023px; mobile is below 768px. Token comments record these values, while media queries use their literal rem equivalents because custom properties cannot drive media conditions.
- `.grid-2`, `.grid-auto`, `.inquiry-grid`, `.record-list` and `.writing-list` are the allowed starting grids. Records must grow with content. Do not force equal heights or clip summaries.
- Mobile uses symmetric 16px gutters and one-column records. Tablet project records use two columns with the action aligned under the summary; desktop uses title/meta, summary and action columns.

## Interaction patterns

### Navigation

`src/components/navigation.mjs`, `src/navigation.js` and `src/styles/navigation.css` are one unit. Preserve these contracts:

- Trigger: button with `aria-controls`, `aria-expanded`, `aria-haspopup="dialog"` and accessible name “Open menu”. The mobile text label is visually replaced by a three-stroke CSS icon.
- Drawer: labelled modal dialog, inert while closed. Opening makes the background inert, locks the page without losing its scroll position, focuses Close and exposes only visible items to the focus trap.
- Close paths: Close button, backdrop pointer activation, Escape and navigation. Focus returns to the trigger; hash navigation moves keyboard focus to the target.
- Native `details`/`summary` provide nested disclosure. Every visible trigger, summary and link is at least 44×44 CSS pixels.
- Hover/current states remain neutral. Focus always uses the global dual red/white treatment.

### Links and actions

- Use a normal inline link for references inside prose.
- Use `.text-link` / `renderTextLink` for a standalone editorial destination. HTTPS destinations receive the CSS-drawn external mark. External links remain in the same tab by default; set `newTab` only for a genuine workflow need, which adds `noopener noreferrer` and a screen-reader notice.
- Use `.btn` / `renderActionLink` for a primary next step, not for every link. `primary` is dark-filled, `secondary` is outlined and `muted` is a quiet tertiary action. Buttons have a 44px minimum target and wrap instead of overflowing.
- Keep labels specific: name the record, index or activity. Do not use multiple competing primary actions in one group.

### Content records

The reusable renderers live in `src/components/content-patterns.mjs`. The shared page shell lives in `src/components/page.mjs`. These exported renderers are the public authoring API; callers should not reproduce their child class structures.

- `renderPageStart` and `renderFooter`: document head, font preload, skip link, shared menu, body boundary and footer. Every new page starts and ends here.
- `renderHeading`: semantic level 1–6, text and optional ID/class. It owns the nested highlight span; callers choose heading level from document structure rather than visual size.

- `renderProjectRecord`: title, type, status, full summary and optional destination. It supports mixed project types without iconography or status colours.
- `renderInquiryRecord`: title and description in a parallel, content-height record. Use `.inquiry-grid`; an odd fifth item remains naturally sized rather than artificially spanning or stretching.
- `renderArchiveExcerpt`: prose-forward block with a red rule and one continuation link. It signals contextual editorial material, not a project card.
- `renderWritingRecord`: linked essay title plus summary. It is list-like and text-forward; external destination marking is automatic.
- `renderMetadata`, `renderCategoryLabel`, `renderStatusLabel`, `renderTextLink` and `renderActionLink`: shared lower-level contracts. Metadata accepts strings or `{label, variant}` items, where the supported variants are `default`, `category` and `status`. Category and status remain separately addressable without colour-coding. All renderers escape content and reject unsupported URLs/variants.

Cards remain available for self-contained utility surfaces. Do not use `.card` as the default project pattern: the bordered record list is more tolerant of long titles and unequal summaries and does not imply that every item has equivalent status or destination.

## Images and placeholders

- Wrap editorial imagery in `.media-frame`; use `.media-frame--banner` for standard-page banners. Images fill the frame with `object-fit: cover` and default to centered cropping.
- Supply intrinsic `width` and `height` on real images. Use descriptive alt text for meaningful images and `alt=""` for decorative images. Never reuse a filename or project title as invented alt text.
- Set an asset-specific `object-position` only after inspecting the supplied image at desktop, tablet and mobile crops.
- `renderMediaSlot` is the stable replacement boundary. Without `media`, it delegates to the neutral placeholder. With `media`, provide a root-relative local `src`, intentional `alt` (empty only when decorative), positive intrinsic `width`/`height`, and optional `loading`, `fetchPriority` and `position` (`center`, `top`, `bottom`, `left` or `right`). `banner` and `square` are the supported frame variants. Above-the-fold imagery uses `loading: 'eager'` and `fetchPriority: 'high'`; otherwise retain lazy/auto defaults.
- `renderMediaPlaceholder` produces the neutral cross-line field and label. Give it a real label when the missing image carries meaning; use `decorative: true` when it does not. A placeholder is a review state, not fabricated artwork.

## Resilience requirements

- At 320px, 200% equivalent reflow and all supported breakpoints: no horizontal page overflow, truncated title, clipped summary or inaccessible action.
- Content length determines record height. Do not use fixed heights, line clamps or ellipses for approved editorial text.
- A long title may wrap independently from its metadata and summary. Metadata wraps by item before using the emergency anywhere break.
- Reduced motion collapses all animation and transition durations to `0.01ms` and disables smooth scrolling. No meaning may depend on motion.
- Focus must remain visible on light and dark surfaces; browser zoom and pinch zoom remain enabled.

## Index and supporting-page pattern map

| Published content | Pattern | Binding handling rule |
| --- | --- | --- |
| Homepage identity, role and opening | semantic `h1`, independent highlights and prose | One accessible page title; approved name lines remain visual only; no homepage banner |
| Four-route practice index | `.index-grid` + `.index-entry` | Every entry carries one supplied summary and one internal route; no decorative numbering or dedicated number column. On mobile the bordered grid is viewport-wide while entry content stays on the page text column |
| Supporting-page title | `.section-page__hero` | One full-stage-width H1 with no site-name or generic section kicker; its column shares both edges with the media frame. Desktop/tablet use 2rem between the sticky header and title and 1.5rem between the title and media; title may wrap without clipping |
| Standard-page banner | `.media-frame--banner` / `renderMediaPlaceholder` | 16:9 desktop/tablet, 1:1 mobile; asset, focal point and alt text remain pending |
| Long-form section copy | `.section-page__layout`, “Table of contents” navigation and `.article-section` | Contents mirror H2 headings; mobile subjects form one compact, non-scrolling stacked column followed by the shared 24px/divider/24px section transition; desktop/tablet contents stick 1rem below the shared header through the complete article and “Continue” section, then hand off behind the opaque related-practice section; article reaches the media’s right edge; adjacent article sections use the compact spacing scale and no copy is clamped or converted into cards |
| Supplied onward destinations | `.section-page__destinations` + `renderTextLink` | HTTPS links use the graphic external mark, stay in the same tab and are checked against the approved allowlist |
| Related practice routes | `.section-page__siblings` | Label the group “Explore Jared's practice,” always show all four internal routes and mark the current page semantically; below 768px the bordered list is viewport-wide with link text aligned to the page column |

## Usage and verification

The homepage renders the four approved practice entries. Each supporting page renders the complete approved long-form copy and supplied destinations. Unit tests continue to exercise the reusable content patterns independently of these page compositions.

### Building a new page

1. Define supplied content as data; do not place editorial copy inside a shared renderer.
2. Open and close the document with `renderPageStart` and `renderFooter`. Use `renderHeading` for ordinary page and section headings; the split homepage wordmark is a page-specific exception.
3. Choose the narrowest shared shell that fits the content: reading for sustained prose, content for records, page for general layouts or stage for broad media. Compose with `.section`, `.u-flow`, the documented grids and content renderers before adding a page stylesheet.
4. Use record renderers according to meaning: project, inquiry, archive and writing are not interchangeable visual cards. Use `renderTextLink` for editorial destinations and `renderActionLink` only for an action that needs button emphasis.
5. Add optional artwork only through `renderMediaSlot`. Record the supplied asset, alt decision, intrinsic size, loading priority and inspected crop.
6. Add namespaced page CSS only for relationships unique to that composition. It may arrange shared components but must not restyle their internals or redefine navigation, focus, typography, colour or media contracts.
7. Run the complete suite and inspect the page at desktop, tablet, 320px mobile and 200% equivalent reflow, with the menu closed/open and keyboard focus visible.

The concrete exercise is `src/fixtures/new-page.mjs`. It combines a deliberately long unfamiliar title, mixed metadata, prose, internal/external links, project and writing records, actions and an optional media slot using only the public APIs and general layout utilities. `npm run fixture:new-page` writes it to ignored `test-results/new-page-fixture/`; it is absent from production navigation and the artifact allowlist. The browser suite renders it at 1440×900, 768×1024, 320×568 and 720×450 (200% equivalent reflow).

### Shared-system and page-composition boundary

The shared system owns tokens, font loading, resets, shells, type roles, highlighted ordinary headings, focus, links/actions, media frames, records, navigation behavior and the footer. `homepage.css` owns only the institutional-index hero and practice-index arrangement. `section-pages.css` owns only the practice-page title/media/contents/article/sibling relationship. A future artwork, essay, archive, civic initiative or employer-owned case study may establish a different namespaced composition while reusing the shared primitives; it must not be forced into either existing page layout.

Before a page is accepted, run `npm test` with the documented Chromium executable on this macOS 12 workspace. Review at least 1440×900, 1024×768, 768×1024, 390×844, 375×667 and 320×568, including the open menu, keyboard focus, long records, banner crop/placeholder and reduced motion. Record any browser or asset limits in the handoff.
