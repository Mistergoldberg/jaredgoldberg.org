# Design-system hardening validation — 2026-09-23

## Baseline

- Starting branch: `feature/above-the-fold-section-v1` at `4576330aeb14c180e85637c62eb602d1de66f5dd`, matching its pushed remote tip.
- Remote default branch: `origin/main` at `455253c73fdb85f7fc01188341cffdd6a9e0eecd`.
- Public QA: `https://qa.jaredgoldberg.org/release.json` and the server's `qa-current` release both identified `4576330aeb14c180e85637c62eb602d1de66f5dd` (`20260923T210459Z-4576330aeb14`).
- Production: `/var/www/jaredgoldberg.org/current` resolved to immutable release `20260918213922`. It has no `release.json`, so an exact Git SHA cannot be established. Its `index.html` SHA-256 is `24431c40c90228f6b910b038aaa1b57c6e352b80bba6d0c6723997a6e56a5275`, identical to the tracked legacy file last changed by `07b603be8a2fea80612eb93b2c0a62bc8ac50a52`.
- Pre-existing untracked `assets/` was treated as user-owned; beyond identifying its path during inventory, it was not inspected, modified, staged or committed.

## Automated results

Run from the design-system branch with the repository-documented Chromium 147 executable:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE="$HOME/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" npm test
git diff --check
```

Results:

- 21 Node/browser/accessibility tests passed, including the emitted artifact, URLs/assets, self-hosted Raleway, token rules and content renderer contracts.
- 18 Python release/deployment safety tests passed.
- All seven approved project records and all five inquiries passed through one set of reusable render APIs. Tests also cover archive and writing semantics, external-link behavior, URL/variant rejection and meaningful/decorative placeholders.
- Chromium passed at 1440×900, 1024×768, 768×1024, 720×450, 667×375, 430×932, 393×852, 390×844, 375×667 and 320×568, plus 200% equivalent reflow.
- At each primary state: no horizontal overflow; real and placeholder banner frames held 16:9 at desktop/tablet and 1:1 on mobile; long record titles and variable summaries remained visible; buttons and menu targets met 44×44; Raleway weights and the dark-red dual focus treatment were present.
- Menu open/close, nested disclosures, visible-only focus trap, focus restoration, Escape, backdrop dismissal, scroll restoration, sticky mobile control and in-page target focus passed.
- Reduced-motion transitions measured below 0.001 seconds. Closed and open automated axe scans reported zero violations. Console errors, failed assets and unexpected external requests were zero; the approved Google tag loader was the only external request.
- `git diff --check` passed.

## Visual review

Generated screenshots were reviewed for closed and open states at desktop, tablet and mobile, plus focused content-pattern captures at 1440×900 and 390×844. The review confirmed:

- prominent Black headings retain the tighter rhythm without clipping;
- the near-white drawer, graphic close/chevron controls and mobile menu icon remain consistent;
- project title, metadata, summary and action columns collapse cleanly to one mobile column;
- metadata wraps as separate items without stranded separators;
- dark-red links and focus outlines remain legible on approved light surfaces;
- the neutral placeholder communicates asset absence without suggesting artwork;
- no record or banner introduced horizontal overflow.

The in-app browser execution surface was unavailable after capability discovery, so the repository's standalone Playwright/Chromium path and generated screenshots were used for the rendered review.

## Limits and unresolved inputs

- No production deployment was performed. QA was inspected but not updated; the runbook does not require a QA deployment for every design-system commit.
- Final banner/project artwork, focal points and asset-specific alt text remain unsupplied and cannot be approved from placeholders.
- Final homepage information architecture, section composition, navigation labels/destinations and page-specific hierarchy remain for the later landing-page stage.
- Physical iOS Safari, VoiceOver and non-Chromium engines remain untested.
- Production's exact source commit remains unprovable because the legacy release contains no Git identity metadata.
