# Content and SEO cycle audit — 2026-09-27

## Audit identity and release boundary

- Production baseline: `333c80c091437ac1e1444eaa0338dfae048d4438`
- Reviewed implementation commit: `21172089cf7fbef7162b09b44f2914493e548fab`
- Branch: `codex/content-seo-cycle-audit`
- Routes: `/`, `/media-archives-and-memory/`, `/community-service/`, `/systems-and-institutions/`, `/art/`
- Production remained on release `20260927T000841Z-333c80c09143`; no deployment, Cloudflare change, or live Nginx change was made.
- Public QA remained on its pre-audit `d8754133ca7c8e87ce40101cd4a57e43e250c6d5` release; this audit used local production- and QA-mode artifacts.

The reviewed cycle restores the established index structure, applies the four supplied descriptive page headings, adds the approved page banners, and adds the *Narcissus as Narcosis* section and local responsive images to the Media page. The later global design-system cycle is not included.

## Scope inventory

The implementation commit contains 32 files:

- Content and rendering: `src/content/homepage.mjs`, `src/content/section-pages.mjs`, `src/components/page.mjs`.
- Page-specific layout: `src/styles/homepage.css`, `src/styles/section-pages.css`.
- Four banners: `art-manufacture-value.png`, `learning-work-agency.png`, `media-archives-and-memory.png`, `systems-and-institutions.png`.
- Twelve local *Narcissus as Narcosis* JPEG derivatives: four portraits at 480/768 widths, login composition at 480/707 widths, and iOS interface at 640/1024 widths.
- Artifact and local-server support: `.gitignore`, `scripts/build.mjs`, `scripts/serve.mjs`, `scripts/verify-production.py`, `scripts/verify-qa.py`.
- Release safety: `ops/nginx/jaredgoldberg.org.conf`, `ops/production-release.py`, `ops/qa-release.py`.
- Regression coverage: `tests/artifact.test.mjs`, `tests/browser.test.mjs`, `tests/ops_test.py`.

Explicit exclusions:

- The separate favicon-artwork commit and its README/test changes are not in the branch diff.
- The reverted editorial rewrite's copy-review files, generated reports, implementation diff, and screenshots are not in the branch diff because they describe content that is no longer rendered.
- The pre-existing untracked `assets/` directory was not modified, staged, or committed.
- The 33 MB owner source `Images/` directory remains local and ignored; only reviewed derivatives are public artifacts.
- No redirect, canonical, sitemap, social-metadata, structured-data, analytics, global token, shared media-frame, Cloudflare, or live server policy change is included.

## Findings and resolutions

| Severity | Finding | Resolution/status |
|---|---|---|
| High | No high-severity content, accessibility, crawl-control, or artifact leak was found. | No action required. |
| Medium | The former branch history included the isolated favicon commit and stale evidence from a subsequently reverted copy experiment. | Rebuilt this branch directly from `origin/main`, excluded the favicon work, removed stale evidence from the final diff, and consolidated the reviewed cycle into one implementation commit. |
| Medium | At 768 px, the homepage role strap overlapped the introduction column. | Moved the tablet introduction one grid column right in page-specific CSS and added a no-collision regression assertion. Shared tokens and global layout rules are unchanged. |
| Medium | Production serves duplicate `www`, `/index.html`, and section `/index.html` URL variants as `200`, while all five pages omit canonicals. | Open technical issue. Resolving it requires a separately approved site-wide canonical/redirect policy and live Nginx work, which this cycle explicitly excludes. |
| Low | Several portrait alternatives inferred gender unnecessarily; the Art banner alternative was awkward and the login image overstated the number of identifiable faces. | Rewrote the alternatives as factual, image-specific descriptions after inspecting the source images. |
| Low | Responsive `sizes` hints for the four-column portrait row and matching login image overstated desktop widths. | Added desktop/tablet/mobile hints that match the rendered composition; intrinsic dimensions, aspect ratios, lazy loading, and local `srcset` remain intact. |
| Low | Section pages were exercised at 390 px but not explicitly at the binding 320 px acceptance width. | Added 320×568 coverage for all four sections and retained 1440×900, 768×1024, and 720×450 200%-equivalent reflow checks for every route. |

## Content and accessibility audit

- The supplied homepage card copy, page H1s, Media metadata, *Narcissus as Narcosis* body copy, captions, link removals, four-column desktop gallery, and matching login-image height are present.
- Every route has one main H1. The homepage uses H2 for the index and H3 for its four entries; supporting pages use H2 for contents, article sections, Continue, and sibling navigation.
- All ordinary headings use the shared highlighted-heading renderer. Existing tokens, type scale, spacing rhythm, stage shell, external-link marker, same-tab link behavior, sticky contents, focus treatment, and mobile sibling navigation are retained.
- All public images are local, have intrinsic dimensions and non-empty inspected alternatives, and cause no horizontal overflow. The six below-fold Media images use lazy loading; the four banners retain eager/high priority.
- The Media gallery is four columns on desktop, two on tablet, and one on mobile. The login composition matches one portrait-row height on desktop. Faces and artwork are not CSS-cropped in the article gallery.
- Keyboard focus, skip link, modal menu focus trapping/return, table-of-contents anchor offset, reduced motion, 44 px menu targets, and axe checks passed.
- The Art copy continues to frame prices as an ask and artistic claim. Capability Works remains described as unproven and requiring research, partners, pilots, and proof. The `.org` pages remain an institutional index linking to first-person `.ca` accounts and specialist project sites.

## SEO audit

| Route | HTML title | Meta description | H1 |
|---|---|---|---|
| `/` | `Jared Goldberg — Artist, systems designer and writer` | `Jared Goldberg makes art, software, public projects and large work systems. The forms change. The main question does not: how do rules shape what people see, value and do?` | `Jared Goldberg` |
| `/media-archives-and-memory/` | `640 × 480, Pixilation and Narcissus as Narcosis` | `How 640 × 480, Pixilation and Narcissus as Narcosis use archives, interfaces and participation to change how photographs are made and read.` | `Media, archives and memory` |
| `/community-service/` | `Community Service — Jared Goldberg` | `People learn best when their choices have real effects. People can work when jobs fit what they can do. Both need clear rules, useful tools and fast feedback.` | `Learning, work and agency` |
| `/systems-and-institutions/` | `Systems and Institutions — Jared Goldberg` | `Large systems do not run on good intentions. They run on rules, incentives, roles, habits and flows of information.` | `Systems and institutions` |
| `/art/` | `Art — Jared Goldberg` | `Jared Goldberg’s art asks a blunt question. Who can name a work, set its price and make that price count?` | `Art and the manufacture of value` |

- Titles and descriptions are unique, present once, factually supported by their pages, and contain no QA language or unsupported outcome claim.
- Production HTML contains no `noindex`/`nofollow`; production `robots.txt` is `Allow: /`. QA HTML and responses retain `noindex, nofollow`, and QA `robots.txt` disallows all.
- Internal links are root-relative, crawlable anchors to the five established routes. Artifact tests verify that every internal target and table-of-contents fragment exists.
- All ten editorial destinations returned `200` with zero redirects on 2026-09-27: Pixilation, Picarty, The Money Club, Capability Works, the `.ca` projects index, four `.ca` work accounts, and Duchamped. External links remain same-tab, visibly marked, and are not `nofollow`.
- The current Picarty page still declares the legacy `insertcatchytitlehere.com/mashup/index.html` canonical. That external-site conflict is recorded but unchanged.
- There is no sitemap. For this five-page, comprehensively linked site, Google documents that a sitemap may be unnecessary; adding one remains optional.
- Open Graph, X/Twitter metadata, and structured data are absent by existing policy. Their absence is not an indexing defect, but social previews and any schema type require an editorial decision before a future site-wide implementation.

Primary guidance consulted:

- Google Search Central, title links: https://developers.google.com/search/docs/appearance/title-link
- Google Search Central, canonical URLs: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google Search Central, robots meta and response headers: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- Google Search Central, sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview

## Verification evidence

- Exact-SHA QA suite: `BUILD_SHA=21172089cf7fbef7162b09b44f2914493e548fab BUILD_ID=qa-audit-21172089cf7f ... npm test` — 45 Node/browser/accessibility checks and 27 Python release-safety checks passed.
- Exact-SHA production suite: `BUILD_SHA=21172089cf7fbef7162b09b44f2914493e548fab BUILD_ID=production-audit-21172089cf7f npm run test:production` — 2 production indexability/artifact checks passed.
- Production artifact: 28 allowlisted files plus manifest; no QA hostname, `noindex`, `nofollow`, prototype path, test-results path, localhost reference, or Duchamped source-image hotlink was found.
- Browser: Playwright Chromium `147.0.7727.15` with axe-core. Every route was tested at 1440×900, 768×1024, 320×568, and 720×450 200%-equivalent reflow; the broader suite also covered 1024×768, 390×844, 375×667, landscape mobile sizes, open/closed menus, sticky contents, anchors, focus, and reduced motion.
- Local ignored evidence: `test-results/browser-report.json` and `test-results/screenshots/`, including full-page captures for every route at the required widths and 200%-equivalent reflow.
- External-link cold checks: ten destinations returned `200`, `text/html`, and zero redirects.
- Limits: no Firefox, physical Safari/iOS, VoiceOver, other screen reader, Search Console, or field Core Web Vitals test was run.

## Decisions before closeout

1. Approve a later canonical/redirect policy: apex `https://jaredgoldberg.org` as preferred host, self-referencing canonicals, and permanent redirects from `www` and `/index.html` variants. This requires a separate metadata/Nginx cycle.
2. Decide whether the Learning, Systems, and Art pages should keep their current concise titles/descriptions or receive project-specific search copy. The present metadata is accurate; changing it is editorial optimization, not a technical repair.
3. Decide whether to commission route-specific social titles/descriptions/images and, only where justified, structured data.
4. In the separate global design-system cycle, consider responsive WebP/AVIF banner derivatives and extending `renderMediaSlot` with `srcset`/`sizes`; the current PNG banners are 1.4–2.4 MB each.
