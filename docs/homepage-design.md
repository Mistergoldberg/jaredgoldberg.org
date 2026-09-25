# Institutional index and supporting pages

Status: implemented candidate, 2026-09-24.

## Information architecture

The homepage is the shortest route into one practice. It keeps the established
identity hero and uses the supplied opening copy, then presents four internal
destinations:

1. Media, Archives and Memory
2. Community Service
3. Systems and Institutions
4. Art

The index, drawer menu and supporting-page sibling navigation use the same labels
and URLs. There are no decorative numbers or dedicated number columns. The
homepage retains one H1, one H2 for the index and four H3 entry titles.

Each supporting page uses one H1 without a repeated site name or generic section
kicker, a standard-page media slot, a “Table of contents”
navigation generated from its H2 sections, the complete supplied article copy,
an onward-destinations list and all four sibling routes. The active internal route
uses `aria-current="page"` in both navigation systems.

## Media decision

The homepage remains intentionally text-led and does not use the standard-page
banner. Each supporting page does use that established primitive: 16:9 at desktop
and tablet, 1:1 below 768px. No final artwork, focal point or alt text was supplied,
so the current neutral cross-line field is decorative and visibly labelled “Image
pending.” Replacing it with an approved image does not require rebuilding the
page composition. No image is fetched and no description of unseen work appears
in the accessibility tree.

## Destination audit

Internal routes generated and verified in the artifact:

| Label | Route |
| --- | --- |
| Media, Archives and Memory | `/media-archives-and-memory/` |
| Community Service | `/community-service/` |
| Systems and Institutions | `/systems-and-institutions/` |
| Art | `/art/` |

Supplied external destinations checked successfully on 2026-09-24:

| Supporting page | Destination |
| --- | --- |
| Media, Archives and Memory | `https://pixilation.org/` |
| Media, Archives and Memory | `https://picarty.com/` |
| Community Service | `https://jaredgoldberg.ca/projects/the-money-club/` |
| Community Service | `https://jaredgoldberg.ca/projects/capital-works/` |
| Community Service | `https://jaredgoldberg.ca/projects/` |
| Systems and Institutions | `https://jaredgoldberg.ca/work/china.html` |
| Systems and Institutions | `https://jaredgoldberg.ca/work/loblaw.html` |
| Systems and Institutions | `https://jaredgoldberg.ca/work/walmart.html` |
| Systems and Institutions | `https://jaredgoldberg.ca/work/canadian-tire.html` |
| Art | `https://duchamped.com/` |

The supplied Capability Works URL deliberately uses the live `capital-works` slug;
the visible label and page copy preserve “Capability Works.” All external links use
the shared graphic external mark and stay in the same tab. No unresolved or inferred
destination is rendered as a link.

## Responsive composition

- The hero, index, standard-page hero, media, article grid, sibling navigation and
  footer share the 94rem stage shell and its outer gutters.
- The homepage hero is capped at 44rem on desktop and tablet. Its introduction
  aligns with the top of the `GOLDBERG` highlight rather than the bottom of the
  complete wordmark. Mobile retains a natural-height single-column flow.
- The index introduction occupies the first eight tracks: “Explore Jared's practice”
  uses the full width of that column and its explanatory sentence sits directly
  beneath it.
- Every shared footer identifies the domain as `JAREDGOLDBERG.ORG`. The homepage
  caption reads “An institutional index of Jared's practice,” and the index,
  drawer group and supporting-page sibling navigation use “Explore Jared's
  practice.”
- Supporting-page H1 columns span the full stage width and share both edges with
  their image frames; the text itself wraps naturally within that width.
- The homepage index uses two columns at desktop and one below 768px. Content sets
  each entry’s height; descriptions and links are never clamped.
- Supporting pages use a sticky two-track contents navigation beside an article
  that begins in track three and reaches the image’s right edge. A 1.618rem gap
  provides the desktop/tablet separation. The contents block clears the 4.75rem
  sticky header. Below 768px both regions become one flow and every contents
  subject stacks in one column.
- On desktop and tablet, the page title begins at the lower edge of the sticky
  header. The media-to-content gap is 48px; adjacent article sections use 32px on
  either side of their divider. Mobile reduces those values to 32px and 24px.
- At 320px the name highlights, role line, long headings, destination labels and
  article copy wrap without horizontal overflow. A 720px viewport exercises the
  same CSS-pixel layout as 200% zoom on a 1440px viewport.
- The sticky icon menu retains inert background handling, visible-only focus trap,
  Escape dismissal, focus restoration and the reduced-motion override.

## Editorial handling

The attachment is the editorial source and information-architecture guide. Its
homepage opening, four section summaries, four page bodies and call-to-action
labels are published; its editorial QA table is not. Copy order and factual status
language are unchanged. In particular, The Money Club is described as a live
program while Capability Works is explicitly described as a plan that still needs
research, partners, pilots and proof.

## Verification scope

Automated browser coverage includes ten homepage viewports from 1440×900 to
320×568, both desktop and mobile renders for all four supporting pages, 200%
equivalent reflow across every route, keyboard navigation, focus visibility,
reduced motion, sticky-menu behavior, axe analysis, external-request policy,
heading counts, media ratios and horizontal-overflow checks. Generated review
screenshots live under `test-results/screenshots/` and are local evidence only.

Physical iOS Safari, VoiceOver and non-Chromium review remain outstanding. A live
QA review must wait for a committed, pushed candidate and the guarded QA Nginx
allowlist update; no local screenshot should be presented as QA evidence.
