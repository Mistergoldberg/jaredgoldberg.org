# Editorial and SEO copy update — QA report

Status: **verified on public QA**. Production and every other domain are unchanged.

- Branch: `codex/editorial-seo-copy-update`
- QA source commit: `b42e9df96198942a01858a0107283be5688c181d`
- QA deployment: `20260927T004323Z-b42e9df96198`
- Manifest SHA-256: `fbd9cf7b5e8d3724819cf187b30f87a340d2aa6ba0fd668743243bcad713e02d`
- Previous verified QA release: `20260927T001956Z-6588fe1a9916`
- QA base: <https://qa.jaredgoldberg.org/>
- Deployment record: [deployment.json](editorial-copy-evidence/deployment.json)
- Public browser report: [public-qa-browser-report.json](editorial-copy-evidence/public-qa-browser-report.json)
- Final public page audit: [public-page-audit.json](editorial-copy-evidence/public-page-audit.json)
- Source/test/review diff: [implementation.diff](editorial-copy-evidence/implementation.diff)

## Route mapping

Repository inspection confirmed four established section routes. The supplied
`/learning-work-and-agency/` path was a placeholder and returns 404 on the public
site. In accordance with the brief, its label and copy were updated while its
established route was retained.

| Page | Supplied path | Implemented path | Content source |
|---|---|---|---|
| Homepage | `/` | `/` | `src/content/homepage.mjs` |
| Media, Archives and Memory | `/media-archives-and-memory/` | `/media-archives-and-memory/` | `src/content/section-pages.mjs` |
| Learning, Work and Agency | `/learning-work-and-agency/` | `/community-service/` | `src/content/section-pages.mjs` |
| Systems and Institutions | `/systems-and-institutions/` | `/systems-and-institutions/` | `src/content/section-pages.mjs` |
| Art | `/art/` | `/art/` | `src/content/section-pages.mjs` |

## Homepage

| Field | Final output |
|---|---|
| Actual public URL | <https://jaredgoldberg.org/> (unchanged production) |
| QA review URL | <https://qa.jaredgoldberg.org/> |
| Content file | [`src/content/homepage.mjs`](../src/content/homepage.mjs) |
| HTML title | `Art, Archives and Systems \| Practice Index` |
| H1 | `Art, archives and systems in practice` |
| Meta description | `An index of art, digital archives, participatory software, education projects and work with large institutions.` |
| Internal links | `/media-archives-and-memory/`; `/community-service/`; `/systems-and-institutions/`; `/art/` |
| External links | `https://jaredgoldberg.ca/writing/`; `https://duchamped.com/` |
| QA status | HTTP 200; exact title/description; one H1; footer credit present; no editorial labels; meta and header noindex; zero axe violations |
| Evidence | [Desktop 1440×900](screenshots/editorial-copy/home-1440x900-full.png); [mobile 390×844](screenshots/editorial-copy/home-390x844-full.png); [complete copy review](copy-reviews/01-homepage.md) |

## Media, Archives and Memory

| Field | Final output |
|---|---|
| Actual public URL | <https://jaredgoldberg.org/media-archives-and-memory/> (unchanged production) |
| QA review URL | <https://qa.jaredgoldberg.org/media-archives-and-memory/> |
| Content file | [`src/content/section-pages.mjs`](../src/content/section-pages.mjs) |
| HTML title | `640 × 480, Pixilation and Picarty \| Media Archives` |
| H1 | `Digital image archives, pixilation and participatory photography` |
| Meta description | `How the 640 × 480 image archive, Pixilation player and Picarty Mashup use sequence, software and participation to change photographs.` |
| Internal links | Three table-of-contents anchors; `/`; the four established section paths |
| External links | `https://pixilation.org/`; `https://picarty.com/`; `https://jaredgoldberg.ca/writing/medium-is-the-message/` |
| QA status | HTTP 200; exact title/description; one H1; footer credit present; no editorial labels; meta and header noindex; zero axe violations |
| Evidence | [Desktop 1440×900](screenshots/editorial-copy/media-archives-and-memory-1440x900-full.png); [mobile 390×844](screenshots/editorial-copy/media-archives-and-memory-390x844-full.png); [complete copy review](copy-reviews/02-media-archives-and-memory.md) |

## Learning, Work and Agency

| Field | Final output |
|---|---|
| Actual public URL | <https://jaredgoldberg.org/community-service/> (unchanged production) |
| QA review URL | <https://qa.jaredgoldberg.org/community-service/> |
| Content file | [`src/content/section-pages.mjs`](../src/content/section-pages.mjs) |
| HTML title | `The Money Club and Capability Works \| Learning and Work` |
| H1 | `What does a person need in order to act?` |
| Meta description | `An account of The Money Club’s youth financial-literacy pilot and Capability Works, a proposed approach to employment by design.` |
| Internal links | Three table-of-contents anchors; `/`; the four established section paths |
| External links | `https://the-money-club.org/`; `https://jaredgoldberg.ca/projects/the-money-club/maiden-voyage/`; `https://jaredgoldberg.ca/writing/the-money-club-as-a-deployable-education-system/`; `https://jaredgoldberg.ca/projects/capital-works/`; `https://jaredgoldberg.ca/writing/the-future-of-work-is-a-design-problem/`; `https://jaredgoldberg.ca/writing/dignity-is-a-systems-output/` |
| QA status | HTTP 200; exact title/description; one H1; virtual-cash and proposal distinctions present; footer credit present; no editorial labels; meta and header noindex; zero axe violations |
| Evidence | [Desktop 1440×900](screenshots/editorial-copy/community-service-1440x900-full.png); [mobile 390×844](screenshots/editorial-copy/community-service-390x844-full.png); [complete copy review](copy-reviews/03-community-service.md) |

## Systems and Institutions

| Field | Final output |
|---|---|
| Actual public URL | <https://jaredgoldberg.org/systems-and-institutions/> (unchanged production) |
| QA review URL | <https://qa.jaredgoldberg.org/systems-and-institutions/> |
| Content file | [`src/content/section-pages.mjs`](../src/content/section-pages.mjs) |
| HTML title | `How Institutions Make Decisions \| Systems and Retail` |
| H1 | `How institutions make decisions` |
| Meta description | `A comparative reading of design and manufacturing in China, private label at Loblaw and retail media at Walmart and Canadian Tire.` |
| Internal links | Four table-of-contents anchors; `/`; the four established section paths |
| External links | `https://jaredgoldberg.ca/work/index.html`; the China, Loblaw, Walmart and Canadian Tire work-account URLs; `https://jaredgoldberg.ca/writing/real-systems-incentives/` |
| QA status | HTTP 200; exact title/description; one H1; institutional disclaimer present; footer credit present; no editorial labels; meta and header noindex; zero axe violations |
| Evidence | [Desktop 1440×900](screenshots/editorial-copy/systems-and-institutions-1440x900-full.png); [mobile 390×844](screenshots/editorial-copy/systems-and-institutions-390x844-full.png); [complete copy review](copy-reviews/04-systems-and-institutions.md) |

## Art

| Field | Final output |
|---|---|
| Actual public URL | <https://jaredgoldberg.org/art/> (unchanged production) |
| QA review URL | <https://qa.jaredgoldberg.org/art/> |
| Content file | [`src/content/section-pages.mjs`](../src/content/section-pages.mjs) |
| HTML title | `Duchamped, The Pitch and Artistic Value \| Art` |
| H1 | `Art and the manufacture of value` |
| Meta description | `An introduction to Duchamped, the historical stage name Jared the Jew, and artworks that test authorship and value.` |
| Internal links | Four table-of-contents anchors; `/`; the four established section paths |
| External links | `https://duchamped.com/`; `https://duchamped.com/duchamped/`; `https://duchamped.com/the-pitch/`; `https://pixilation.org/` |
| QA status | HTTP 200; exact title/description; one H1; historical-name context and financial disclaimer present; footer credit present; no editorial labels; meta and header noindex; zero axe violations |
| Evidence | [Desktop 1440×900](screenshots/editorial-copy/art-1440x900-full.png); [mobile 390×844](screenshots/editorial-copy/art-390x844-full.png); [complete copy review](copy-reviews/05-art.md) |

## Checks and evidence

- The exact-SHA deployment reran 42 Node/browser/accessibility checks and 26
  Python release-safety tests. All passed.
- The final public Chromium gate ran 33 QA checks. All passed, with no console
  errors, failed runtime responses, horizontal overflow or axe violations.
- Desktop and mobile full-page screenshots were visually inspected. A mobile
  long-title word-breaking issue found during inspection was corrected before
  deployment.
- `npm run test:production` passed its two indexability and artifact-allowlist
  checks without deploying anything.
- `npm run check:copy-overlap` compared the `.org` copy against every linked
  first-person `.ca` source. The longest shared run was seven words, below the
  18-word substantive-repetition threshold. See
  [copy-overlap.txt](editorial-copy-evidence/copy-overlap.txt).
- Every content destination returned HTTP 200 at its supplied URL with zero
  redirects during the pre-edit audit.
- The final QA audit confirms exact titles/descriptions, one H1, footer credit,
  no editorial labels, `noindex, nofollow` HTML metadata and
  `X-Robots-Tag: noindex, nofollow, noarchive` on all five pages.
- Two earlier QA attempts stopped before activation: the first exposed an
  unsynchronized `.ca` URL allowlist; the second exposed that the prior release's
  two historical URLs must remain allowlisted for rollback. The final gate keeps
  both current and rollback destinations explicit. Public QA remained on its
  prior verified release until the successful atomic activation.

## Live metadata observations

Before this deployment, both public QA and production had no canonical elements.
QA had meta and response-header noindex directives; production had neither and
was indexable. Production continues to expose the earlier titles because no
production release occurred. The final QA deployment intentionally still has no
canonical element, preserving the repository's current behavior.

Recommendation for a later, separately reviewed production metadata cycle: add
a self-referencing canonical to each distinct public `.org` route. Do not point
all five pages to the homepage. No canonical change was made in this cycle.

The known Picarty conflict was reconfirmed: `https://picarty.com/` returns HTTP
200 but declares `https://insertcatchytitlehere.com/mashup/index.html` as its
canonical. It remains unchanged, as required.

## Claims and remaining limits

- No consequential repository evidence contradicted the supplied payload. The
  prior repository copy independently placed the 640 × 480 work in Shanghai in
  2002, consistent with the supplied account.
- The August 2026 Money Club pilot date and virtual-cash account remain
  artist-supplied claims. The page explicitly limits what the pilot demonstrates.
- Capability Works remains described as a proposal. No operating employment or
  housing outcomes are claimed.
- The Pitch's prices and returns remain claims inside the artwork, not verified
  financial or securities-platform claims.
- Systems and Institutions explicitly identifies the organizational material as
  Goldberg's accounts, not statements on behalf of the named organizations.
- Browser coverage used Chromium 147 plus axe; physical iOS Safari and other
  engines were not tested.

## Diff and commits

The focused change is the diff from deployed QA baseline
`6588fe1a99163b1743ecff46e6d1bd432c2fb055` through deployed candidate
`b42e9df96198942a01858a0107283be5688c181d`:

- `460f55a` — exact page copy, metadata, render support, tests, review outputs and screenshots
- `5808fa5` — synchronize the QA verifier with the new approved `.ca` destinations
- `b42e9df` — retain the prior release's destinations so automatic rollback remains eligible

The source/test/review patch is preserved in
[implementation.diff](editorial-copy-evidence/implementation.diff). Screenshot
binaries and generated browser JSON are represented by the evidence links above.

## Production release and rollback plan

Production is unchanged. No merge, production deployment, DNS, redirect,
Cloudflare, Nginx, jaredgoldberg.ca, Duchamped, Pixilation or Picarty mutation was
performed.

For release:

1. Review the five complete copy files and desktop/mobile public-QA screenshots.
2. Approve and merge the focused branch into `main`.
3. From clean, updated `main`, record the exact remote-main SHA and current
   production release identity; run the documented production dry run.
4. Only after explicit production approval, rerun the exact command with
   `--apply`. Verify all five HTTPS routes, titles, descriptions, H1s, canonical
   policy, footer, links, response headers and browser/accessibility evidence.
5. Record the new immutable release ID and prior production target.

If QA rollback is needed, switch to clean `main` and run the recorded guarded
rollback command:

```sh
python3 scripts/deploy-qa.py \
  --sha 333c80c091437ac1e1444eaa0338dfae048d4438 \
  --apply --rollback 20260927T001956Z-6588fe1a9916
```

The command validates the target before switching and verifies it publicly after
the atomic switch. For production, use `scripts/rollback-production.py` with the
actual current and prior release IDs recorded by the production deployment; never
reuse the QA rollback command or a placeholder ID.
