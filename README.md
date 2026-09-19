# jaredgoldberg.org

Minimal QA foundation for the future jaredgoldberg.org site. The design primitives
come from the existing homepage system; all page specimens and navigation labels
are temporary. This repository does not define the final content architecture.

## Stack and local setup

Static HTML, layered CSS and a small browser JavaScript module. A dependency-free
Node build renders components and fixture data, hashes CSS/JS, and emits only the
public artifact. Playwright and axe are development dependencies. Node 22+ and
Python 3.10+ are required for the full verification/deployment toolchain.

```sh
npm ci
npx playwright install chromium
npm run dev
```

Open `http://127.0.0.1:4173`. Development rebuilds when `src/` or `public/` changes;
reload the browser after a change. Override the port with `PORT=4175` if needed.

```sh
npm test                 # build + artifact/HTTP/browser/accessibility/release checks
npm run build            # dist/ only; no deployment
npm run preview          # serve the existing dist/ at 127.0.0.1:4173
npm run test:browser     # browser checks against the existing local build
npm run test:public      # direct HTTPS browser checks of the public QA site
```

On this macOS 12 workspace, current Playwright cannot download a supported browser.
The milestone was tested with the existing Chromium 147 binary:

```sh
export PLAYWRIGHT_CHROMIUM_EXECUTABLE="$HOME/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
npm test
```

Other supported environments should use the normally installed Playwright browser.

## Source organization

- `src/styles/`: tokens, font policy, base, typography, layout, navigation,
  components, responsive rules, fixture composition and reduced motion.
- `src/components/`: HTML rendering and data-driven navigation components.
- `src/content/qa-fixture.mjs`: temporary identity, labels and specimen content.
- `src/navigation.js`: menu behavior; contains no navigation data.
- `public/`: only public assets and QA robots policy. No source-site images are transferred. The verified source-served Raleway
  webfont and its OFL license are self-hosted under `public/fonts/`. The favicon is a neutral QA square.
- `scripts/`: build, local server, source captures and isolated QA deployment.
- `ops/`: QA Nginx template, immutable release operations and first-deploy baseline.
- `tests/`: artifact, browser/accessibility, font policy and release safety checks.
- `docs/`: inventory, decisions, validation, screenshots and QA runbook.
- `dist/`, `test-results/`, `artifacts/`: generated and ignored.

Change future labels and destinations in `src/content/qa-fixture.mjs`. Replace the
fixture composition in `src/components/page.mjs` without changing the shared
styles or navigation logic. General controls and headings remain semantic HTML.

## Fonts

The exact Raleway 4.026 Latin WOFF2 observed in the source site's network requests
is self-hosted with its SIL OFL license. Its verified variable weight axis covers
100–900; the fixture uses 400/700/900. No external font requests or system-installed
Raleway files are required. See [font evidence](docs/font-evidence/README.md) for
URLs, hashes, license, the older installed font discovered on this Mac, and visual
comparison. The initial fallback policy is superseded by this correction.

## QA deployment

Public QA is verified at https://qa.jaredgoldberg.org/. See the
[completion report](docs/public-qa-validation-report.md) and
[QA runbook](docs/qa-runbook.md). The isolated QA DNS record, separate
certificate and virtual host are configured. Public deployment runs HTTP and
browser verification inside the automatic rollback boundary.
The new workflow exports an exact clean `main` SHA, runs tests, and prepares an
artifact before any upload. It never pushes Git or changes production.

The original root `index.html`, `scripts/deploy.sh` and production Nginx template
are retained as baseline files. They are **not** inputs to the new build. Do not use
the legacy deploy script for QA: it targets production and copies the repository.
Serve `dist/` through the provided commands, not the repository root.

Current production (inspection only): `root@5.161.223.134`,
`/var/www/jaredgoldberg.org/current`. QA uses the distinct `qa-current` symlink.
