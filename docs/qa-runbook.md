# QA runbook

## Boundary and infrastructure

QA URL: `https://qa.jaredgoldberg.org/`. Verified origin: `root@5.161.223.134`
(`ubuntu-4gb-ash-1`). QA root is `/var/www/jaredgoldberg.org/qa-current`, pointing
only to immutable `/var/www/jaredgoldberg.org/releases/<timestamp>-<sha12>`.
The separate production `current` symlink is never written by these tools.
Private deployment ledger: `/var/www/jaredgoldberg.org/shared/qa/ledger.jsonl`.

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
commit, installs locked dependencies, runs all tests with QA_BUILD_SHA, and saves
`artifacts/<id>/site`, local browser evidence and a maintenance baseline. Only
site files are uploaded. Source, documentation, scripts and dependencies are
excluded. `release.json` reports the full SHA; `artifact-manifest.json` hashes all
other emitted files. Mutable local builds report worktree.

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
