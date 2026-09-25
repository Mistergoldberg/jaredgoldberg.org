# Design-system hardening validation — 2026-09-25

## Reconciled baseline

- Branch: `feature/institutional-index-homepage`.
- Pre-change local `HEAD`, pushed branch tip and public QA release:
  `278044eab7482850cbbbef522e6b616f0b8037a4`.
- Authoritative `origin/main` during the pass:
  `455253c73fdb85f7fc01188341cffdd6a9e0eecd`.
- The current repository and decisions after the earlier `a1d0986` hardening
  commit were treated as the desired baseline. No recent design work was reset.
- The pre-existing untracked `assets/` directory was preserved without inspection,
  modification or staging.

The exact production Git revision remains unverifiable because the legacy
production release does not carry repository identity metadata. No production
deployment or production-server mutation was performed.

## Automated verification

Run with the repository-documented Chromium 147 executable:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE="$HOME/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" npm test
git diff --check
```

Results before candidate deployment:

- 41 Node/browser/accessibility tests passed.
- 22 Python release/deployment-safety tests passed.
- All five production routes passed at 1440×900, 1024×768, 768×1024,
  720×450, 667×375, 430×932, 393×852, 390×844, 375×667 and 320×568 as
  applicable. The 720×450 matrix is the repository's 200% equivalent reflow
  case.
- The production-excluded new-page fixture passed at 1440×900, 768×1024,
  720×450 and 320×568.
- Closed/open navigation, visible-only focus trap, focus restoration, Escape,
  backdrop and close-button dismissal, scroll restoration, sticky mobile control,
  current-page indication and nested disclosure passed.
- Raleway 400/700/900 and authentic variable-font 200 usage, the dark-red
  `#990202` link/focus treatment, minimum 44×44 controls, reduced motion below
  0.001 seconds, banner ratios, long-title wrapping, optional/missing media,
  external-link semantics and zero horizontal overflow passed.
- Automated axe scans reported zero violations in the exercised closed/open and
  fixture states. Runtime console errors, failed assets and unapproved external
  requests were zero; the approved Google tag loader remained the only production
  external request.
- Launching the browser test without the required macOS executable override now
  fails and tears down in about 0.3 seconds instead of leaving the local server
  and test process alive.
- `git diff --check` passed.

## Rendered comparison and evidence

The baseline commit was rebuilt in an isolated temporary checkout with the same
Chromium binary. All 40 common before/after PNG captures were byte-identical. This
covers the homepage at ten viewport states; each of the four long-form practice
routes at desktop, tablet and mobile; the short-landscape sticky-contents checks;
open navigation states; and focused top/contents/sticky captures. The hardening
pass therefore changes contracts and loading behavior without changing the
approved appearance.

Post-change screenshots are generated under `test-results/screenshots/`, including:

- `home-1440x900-full.png`, `home-1024x768-full.png`,
  `home-390x844-full.png`, `home-320x568-full.png`;
- a full-page capture for every practice route at 1440×900, 768×1024 and 390×844;
- `new-page-fixture-1440x900-full.png`,
  `new-page-fixture-768x1024-full.png` and
  `new-page-fixture-320x568-full.png`.

The screenshots were visually reviewed, not merely refreshed. The fixture's long
title, metadata, meaningful optional-media placeholder, two action variants,
project record, writing record and reading-width notes remained readable and
unclipped. Existing homepage and practice-page hierarchy, sticky contents,
wide-article decision, full-bleed mobile indexes and placeholder presentation were
unchanged.

The uncompressed shared CSS grows from 38,525 to 39,639 bytes to support the new
media variants and semantic tokens; gzip size grows from 7,948 to 8,101 bytes
(153 bytes). Navigation JavaScript remains exactly 2,982 bytes. The development
fixture and its builder are absent from `dist/`.

## Limits

- Physical iOS Safari, VoiceOver, non-Chromium engines and real 200% browser zoom
  remain untested; responsive equivalent reflow and automated accessibility checks
  are not substitutes for those reviews.
- Final practice-page artwork, focal points and asset-specific alt text remain
  unsupplied. The intentional placeholders remain in production routes.
- No local project, research-index, writing, archive or biography/CV route exists
  to test. Their semantic renderers are exercised in the development fixture and
  unit tests without inventing publishable content or destinations.
