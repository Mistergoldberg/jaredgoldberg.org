# Foundation decisions

## 2026-09-18

1. Keep plain HTML/CSS/JavaScript. The destination had only a static placeholder;
   the source design needs no application framework. Build-time Node rendering
   provides a single source for navigation/content and deterministic hashed assets.
2. Use the homepage visual system. The source also has an independent wiki/reading
   system. An optional preference question was offered; absent a response, proceed
   with the stated homepage-system assumption. Final reading layouts remain open.
3. Preserve exact homepage tokens, header/menu geometry, breakpoints, nested
   disclosure treatment, shadows, borders and transitions. Reconstruct behavior
   without the source analytics bundle or carousel code.
4. No font binaries were found. Homepage Raleway is only a declared family; its
   effective fallback remains platform-dependent. Inner HTML links Google Fonts
   Raleway 400/600/700, but that is not a locally stored asset. Preserve homepage
   fallbacks and leave a documented font module; do not fabricate font provenance
   or introduce a new third-party dependency. Licensed local files/formats remain
   an unresolved input.
5. The fixture uses the source's content shells and general surfaces instead of
   its editorial carousel. Footer treatment is demonstrated from source CSS even
   though the homepage currently has no footer. No photos, archive, wiki content,
   essay text, form, metadata, analytics, old icons or project navigation transfer.
6. Accessibility corrections: visible-only focus traversal (closed details are
   excluded), inert background/closed drawer, valid div dialog semantics instead
   of aside[role=dialog], keyboard continuation at hash targets, immediate scroll
   restoration, browser zoom allowed, and a completed exit animation. Backdrop is
   decorative with pointer dismissal; the close button is the keyboard equivalent.
   Coarse landscape summaries receive the same compact size as top-level links.
7. Add a neutral QA favicon to avoid inherited branding or missing favicon requests.
   It is a fixture, not a final identity mark.
8. Source's immutable release pattern is the relevant infrastructure model; QA
   uses its own root/symlink and an exact SHA export. A first-deploy maintenance
   baseline establishes a rollback target before the candidate becomes active.
9. DNS NXDOMAIN, absent QA vhost and certificate coverage block public deployment.
   SSH works. No DNS/TLS/Cloudflare/Nginx changes or production publication are made.
10. Existing production files stay preserved and outside the build. README directs
    users to the QA workflow; legacy production deploy is never invoked.
11. Baseline browser networking timed out on direct HTTPS. Source homepage captures
    rendered the live HTML/CSS/JS fetched using curl with normal TLS verification
    through Playwright request fulfillment. Local source was rendered directly.
    Reduced motion freezes the source carousel for comparison. These captures
    are not proof of browser-to-origin networking performance.
12. Validation uses cached Chromium 147 because current Playwright downloads do not
    support macOS 12. Physical iOS Safari and another browser engine remain untested.

## 2026-09-19 — font resolution

Direct browser/CDP evidence found local Raleway 2.001 on the inspection Mac and
Google-hosted Raleway 4.026 on source inner pages. The network-served WOFF2 is
redistributable under verified SIL OFL 1.1. Self-host that exact unmodified binary
and its notice, preserving filename and format. This removes machine dependence
without introducing a runtime provider. Its wght axis supports the required 900.
The network-served version differs from the old local installation; report the
subpixel trigger-width difference rather than adjusting exact source layout tokens.

## 2026-09-19 — isolated public QA

Verified authoritative Cloudflare account/zone, unchanged origin, configured SSH,
Nginx conventions and installed Certbot before authorized writes. Use a DNS-only
QA A record and a separate webroot certificate with automatic renewal; production
DNS, certificates and vhosts are not inputs to the change. Candidate Nginx syntax
is tested before activation. The quoted hashed-asset regex fixes an issue caught
by that preactivation test.

Extend existing immutable-release tooling rather than adding another deploy path.
Public HTTP and browser checks must both pass before recording a release verified;
a browser failure now triggers the same tested rollback as an HTTP failure. Keep
first-deploy maintenance fallback explicitly distinct from a prior working QA site.
Public browser tests run from the same exported SHA as the deployed artifact.

The first bootstrap passed public maintenance verification, then the local SCP
client rejected a trailing `/.` in the rollback-download source. No candidate was
activated. Download the validated release directory to a new destination without
the rejected suffix; retain the verified baseline and retry a freshly tested SHA.

## 2026-09-19 — exact pushed feature commits for QA

QA review must preserve `origin/main` until approval. Candidate deployment therefore
requires a named pushed source branch, its exact authoritative remote-tip SHA, an
explicit unchanged remote-main baseline and ancestry from that baseline. Recheck
those facts after the clean archived build and before upload. Store the source ref,
remote ref SHA, main baseline and manifest identity in both the local deployment
record and private QA ledger.

Keep the established manual rollback interface separate: from clean `main`, pass
its full HEAD with `--sha`, add `--apply --rollback <verified-release-id>`, and omit
candidate source arguments. Rollback eligibility continues to come from prior
successful QA ledger verification rather than from branch names.

## 2026-09-20 — Design System V2 menu candidate

Retain the data-driven fixture tree and established dialog, focus, inertness,
scroll-lock and dismissal behavior. Replace the dark, symbol-led treatment with a
near-white sheet, 14% neutral backdrop, subtle neutral edge, low-opacity shadow and
220ms opacity/translation motion. Use the existing unmodified Raleway 4.026 variable
WOFF2 at its named authentic ExtraLight 200 instance for large primary labels and
400 for supporting links. CSS-drawn chevrons and close lines replace ornamental
text glyphs. Every visible trigger, close, summary and nested link is at least
44×44 CSS pixels; the previous nested-link heights of roughly 16–18px are rejected
by focused browser assertions.

## 2026-09-20 — mobile menu trigger review

Keep the approved desktop trigger and menu unchanged. At the mobile breakpoint,
use the existing header as a zero-height sticky overlay so the trigger remains in
the document's sticky layout context without adding fixed positioning, scroll
listeners or layout space. Replace the visible mobile label with a three-stroke
CSS menu mark while retaining the `Open menu` accessible name and 44×44 target.
Hide the background trigger while the dialog is open so it does not compete with
the menu's close control.

Approved for a future cycle, but deliberately not implemented here: tighten the
leading and tracking of Raleway Black global headings, and change the global blue
accent to dark red `#990202`.

## 2026-09-21 — blocked homepage wordmark

Treat the homepage “Jared Goldberg” name as a semantic text wordmark rather than
an image asset. Keep the existing Raleway Black scale, leading and tracking, but
place each approved name line in its own content-width black block with white text.
The `h1` retains one accessible name while its two visual lines remain independently
sized. This treatment does not change other headings, menu typography or accents.

## 2026-09-21 — reserved mobile menu-control rail

Keep the approved zero-height sticky header and 44×44 three-line menu trigger,
but reserve a safe-area-aware content rail beside it at mobile widths. Content
layout shells begin after the trigger plus a 12px separation, so wordmark text,
fixture labels, headings, paragraphs, links and buttons never occupy the
control's functional region while the page scrolls. Full-bleed stages retain
their full viewport width, desktop layout remains unchanged, and the solution
does not introduce a nested scrolling container or scroll-detection script.

## 2026-09-21 — Raleway Black display rhythm

Tighten only the Raleway Black display/H1 role from 0.95 leading and 0.04em
tracking to 0.90 leading and -0.03em tracking. Keep the 900 weight and existing
responsive scale. Body copy, navigation, supporting headings and utility roles
continue using their existing independent line-height and tracking tokens.

## 2026-09-21 — dark-red design-system accent

Establish `#990202` as the canonical accent and route focus treatment through
that token. The red exceeds 6.7:1 against every approved light surface but does
not reach 3:1 against the darkest ink surface, so focusable controls also receive
a one-pixel white inner separator. This preserves the approved red outer ring
while keeping a visible dual treatment on dark controls and surfaces. Neutral
menu hover and current-page treatments remain intentionally neutral rather than
being indiscriminately recoloured.

## 2026-09-22 — above-the-fold prototype image

Place the supplied 1536×1024 prototype-review image directly below the introductory
sentence as local page content. Preserve one unchanged PNG source and use
`object-fit: cover` with a centered 16:9 frame on desktop/tablet and a 1:1 frame below the mobile
breakpoint. Retain intrinsic dimensions, descriptive alternative text and an explicit
high fetch priority; do not add a remote image dependency or duplicate crop files.

## 2026-09-23 — symmetric mobile content gutters

Supersede the reserved mobile menu-control rail for page content. Center every
mobile layout shell with the standard 16px gutter on both sides, while retaining
the existing zero-height sticky header, left-positioned 44×44 menu trigger and
safe-area positioning. The intro's top spacing keeps its initial content clear
of the control. While scrolling, the opaque elevated control may pass over page
content instead of shifting every section into a permanent asymmetric rail.
Desktop/tablet layout remains unchanged.

## 2026-09-23 — Google Analytics tag

Install Google tag `G-N6X517GEQ2` in the shared page head using the asynchronous
Google Tag Manager loader and standard `dataLayer` initialization. Treat that
single loader URL and measurement ID as the only approved analytics integration;
the artifact checks continue to reject other analytics identifiers and external
asset URLs.

## 2026-09-23 — design-system hardening

Promote the implemented Raleway, dark-red accent, neutral drawer, sticky mobile
icon control and responsive banner ratio from scattered decisions into one binding
design-system contract. Add a reading width, semantic link roles, 44px action
targets, resilient record/inquiry/archive/writing patterns and an accessible
asset-pending banner placeholder. Records grow with content and never turn a
development status into an availability claim.

Use the approved homepage copy only as test data: all seven projects and all five
inquiries exercise the render APIs, while the QA page shows three representative
records and a placeholder. This does not approve a homepage composition,
navigation model, section order, asset crop or final destination. External links
receive a graphic indicator and stay in the same tab unless a specific workflow
justifies an announced new tab.

## 2026-09-23 — institutional index homepage

Compose the homepage as a text-led institutional index rather than a promotional
portfolio or product grid. Use a split identity/introduction hero followed by six
numbered movements: inquiries, projects, archive, writing, domain ecosystem and
entry points. Give the five inquiries a parallel research-grid treatment; keep
the seven projects as factual, variable-height records; give the archive a dark
editorial field; and retain writing as an externally linked publication list.

The standard-page banner ratio does not apply to this homepage. Stage 1 scoped it
to standard inner pages, marked the existing prototype image as fixture-only and
left the homepage composition open. With no approved artwork, focal points or alt
text, the homepage uses no image or fabricated placeholder. The shared media-frame
primitive remains ready for later supplied assets without determining this layout.

Only link destinations that exist and were verified: homepage fragments and the
two supplied JaredGoldberg.ca essay URLs. Render approved calls to unresolved
research, project-index, archive, writing-index, complete-index and biography/CV
destinations as visibly pending non-interactive records on QA. Do not infer project
detail URLs or specialist-domain URLs. Replace these records with links only after
an exact route is supplied and verified.

## 2026-09-24 — highlighted homepage identity

Apply the established white-on-black wordmark treatment to the institutional-index
homepage name and extend the same highlight language to its role line. Keep each
name line content-width, preserve the single accessible H1 name, and allow the role
line to wrap within its own highlight at narrow widths. Other headings and body
copy retain their existing treatments.

## 2026-09-24 — unnumbered, stage-width homepage sections

Remove decorative two-digit numbers from section headings, inquiry records and
ecosystem statements, including the grid columns and offsets reserved for them.
Use the 94rem stage shell for every homepage section and the footer so the content
below the fold follows the same outer width and gutters as the hero. Retain semantic
heading levels, section borders and distinct surfaces as the hierarchy system.

## 2026-09-24 — four-route practice index and supporting pages

Supersede the earlier six-movement homepage candidate with the approved concise
index. Keep the identity hero, then present Media, Archives and Memory; Community
Service; Systems and Institutions; and Art as four equally legible editorial
routes. The menu uses the same route labels and marks the current page.

Publish each route as a real supporting page with the supplied long-form copy, a
local table of contents, audited onward destinations and sibling navigation. Apply
the standard-page banner rule here—not to the homepage—with a 16:9 desktop/tablet
frame and a 1:1 mobile frame. Because no final artwork, focal point or alt text was
supplied, use the neutral decorative “Image pending” state and do not invent work.
The editorial QA table in the source document is guidance, not publishable copy.

## 2026-09-24 — compact supporting-page rhythm

Remove the repeated `jaredgoldberg.org` link and generic “Practice section” label
from all four supporting-page heroes. On desktop and tablet, begin the H1 at the
menu trigger’s lower edge so the title and global control share one top band.
Reduce the banner-to-content gap to 48px and each side of an article divider to
32px; use 32px and 24px respectively on mobile. Keep the local contents navigation,
banner ratios, article width and mobile menu-safe title offset unchanged.

## 2026-09-25 — balanced contents and article columns

Rename the supporting-page navigation label from “On this page” to “Table of
contents.” Remove the empty grid track between navigation and article, retain a
1.618rem column gap, and let the article run from track three to the right edge of
the stage media. Supporting-page paragraphs follow that article width rather than
the global 66ch cap. Below 768px, retain the established single-column flow.

## 2026-09-25 — compact homepage opening and stacked index introduction

Reduce the institutional-index hero cap from 58rem to 44rem on desktop and
tablet. Align the opening paragraph with the top of the `GOLDBERG` highlight,
while retaining the natural-height mobile flow. Give the index heading and its
explanatory sentence the same wider eight-track column, with the sentence below
the heading, so they read as one introduction rather than two opposing labels.
