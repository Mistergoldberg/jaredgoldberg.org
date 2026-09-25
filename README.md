# jaredgoldberg.org

Static institutional index and four supporting practice pages for
jaredgoldberg.org, built on the verified design system and deployable through
separate, exact-SHA QA and production release workflows.

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
npm run test:production  # production robots/identity/allowlist checks
npm run fixture:new-page # ignored design-system assembly exercise
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
  components, responsive rules, homepage composition and reduced motion.
- `src/components/`: HTML rendering and data-driven navigation components.
- `src/fixtures/`: development-only integration exercises; never emitted to `dist/`.
- `src/content/homepage.mjs`: approved four-route index copy and shared navigation.
- `src/content/section-pages.mjs`: approved long-form copy and audited destinations for
  Media, Archives and Memory; Community Service; Systems and Institutions; and Art.
- `src/navigation.js`: menu behavior; contains no navigation data.
- `public/`: only allowlisted source assets. Robots policy is generated for the
  selected build mode; unlisted files are never copied. No source-site images are transferred. The verified source-served Raleway
  webfont and its OFL license are self-hosted under `public/fonts/`. The favicon is a neutral QA square.
- `scripts/`: build, local server, source captures, isolated QA deployment and
  guarded production deployment/rollback.
- `ops/`: QA and production Nginx templates, immutable release operations and
  the first-QA-deploy baseline.
- `tests/`: artifact, browser/accessibility, font policy and release safety checks.
- `docs/`: inventory, decisions, validation, screenshots and QA runbook.
- `dist/`, `test-results/`, `artifacts/`: generated and ignored.

Change index copy, route labels and shared navigation in `src/content/homepage.mjs`.
Change supporting-page copy and onward destinations in `src/content/section-pages.mjs`.
`src/components/page.mjs` defines the semantic index and long-form compositions;
shared styles and navigation logic remain independent of content. General controls
and headings remain semantic HTML.
Binding design rules and content-pattern APIs are documented in
[`docs/design-system.md`](docs/design-system.md); homepage-specific composition and
route decisions are documented in [`docs/homepage-design.md`](docs/homepage-design.md).

## Fonts

The exact Raleway 4.026 Latin WOFF2 observed in the source site's network requests
is self-hosted with its SIL OFL license. Its verified variable weight axis covers
100–900; the homepage uses 400/700/900 and the menu uses 200. No external font requests or system-installed
Raleway files are required. See [font evidence](docs/font-evidence/README.md) for
URLs, hashes, license, the older installed font discovered on this Mac, and visual
comparison. The initial fallback policy is superseded by this correction.

## QA deployment

Public QA is verified at https://qa.jaredgoldberg.org/. See the
[completion report](docs/public-qa-validation-report.md) and
[QA runbook](docs/qa-runbook.md). The isolated QA DNS record, separate
certificate and virtual host are configured. Public deployment runs HTTP and
browser verification inside the automatic rollback boundary.
The workflow accepts an exact clean commit only when it is the authoritative tip
of a named pushed branch and still descends from the explicitly recorded
`origin/main` baseline. It runs tests and prepares an artifact before any upload.
The deploy command never pushes Git or changes production.

The original root `index.html` and `scripts/deploy.sh` are retained as baseline
files. They are **not** inputs to the new build. The production Nginx template is
now the reviewed allowlisted configuration for the guarded workflow. Do not use
the legacy deploy script for QA: it targets production and copies the repository.
Serve `dist/` through the provided commands, not the repository root.

## Production release

Production builds are explicitly indexable and carry their exact Git SHA,
environment, build ID and artifact-manifest identity. The production workflow
accepts only the exact clean remote `main` tip for `--apply`, uploads only
manifest-listed files to a new immutable release, verifies public bytes/routes,
and automatically restores the prevalidated prior target on failure. The legacy
production release remains a fingerprinted rollback target; its Git SHA is
unknown and is never inferred. See the production section of the
[operations runbook](docs/qa-runbook.md). Never use `scripts/deploy.sh` for this
artifact.

Current production (inspection only): `root@5.161.223.134`,
`/var/www/jaredgoldberg.org/current`. QA uses the distinct `qa-current` symlink.
