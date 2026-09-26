# QA runbook

## Boundary and infrastructure

QA URL: `https://qa.jaredgoldberg.org/`. Verified origin: `root@5.161.223.134`
(`ubuntu-4gb-ash-1`). QA root is `/var/www/jaredgoldberg.org/qa-current`, pointing
only to immutable `/var/www/jaredgoldberg.org/releases/<timestamp>-<sha12>`.
The separate production `current` symlink is never written by these tools.
Private deployment ledger: `/var/www/jaredgoldberg.org/shared/qa/ledger.jsonl`.

The QA allowlist includes `/` and the four published practice routes:
`/media-archives-and-memory/`, `/community-service/`,
`/systems-and-institutions/` and `/art/` (plus their exact artifact files). Before
the first deployment containing these pages, install the updated
`ops/nginx/qa.jaredgoldberg.org.conf` with the guarded vhost installer and verify
the live configuration checksum; the site release script deliberately does not
mutate Nginx.

On 2026-09-19 the authorized continuation established:

- Cloudflare DNS-only A `qa` → `5.161.223.134`, TTL 300. Existing proxied apex A and
  www CNAME remain unchanged; no AAAA exists. Zone SSL remains strict.
- Separate `/etc/nginx/sites-available/qa.jaredgoldberg.org` and matching enabled
  symlink; source template `ops/nginx/qa.jaredgoldberg.org.conf`.
- Separate Let's Encrypt certificate, only `qa.jaredgoldberg.org`, issued using
  installed Certbot's webroot authenticator. Renewal uses the existing timer,
  `/var/www/jaredgoldberg.org/shared/qa-acme`, and a certificate-specific deploy hook
  `nginx -t && systemctl reload nginx`. Initial expiry: 2026-12-18.
- HTTP redirects to QA HTTPS except the certificate challenge path. HTML/unhashed
  files use no-store; only hashed CSS/JS use immutable caching. All public responses
  have noindex/nofollow, nosniff, frame denial, same-origin referrer policy and
  restricted camera/microphone/geolocation permissions. Routes are allowlisted.

Infrastructure installation used `scripts/install-qa-vhost.py` on the verified
server. It checks collisions, guards the existing QA file by checksum, backs up
that file, tests the complete candidate configuration before activation, then tests
again and gracefully reloads. It never edits another vhost or the main nginx.conf.
The HTTP-only bootstrap template retains the ACME path needed for issuance.
Staging and validation evidence stays under `shared/qa-infrastructure/`.
The final HTTPS install evidence is `20260919T065008Z`; configuration SHA-256 is
`27087fe9a071efa6af8cf287f11980a8676b5a4020fea26515b71ab0481926ba`.
Existing mixed listen/protocol conventions produce warnings; nginx -t succeeds.

See [the completion report](public-qa-validation-report.md) for the actual deployed release, manifest
checksum, screenshots and preservation checks. The earlier validation report
records the initial local-only milestone, not current infrastructure status.

## Local verification and exact-SHA preparation

```sh
npm ci
npx playwright install chromium
npm test
npm run preview
```

On this macOS 12 workspace use `PLAYWRIGHT_CHROMIUM_EXECUTABLE` from README.
Tests exercise the emitted artifact, not the legacy root placeholder.

From a clean committed branch that has already been pushed, record the unchanged
remote-main baseline and exact candidate identity:

The pre-existing untracked `assets/` directory is the only permitted worktree
exception. Exact-SHA builds use `git archive`, never read that directory, and
reject any other tracked modification or untracked path.

```sh
QA_SHA=$(git rev-parse HEAD)
QA_SOURCE_BRANCH=$(git branch --show-current)
QA_MAIN_SHA='<RECORDED_40_CHARACTER_MAIN_SHA>'
test "$(git ls-remote --heads origin "refs/heads/$QA_SOURCE_BRANCH" | cut -f1)" = "$QA_SHA"
test "$(git ls-remote --heads origin refs/heads/main | cut -f1)" = "$QA_MAIN_SHA"
python3 scripts/deploy-qa.py --sha "$QA_SHA" \
  --source-branch "$QA_SOURCE_BRANCH" --expected-main-sha "$QA_MAIN_SHA"
```

Without `--apply`, this performs no server operations. It exports the exact Git
commit, installs locked dependencies, runs all tests with `BUILD_SHA`, and saves
`artifacts/<id>/site`, local browser evidence and a maintenance baseline. Only
site files are uploaded. Source, documentation, scripts and dependencies are
excluded. `release.json` reports the full SHA, environment, build ID and manifest
name; `artifact-manifest.json` repeats that identity and hashes every other
emitted file. Mutable local builds report worktree.

## Deployment and rollback

First deployment only, with no QA target, uses the same source arguments and adds
`--bootstrap`:

```sh
python3 scripts/deploy-qa.py --sha "$QA_SHA" \
  --source-branch "$QA_SOURCE_BRANCH" --expected-main-sha "$QA_MAIN_SHA" \
  --apply --bootstrap
```

There was no previously accepted public QA release at the start of this task.
Bootstrap creates, seals and publicly verifies an explicit maintenance baseline
before activating a candidate. Failed baseline verification removes the newly
created qa-current activation symlink. This baseline is a maintenance page, not
an earlier working site, and its verification does not claim fixture functionality.

Subsequent deployments omit `--bootstrap`:

```sh
python3 scripts/deploy-qa.py --sha "$QA_SHA" \
  --source-branch "$QA_SOURCE_BRANCH" --expected-main-sha "$QA_MAIN_SHA" \
  --apply
```

Every candidate deployment requires local HEAD and the pushed source-branch tip
to equal the full supplied SHA. It also requires authoritative remote main to
remain at the supplied baseline and requires the candidate to descend from that
baseline. These Git gates run before the build and again under the QA lock before
upload. The deployment reexports and tests the exact clean SHA. It checks TLS hostname
coverage, nginx -t and public routing, then acquires a QA-only lock. Uploaded files
must match the local manifest checksum before sealing read-only (files 444,
directories 555). The prior target is rehashed and verified publicly before the
atomic QA switch. No release is overwritten; no Nginx reload is needed to switch.

After switching, HTTP checks verify trusted HTTPS, redirects, all artifact bytes,
MIME types, security/cache/robots headers and private-path 404s. The same archived
checkout then runs `npm run test:public`: real Chromium HTTPS, font use, desktop
and mobile navigation, nested navigation, keyboard/focus, Escape, reduced motion,
overflow, console/network and axe checks. These browser gates are inside the
rollback boundary. Only after both sets pass is the release recorded as verified.
Failures restore the prior QA target and verify its public bytes. Browser evidence
is retained even on test failure. No risky live repair is attempted.

`artifacts/<id>/deployment.json` records the current/previous target, full build SHA,
manifest SHA-256, source ref, verified remote source SHA, expected/observed main
SHA and rollback command. Server activation and verification ledger entries carry
the same provenance. The retained verified fixture release becomes the baseline
for the next QA deployment.

Use the recorded previous ID for manual rollback:

```sh
git switch main
QA_SHA=$(git rev-parse HEAD)
python3 scripts/deploy-qa.py --sha "$QA_SHA" --apply --rollback 'ACTUAL_PREVIOUS_ID'
```

Replace the placeholder; do not execute it literally. Manual rollback requires
clean `main` and verifies the eligible target before switching. This is the existing
verified rollback interface: do not supply `--source-branch` or
`--expected-main-sha` in rollback mode. Set `QA_SHA` to current clean main HEAD for
the repository gate; the target release's `release.json` remains the source of
deployed artifact identity. Fixture rollback also runs browser gates; maintenance
baseline rollback verifies HTTP only.

Independent public recheck of a retained artifact:

```sh
python3 scripts/verify-qa.py artifacts/ACTUAL_ID/site
npm run test:public
```

The browser command saves fresh evidence under `test-results/public-qa`; deployed
runs retain it under `artifacts/<id>/public-qa`. Local captures remain separate.

## Failure handling

Stop on unexpected DNS/TLS/SSH/path/hash state. Preserve failed candidate releases
and logs. A QA-only lock prevents concurrent deploys; inspect the ledger, actual
symlink and active processes before clearing any stale lock. Machine crashes or
complete SSH outages can interrupt automatic recovery; do not claim success until
public verification completes. Never use legacy `scripts/deploy.sh` for QA.

## Source references

`npm run capture:source` reads the source site and writes ignored artifacts. Prior
source references are under `docs/screenshots/source`; new font captures are under
`docs/screenshots/qa-fonts`. Source repositories and production files stay read-only.

## Production build and release

Production is a separate mode, not a repurposed QA artifact. `npm run
build:production` emits crawlable HTML, an allow-all `robots.txt`,
`environment: production`, the exact supplied Git SHA and a unique build ID. QA
continues to emit `noindex, nofollow`, disallow-all robots and `environment: qa`.
The explicit build allowlist contains the homepage, four practice routes, two
hashed assets, favicon, licensed font and OFL text, robots policy, release
metadata and manifest. The development new-page fixture and retired
above-the-fold prototype are excluded from both modes.

Before any production action, record the strongest available legacy baseline:

```sh
PRODUCTION_PREVIOUS=20260918213922
PRODUCTION_PREVIOUS_INDEX_SHA256=24431c40c90228f6b910b038aaa1b57c6e352b80bba6d0c6723997a6e56a5275
```

That release has no Git metadata. These values verify its immutable path and
homepage bytes only; they do not establish an exact production Git SHA.

### Exact-SHA dry run

From a clean, pushed candidate branch, supply the observed remote-main baseline.
Without `--apply`, the command archives the exact commit, installs locked
dependencies, runs QA browser/accessibility and Python safety tests, builds and
checks the production artifact, then simulates a failed post-switch verification
and automatic restoration of the fingerprinted legacy release. It never contacts
the production mutation interface.

```sh
RELEASE_SHA=$(git rev-parse HEAD)
RELEASE_BRANCH=$(git branch --show-current)
EXPECTED_MAIN_SHA=$(git rev-parse origin/main)
python3 scripts/deploy-production.py \
  --sha "$RELEASE_SHA" --source-branch "$RELEASE_BRANCH" \
  --expected-main-sha "$EXPECTED_MAIN_SHA" \
  --expected-current-release "$PRODUCTION_PREVIOUS" \
  --legacy-release "$PRODUCTION_PREVIOUS" \
  --legacy-index-sha256 "$PRODUCTION_PREVIOUS_INDEX_SHA256"
```

The reviewed `ops/nginx/jaredgoldberg.org.conf` exposes only allowlisted routes
and assets, applies immutable caching only to hashed CSS/JS, and does not emit a
QA robots header. Installing that vhost is a separate production change: back up
the live file, stage the reviewed template, compare its SHA-256, run `nginx -t`,
atomically replace the site file, run `nginx -t` again and gracefully reload.
Do not combine configuration installation with a site release. The deployment
command refuses to apply until the active sites-available file exactly matches
the committed template and Nginx/TLS checks succeed.

### Production deployment

After the PR is reviewed and merged, start from a clean `main` whose local HEAD,
remote branch tip and remote-main identity are the same full SHA. Re-run the dry
run, confirm the expected current symlink and legacy homepage hash are unchanged,
then explicitly add `--apply`:

```sh
git switch main
git pull --ff-only origin main
RELEASE_SHA=$(git rev-parse HEAD)
python3 scripts/deploy-production.py \
  --sha "$RELEASE_SHA" --source-branch main \
  --expected-main-sha "$RELEASE_SHA" \
  --expected-current-release "$PRODUCTION_PREVIOUS" \
  --legacy-release "$PRODUCTION_PREVIOUS" \
  --legacy-index-sha256 "$PRODUCTION_PREVIOUS_INDEX_SHA256" \
  --apply
```

The apply gate rechecks Git before upload, verifies the current rollback target
over public HTTPS, uploads only manifest-listed files, rehashes and seals the new
immutable release, atomically switches `current`, and verifies HTTPS redirects,
headers, every artifact byte, pretty routes, private-path 404s and the full
browser/accessibility suite. Any post-switch failure restores and publicly
reverifies the prior target before returning an error. Preserve the failed
release and ledger for diagnosis. Do not use `scripts/deploy.sh`.

### Production rollback

Use recorded actual release IDs, never placeholders. The rollback tool requires
a clean exact remote-main checkout, accepts only the fingerprinted legacy target
or a manifest release previously recorded as publicly verified, and restores the
starting target if rollback verification itself fails.

```sh
MAIN_SHA=$(git rev-parse HEAD)
python3 scripts/rollback-production.py \
  --sha "$MAIN_SHA" \
  --expected-current-release 'ACTUAL_CURRENT_RELEASE_ID' \
  --target "$PRODUCTION_PREVIOUS" \
  --legacy-release "$PRODUCTION_PREVIOUS" \
  --legacy-index-sha256 "$PRODUCTION_PREVIOUS_INDEX_SHA256"
```

After rollback, confirm `/var/www/jaredgoldberg.org/current` resolves to the
recorded target and that the public homepage SHA-256 is the known legacy hash.
Retain both the failed release and its deployment evidence. Branch deletion is a
later, separately approved cleanup step after production verification.
