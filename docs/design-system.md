# JaredGoldberg.org design system

Status: **binding for implementation** as of 2026-09-23. This document governs the shared site shell and content primitives. The institutional-index homepage now applies these rules; its page-specific decisions are recorded separately in `docs/homepage-design.md`.

## Decision status

Implemented and binding:

- Self-hosted Raleway 4.026 is the only typeface. Body text is 400, supporting headings and UI are 700, prominent display/H1 text is Black 900 with `0.90` leading and `-0.03em` tracking, and large primary menu labels use the authentic ExtraLight 200 instance.
- `#990202` is the accent for links and the outer focus ring. The menu remains predominantly white and neutral; its control icons are CSS-drawn, not emoji.
- The mobile menu control is a 44×44 icon button in a zero-height sticky header. It remains available while scrolling without imposing an asymmetric content gutter.
- Standard-page banners use 16:9 through desktop and tablet and 1:1 below 768px. Final banner assets are still an input; a neutral labelled placeholder is available in the meantime.
- The page, stage, content and reading-width shells, the spacing scale, the 48rem/64rem breakpoints and reduced-motion policy below are shared rules.

Fixture-only or still open:

- The earlier two-line black-block wordmark and prototype image were review fixtures and are not homepage treatments. The implemented homepage uses plain text with controlled name lines and no imagery.
- Final detail-page architecture and unresolved index, archive, research, writing and biography destinations remain editorial/routing work.
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
- Paragraphs cap at 66ch. Long-form introductions and prose may use `--container-reading-max` (44rem) through `.section-introduction`, `.prose` or `.layout-shell--reading`.
- Headings balance lines and break long words only when necessary. Record titles and metadata may break anywhere as an overflow safeguard; content must not be truncated or line-clamped.
- `.type-eyebrow`, `.type-meta`, `.type-caption`, `.type-nav`, `.type-button` and `.type-utility` are uppercase UI/editorial roles. They are not substitutes for heading semantics.
- `.record-meta` holds factual type and status as separate, wrapping spans. Spacing—not punctuation that can strand at a line start—distinguishes the items. Preserve source wording such as “in development”, “Developing proposal” and “Employer-owned work”; styling must not imply availability.

### Spacing, widths and grids

Use only the `--space-0` through `--space-10` scale for component spacing. Sections use `--section-space-tight`, `--section-space` or `--section-space-loose`; do not introduce one-off vertical padding for a page section.

- `.layout-shell`: maximum 82rem, general page content.
- `.layout-shell--stage`: maximum 94rem, broad media/stage content.
- `.layout-shell--content`: maximum 70rem, editorial sections and records.
- `.layout-shell--reading`: maximum 44rem, sustained prose.
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

The reusable renderers live in `src/components/content-patterns.mjs`.

- `renderProjectRecord`: title, type, status, full summary and optional destination. It supports mixed project types without iconography or status colours.
- `renderInquiryRecord`: title and description in a parallel, content-height record. Use `.inquiry-grid`; an odd fifth item remains naturally sized rather than artificially spanning or stretching.
- `renderArchiveExcerpt`: prose-forward block with a red rule and one continuation link. It signals contextual editorial material, not a project card.
- `renderWritingRecord`: linked essay title plus summary. It is list-like and text-forward; external destination marking is automatic.
- `renderMetadata`, `renderCategoryLabel`, `renderStatusLabel`, `renderTextLink` and `renderActionLink`: shared lower-level contracts. Category and status remain separately addressable without colour-coding. All renderers escape content and reject unsupported URLs/variants.

Cards remain available for self-contained utility surfaces. Do not use `.card` as the default project pattern: the bordered record list is more tolerant of long titles and unequal summaries and does not imply that every item has equivalent status or destination.

## Images and placeholders

- Wrap editorial imagery in `.media-frame`; use `.media-frame--banner` for standard-page banners. Images fill the frame with `object-fit: cover` and default to centered cropping.
- Supply intrinsic `width` and `height` on real images. Use descriptive alt text for meaningful images and `alt=""` for decorative images. Never reuse a filename or project title as invented alt text.
- Set an asset-specific `object-position` only after inspecting the supplied image at desktop, tablet and mobile crops.
- `renderMediaPlaceholder` produces a neutral cross-line field and label. Give it a real label when the missing image carries meaning; use `decorative: true` when it does not. A placeholder is a review state, not fabricated artwork.

## Resilience requirements

- At 320px, 200% equivalent reflow and all supported breakpoints: no horizontal page overflow, truncated title, clipped summary or inaccessible action.
- Content length determines record height. Do not use fixed heights, line clamps or ellipses for approved editorial text.
- A long title may wrap independently from its metadata and summary. Metadata wraps by item before using the emergency anywhere break.
- Reduced motion collapses all animation and transition durations to `0.01ms` and disables smooth scrolling. No meaning may depend on motion.
- Focus must remain visible on light and dark surfaces; browser zoom and pinch zoom remain enabled.

## Homepage-copy pattern map

This is a content-to-pattern map, not a page layout specification.

| Later homepage content | Available system pattern | Binding handling rule |
| --- | --- | --- |
| Identity, role line and introduction | `h1`, `.type-eyebrow`/`.record-meta`, `.prose`, `.button-group` | One page H1; introduction stays within reading width; actions wrap |
| Five areas of inquiry | `.inquiry-grid` + `renderInquiryRecord` | Same semantic pattern, natural heights; fifth item is not forced into a page-specific span |
| Seven selected projects | `.record-list` + `renderProjectRecord` | Keep type and status distinct; full summaries; optional destinations; no availability inference |
| From the archive | `renderArchiveExcerpt` | Prose-forward context with one continuation action, visually distinct from project records |
| Selected writing | `.writing-list` + `renderWritingRecord` | Linked titles and summaries; external mark for `.ca`; no card treatment required |
| Where the work lives | `.prose` with inline links or a record list if destinations need separate descriptions | Externality is indicated; destination text remains editorial |
| Where to begin | record list or `.grid-auto`, chosen when hierarchy is designed | Each route names its theme and destination; do not assume equal text length |
| Standard-page banner | `.media-frame--banner` / `renderMediaPlaceholder` | 16:9 desktop/tablet, 1:1 mobile; crop review waits for supplied assets |

## Usage and verification

The homepage renders all seven approved project records, all five inquiries, the archive excerpt and both writing records. Unit tests continue to exercise the reusable patterns independently of the page composition.

Before a page is accepted, run `npm test` with the documented Chromium executable on this macOS 12 workspace. Review at least 1440×900, 1024×768, 768×1024, 390×844, 375×667 and 320×568, including the open menu, keyboard focus, long records, banner crop/placeholder and reduced motion. Record any browser or asset limits in the handoff.
