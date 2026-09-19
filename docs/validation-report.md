# Foundation validation

Validated locally on 2026-09-18 (Toronto), Chromium 147.0.7727.15,
Playwright 1.63.0, axe 4.13.0 and Node 24.12.0. No public QA deployment occurred.

## Results

- `npm test`: build, all 9 Node test/subtest results and 8 Python release tests passed. Includes artifact
  allowlist and checksums, local href/src/CSS asset/fragment checks, analytics and
  production-metadata exclusion, font policy, HTTP routes and QA cache/robots headers.
- Browser gates passed at 1440×900, 1024×768, 390×844 and 375×667. Extra cases:
  320×568, 768×1024, 900×768 and coarse-pointer 667×375 landscape.
- Menu open/close by keyboard and pointer; native nested disclosures; visible-only
  Tab/Shift+Tab cycling; Escape; close button; backdrop; inert background; trigger
  focus restoration; hash-target keyboard continuation; page-scroll restoration.
- Reduced-motion transition duration measured below .001 seconds. Browser zoom is
  not disabled. No horizontal overflow in tested viewport states.
- Zero page/console errors, external requests or HTTP asset errors in the QA fixture.
- Zero axe violations in both open and closed states at all four primary sizes.
- `/`, `/index.html`, `/robots.txt`, `/release.json`, `/artifact-manifest.json` and
  every emitted asset returned 200 locally. Private source paths and unknown routes
  returned 404. POST returned 405 in the development server.
- `python3 -m unittest discover -s tests -p '*_test.py'`: 8 release-safety tests
  passed. Covers atomic switches/rollback, preservation of production, absent/stale
  rollback rejection, bad checksums/symlinks, read-only sealing, overwrite refusal,
  exclusive locks, failed bootstrap recovery, failed public gates and a lost SSH
  response after activation. These are local simulations, not a server deployment.
- `git diff --check` passed before commits.

## Visual comparison

| Viewport | Source / QA drawer width (CSS px) | Menu button geometry delta |
| --- | --- | --- |
| 1440×900 | 352 / 352 | x, y, width, height: 0 |
| 1024×768 | 352 / 352 | x, y, width, height: 0 |
| 390×844 | 327.59375 / 327.59375 | x, y, width, height: 0 |
| 375×667 | 315 / 315 | x, y, width, height: 0 |

Captured baseline source in `docs/screenshots/source/`; reviewed QA captures in
`docs/screenshots/qa/`. Each has the four viewport sizes with open/closed menus.
Regenerated QA screenshots go to `test-results/screenshots/`. Computed results are
recorded in `docs/browser-validation.json`; source evidence is in
`docs/screenshots/source/observations.json`.

Deliberate differences from the source homepage:

- New .org identity and explicitly temporary fixture text/navigation; neutral QA
  favicon and decorative fixture symbols instead of old page icons.
- Source general page gradient, content-width shells, type hierarchy, buttons,
  surfaces and footer demonstrated in a scrolling fixture. Source homepage's
  editorial carousel, preview rail, pagination, imagery and auto-advance excluded.
  Header trigger retains its source geometry even without the preview rail.
- Active QA home label is underlined; source homepage lacks a current-page marker.
- Closed details cannot capture focus. Background and closed drawer are inert.
  Valid dialog semantics, zoom allowed, hash-target focus, reliable scroll return,
  reduced motion and visible exit animation improve accessibility. Keyboard-open
  screenshots show the focus ring on the close button.
- Footer is sourced from the component stylesheet; not visible on the old homepage.

## Explicit limits / unresolved gates

No source font binaries exist. The chosen homepage has zero font requests and
preserves the Raleway/Avenir Next/Segoe UI/sans-serif declaration. Therefore the
embedded-font-loading gate is explicitly not applicable, not a successful transfer
of Raleway. Inner pages use Google Fonts, which was not carried over. Licensed local
font files/formats still need to be supplied or the fallback policy accepted.

The browser execution tool for the in-app browser was unavailable. Standalone
Playwright used the existing Chromium 147 because current downloads do not support
macOS 12. Direct browser HTTPS source navigation timed out; baseline captures used
live responses fetched by curl with TLS verification and fulfilled into Playwright.
The local source rendered directly. Physical iOS Safari/VoiceOver and another engine
have not been tested. Axe is an automated check, not a complete accessibility audit.

QA DNS is NXDOMAIN; a QA TLS certificate and Nginx virtual host are absent. The
prepared QA Nginx template was not runtime-validated or installed. Existing server
configuration passed read-only inspection, with unrelated pre-existing warnings.
Public QA artifact/headers, live rollback and graceful config reload are unexecuted
until the documented prerequisites exist. No deployment ID or server rollback target
is available for this milestone.

## Next three actions

1. Resolve only QA DNS, certificate and vhost prerequisites, then run the exact-SHA
   bootstrap deployment and its public verification gates in the runbook.
2. Confirm homepage-system selection and supply licensed local Raleway assets (with
   origin/formats) or explicitly retain the documented fallback behavior.
3. Review the QA shell and drawer on a physical mobile Safari device and with a
   screen reader before starting any final editorial architecture.

Final preservation check: all 68 non-Git source files matched their initial SHA-256
fingerprints. The original destination placeholder, production deploy script and
production Nginx template are unchanged. The server's production symlink still
resolves to `releases/20260918213922`; QA remains absent and DNS still NXDOMAIN.
