# QA runbook

## Current status and boundary

Local foundation is working. **Public deployment has not occurred.** Read-only
inspection found SSH access but `qa.jaredgoldberg.org` returns NXDOMAIN, no QA
Nginx virtual host exists, and the existing apex/www certificate does not cover QA.
No server files, symlinks, services, DNS, Cloudflare or TLS settings were changed.
No deployment ID or server rollback target exists yet.

Fixed QA URL: `https://qa.jaredgoldberg.org/`.
Fixed server: `root@5.161.223.134`.
QA release root: `/var/www/jaredgoldberg.org/releases/<timestamp>-<sha12>`.
QA symlink: `/var/www/jaredgoldberg.org/qa-current`.
Private QA ledger: `/var/www/jaredgoldberg.org/shared/qa/ledger.jsonl`.
Production's separate `current` symlink is never written by these tools.

## Local verification and preparation

```sh
npm ci
npx playwright install chromium
npm test
npm run build
npm run preview
```

Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE` as documented in README on this macOS 12 host.
The tests cover the emitted artifact, not the legacy root placeholder.

Prepare from a clean, committed `main` with the confirmed origin:

```sh
QA_SHA=$(git rev-parse HEAD)
python3 scripts/deploy-qa.py --sha "$QA_SHA"
```

This **does not contact or change the server**. It checks branch, full SHA, clean
working tree and exact origin URL; exports that Git commit into a temporary
checkout; runs `npm ci` and all tests with `QA_BUILD_SHA`; and saves the tested
artifact, browser evidence, maintenance baseline and deployment record under
`artifacts/<timestamp>-<sha12>/`. Dependencies, screenshots, source, secrets and
operational files never enter `site/`. A prepared artifact is not a deployment.

`release.json` reports the full SHA; `artifact-manifest.json` contains a SHA-256
checksum for every other emitted file. Mutable local builds report `worktree`.

## Prerequisites to resolve before deployment

These are operator tasks for a later infrastructure step, not changes made here:

1. Create only the QA hostname DNS record pointing to the verified origin. Do not
   change apex/www records, redirects, other sites or zone-wide Cloudflare settings.
   If proxying QA, confirm its SSL path and cache behavior independently; no zone
   assumptions are built into deployment.
2. Issue a certificate specifically covering QA. Do not expand/replace the
   production certificate. One explicit DNS-challenge route, if Certbot/manual DNS
   access is available, is:

   ```sh
   ssh -t root@5.161.223.134 'certbot certonly --manual --preferred-challenges dns --cert-name qa.jaredgoldberg.org -d qa.jaredgoldberg.org'
   ```

   Complete only that certificate's requested DNS challenge. Certificate files must
   exist at `/etc/letsencrypt/live/qa.jaredgoldberg.org/{fullchain,privkey}.pem`.
   The repository contains no TLS private keys or provider credentials.
3. Install the separate QA virtual host only after DNS and TLS are ready. Inspect
   for an existing QA configuration again; if one now exists, reconcile it rather
   than overwriting it. The following commands refuse existing paths, clean up only
   the newly enabled QA link if validation fails, and use a graceful reload:

   ```sh
   scp ops/nginx/qa.jaredgoldberg.org.conf root@5.161.223.134:/tmp/qa.jaredgoldberg.org.conf
   ssh root@5.161.223.134 'bash -s' <<'REMOTE'
   set -euo pipefail
   available=/etc/nginx/sites-available/qa.jaredgoldberg.org
   enabled=/etc/nginx/sites-enabled/qa.jaredgoldberg.org
   test ! -e "$available" && test ! -L "$available"
   test ! -e "$enabled" && test ! -L "$enabled"
   test -s /etc/letsencrypt/live/qa.jaredgoldberg.org/fullchain.pem
   test -s /etc/letsencrypt/live/qa.jaredgoldberg.org/privkey.pem
   openssl x509 -in /etc/letsencrypt/live/qa.jaredgoldberg.org/fullchain.pem -noout -checkhost qa.jaredgoldberg.org
   install -m 644 /tmp/qa.jaredgoldberg.org.conf "$available"
   ln -s "$available" "$enabled"
   if nginx -t; then
     systemctl reload nginx
   else
     unlink "$enabled"
     exit 1
   fi
   REMOTE
   ```

   On validation failure, the new disabled file remains available for diagnosis.
   No production vhost is edited. No reload is performed on a failed config test.
   With no `qa-current` yet, HTTPS returns 404 with QA headers. HTTP returns 404;
   no domain redirects are introduced. Do not weaken TLS checks to bypass a failure.

The template has **not** been run through Nginx here: Nginx is not installed locally,
and missing QA TLS/vhost infrastructure prevents enabling it safely on the server.
The server's existing configuration passed `nginx -T` during read-only inspection,
with pre-existing protocol-option warnings in existing sites. These were not altered.

## First deployment, subsequent deployments and rollback

Once the prerequisites pass, commit any remaining work and run:

```sh
QA_SHA=$(git rev-parse HEAD)
python3 scripts/deploy-qa.py --sha "$QA_SHA" --apply --bootstrap
```

This exports and tests the exact SHA again before upload. It checks HTTPS QA headers,
certificate hostname coverage and `nginx -t`; acquires a QA-only exclusion lock;
creates an immutable `baseline-<timestamp>-<sha12>` maintenance release; atomically
sets `qa-current`; and verifies all baseline bytes publicly. If that gate fails,
it returns QA to its previous absent-root state. Only after that baseline passes
is the candidate uploaded, checksummed, sealed read-only and atomically activated.
All public routes/assets, robots/cache headers, manifest and expected HTML bytes
must pass; otherwise the prevalidated baseline is restored and checked publicly.

For later releases, omit `--bootstrap`:

```sh
python3 scripts/deploy-qa.py --sha "$QA_SHA" --apply
```

Before switching, the prior QA release is rehashed and publicly verified. New
release directories are never overwritten. Neither QA nor production shares a
mutable build directory. Symlink switches do not require Nginx reloads. Only the
one-time vhost installation requires the validated graceful reload above.

After success, `artifacts/<id>/deployment.json` and the server's private ledger
record previous/new targets. Run the **recorded rollback command**, for example:

```sh
python3 scripts/deploy-qa.py --sha "$QA_SHA" --apply --rollback '20260919T020001Z-aaaaaaaaaaaa'
```

The ID above is an illustrative format, not an existing target. Replace it with
the actual recorded `previous` ID (including `baseline-` on the first release).
Rollback revalidates both targets, switches only QA, checks exact public bytes,
and restores the pre-rollback target if those gates fail. With no deployment in
this milestone, there is no valid server rollback command to execute yet.

Verify a known local prepared/deployed artifact independently:

```sh
python3 scripts/verify-qa.py artifacts/ACTUAL_DEPLOYMENT_ID/site
```

## Failure handling

- Stop on DNS, TLS, SSH, unexpected paths, missing rollback target or hash mismatch.
- A failed candidate stays in its unique release directory for diagnosis; nothing
  deletes production or other releases. Unused releases can be reviewed later.
- A lock under `shared/qa/lock` prevents concurrent QA deployments. If a process
  crashes, inspect the ledger, actual symlink and active SSH processes before
  manually clearing that lock. Do not clear a live deployment's lock.
- Automatic rollback covers detected activation/public-gate failures while SSH
  remains usable. A machine crash or complete SSH outage can interrupt recovery;
  use the recorded prior release after connectivity returns. Do not claim an
  unverified public deployment succeeded.
- No changes to the production deployment script or vhost are required. Never use
  `scripts/deploy.sh` for this workflow.

## Reference capture

```sh
npm run capture:source
# If direct browser HTTPS cannot load in this environment:
SOURCE_CURL_TRANSPORT=1 npm run capture:source
```

Set `SOURCE_ROOT` only if the read-only source moved. New captures go to ignored
`artifacts/source-*/`. Committed milestone references are in
`docs/screenshots/source/`; QA captures are in `test-results/screenshots/`.
