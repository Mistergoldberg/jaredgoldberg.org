# Design-system hardening review — 2026-09-25

This review uses `278044eab7482850cbbbef522e6b616f0b8037a4` as the visual
baseline. That commit was the local branch tip, pushed branch tip and public QA
release before this pass. The earlier hardening commit `a1d0986` was reviewed as
history, not treated as the desired appearance. The untracked `assets/` directory
is user-owned and was not inspected, modified or staged.

## Implemented route and page-type inventory

| Route | Implemented page type | Shared system | Page composition |
| --- | --- | --- | --- |
| `/` | institutional homepage / four-route index | shell, menu, footer, headings, links, stage width | split identity hero and two-column practice index |
| `/media-archives-and-memory/` | long-form practice area | shell, menu, footer, heading, media, link and focus contracts | sticky contents, article, Continue links and sibling routes |
| `/community-service/` | long-form practice area | same as above | same composition with independently supplied sections and links |
| `/systems-and-institutions/` | long-form practice area | same as above | same composition with independently supplied sections and links |
| `/art/` | long-form practice area | same as above | same composition with independently supplied sections and links |

No local project-detail, project-index, research-index, writing, archive,
biography/CV or general utility route is currently emitted. Project, inquiry,
writing and archive treatments exist as shared renderers for future pages. Current
writing/project destinations in practice pages are audited external links. The
legacy repository-root `index.html` is not a build input or page type.

## Initial findings and disposition

| Severity | Finding and evidence | Affected files/routes | Remedy / disposition |
| --- | --- | --- | --- |
| High | A failed Chromium launch left the local HTTP server open because browser creation happened before `try/finally`. The baseline `npm test` reported the missing default Playwright executable immediately but did not exit until interrupted. | `tests/browser.test.mjs`; local QA only | Move browser launch inside guarded teardown. The expected macOS 12 executable override remains documented. |
| Medium | The only media renderer emitted a placeholder. Replacing it with final artwork required callers to reproduce internal frame classes and independently remember intrinsic dimensions, alt text, loading and fetch priority. | `src/components/content-patterns.mjs`; all practice pages | Add `renderMediaSlot` with validated banner/square variants, local sources, required intrinsic size and alt decision, loading/fetch priority and bounded focal-position variants. Keep the placeholder API as the no-asset state. |
| Medium | The white-on-black heading treatment was a private helper in the page composer, so a future page had to know the undocumented `.heading-highlight` child structure. | `src/components/page.mjs`; future pages | Promote `renderHeading` as a validated public renderer and migrate existing page/section headings to it. Keep the homepage's split accessible wordmark page-specific. |
| Medium | `renderMetadata` could not express the documented category/status variants and `renderProjectRecord` bypassed it, creating two paths for the same contract. | `src/components/content-patterns.mjs`; future project/research pages | Give metadata items explicit `default`, `category` and `status` variants and make project records consume that API. |
| Medium | No integrated, production-excluded exercise proved a new page could combine the shell, long title, mixed metadata, body, links, distinct records and optional media without page CSS. Unit tests covered primitives only. | future page workflow | Add `src/fixtures/new-page.mjs`, an ignored fixture builder and responsive browser coverage. Assert that no fixture file enters `dist/`. |
| Low | Shared styles repeated raw palette, shadow, focus and editorial-grid values, making coordinated changes error-prone. A generic responsive selector also affected any `.record__actions`, regardless of ownership. | `tokens.css`, `base.css`, `navigation.css`, `components.css`, `responsive.css`, `section-pages.css` | Promote semantic tokens and scope the responsive action rule to direct children of `.record`. Literal media-query thresholds remain necessary CSS and are documented. |
| Low | The self-hosted variable font was discovered only after CSS, leaving an avoidable font-discovery delay on every page. | shared page head | Preload the single required WOFF2 from the shared shell. Keep `font-display: swap` and the fallback stack. |
| Informational | Supporting-page paragraphs deliberately span the article column beyond the global 66ch cap. Recent history explicitly approved this media-edge alignment. | four practice pages | Preserve it as a documented page-composition exception; do not silently turn these pages into a generic reading column. |
| Informational | The exact homepage hero, highlighted headings, sticky contents and mobile full-bleed indexes were established in commits after `a1d0986`. | all current routes | Preserve the current visual direction. The hardening changes do not alter these compositions or their editorial content. |

## Open inputs and remaining risks

- Final practice-page artwork, crop/focal point and asset-specific alt decisions are
  not supplied. The pages therefore remain on the intentional decorative
  placeholder state.
- No local destinations or approved content exist yet for project, writing,
  archive, research-index or biography/CV pages.
- Physical Safari, VoiceOver and non-Chromium engines remain outside the available
  test environment. Chromium plus axe cannot replace assistive-technology review.
- Page-specific CSS remains appropriate when a future editorial composition adds a
  relationship that the shared shell, layouts and content primitives do not own.
  Such CSS must be namespaced to that page and must not redefine shared controls.
