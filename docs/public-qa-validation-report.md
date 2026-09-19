# Public QA completion — 2026-09-19

Verified at 06:54:17 UTC: **https://qa.jaredgoldberg.org/**.
No final content development was started. This report supersedes the initial
local-only status in `validation-report.md`.

## Fonts

Raleway normal 400/700/900 is now deterministic and self-hosted. Source homepage
styles declare those weights but load no font: CDP found this Mac's installed
Raleway 2.001. Source inner pages request Google Fonts Raleway normal 400/600/700.
Their exact Latin variable WOFF2 is Raleway 4.026, weight axis 100–900; the same
binary supports the fixture's 900. Source production has no stored font binaries.
The source-served file was copied without modification or renaming, under its
verified SIL OFL 1.1 license. No proprietary-license decision remains outstanding.

Exact observed URL:
`https://fonts.gstatic.com/s/raleway/v37/1Ptug8zYS_SKggPNyC0IT4ttDfA.woff2`.
[Font evidence](font-evidence/README.md) records stylesheet URLs, CDP/network
observations, metadata, SHA-256 and the [upstream license](https://raw.githubusercontent.com/google/fonts/main/ofl/raleway/OFL.txt).

Font correction commit: `020fd14` — `fix: restore source typography with local webfonts`.
Changed files include `public/fonts/1Ptug8zYS_SKggPNyC0IT4ttDfA.woff2`,
`public/fonts/OFL.txt`, `src/styles/fonts.css`, `tests/font-policy.json`, browser
and artifact font assertions, the release/font allowlists, README, design inventory,
decision log, provenance evidence and local screenshots. License text uses LF and
normalized trailing whitespace; the font binary is byte-identical to the provider.

Local/public visual review found stable header/menu geometry, no menu wrapping or
clipped controls, expected heading/body line breaks and responsive columns. Drawer
widths match source references. Menu button width changes by -0.015625 CSS px from
the old installed font; desktop x shifts +0.0078125 px, while y/height and mobile x
are unchanged. QA specimens have different content from the source carousel, so
whole-page pixel equivalence is not claimed. Actual webfont rendering at 400/700/900
was verified with CDP, not merely CSS family-name checks.

## Git and release identity

Deployed full Git SHA: `1def54455a07f6c305460e561fd1157aa6ec256f`.
Commit message: `fix: download QA rollback artifacts with compatible SCP paths`.

Deployment ID: `20260919T065328Z-1def54455a07`.

Artifact manifest SHA-256:
`4db3def23faf1c8ec4f8811b583e4a6f7e0e75017442223272687bae0dabde38`.

Uploaded tar SHA-256:
`7073bddb7d6d005c719ea0bc02453e14c524ada8b955f4f208e1fcb82e3d2388`.

The artifact contains eight public files plus the manifest. A fresh clean Git
archive was built and tested, then uploaded, remotely verified against the local
manifest and sealed read-only before the atomic QA switch. Production's symlink
was never used. [Deployment record](public-qa-evidence/deployment.json),
[manifest](public-qa-evidence/artifact-manifest.json) and
[deployment log](public-qa-evidence/deployment.log) preserve the evidence.

A subsequent documentation-only commit records this report and screenshots. It
is not the deployed build; the full SHA above and public release.json identify
that build. No Git history rewrite, force push or repository push occurred.

## DNS, TLS and Nginx

Cloudflare authoritative nameservers remain braelyn.ns.cloudflare.com and
peyton.ns.cloudflare.com. Account/zone and configured edit access were verified
before writes. The only added record is DNS-only A `qa.jaredgoldberg.org` →
`5.161.223.134`, TTL 300, ID `2f9a213e253b488957d6be3cc6075ea5`.
Existing proxied apex A and www CNAME are unchanged, including modification times;
no AAAA or other records were introduced. Zone SSL remains strict.

Target remains `ubuntu-4gb-ash-1` at the verified IP. The separate Let's Encrypt
certificate covers only qa.jaredgoldberg.org, expires 2026-12-18 05:44:43 UTC,
and uses the installed Certbot webroot method and active renewal timer. Its
certificate-specific renewal hook tests Nginx then gracefully reloads it. The
existing production certificate retains apex/www coverage and its 2026-12-17 expiry.

Nginx configuration: `/etc/nginx/sites-available/qa.jaredgoldberg.org`, with its own
matching enabled symlink. Document root: `/var/www/jaredgoldberg.org/qa-current`.
Current target: `/var/www/jaredgoldberg.org/releases/20260919T065328Z-1def54455a07`.
Only the new QA configuration was changed; its bootstrap version was backed up.
Complete candidate nginx -t passed before activation, followed by another test
and graceful reload. [Runbook](qa-runbook.md) records configuration checksum,
renewal paths, installation evidence and rollback procedure.

## Public verification

The exact-SHA local suite passed: 9 Node test/subtest results and 9 Python release
safety tests. Public verification used direct HTTPS from this Mac, outside the
server, with ordinary certificate validation; no TLS bypass or request fulfillment.

- HTTP → same-path QA HTTPS; valid certificate; homepage and all CSS/JS/font/icon,
  license, robots, identity and manifest files return 200 with correct MIME types.
- Every public artifact byte matches the tested build. X-Robots-Tag is
  noindex/nofollow; robots disallows all; HTML and unhashed files use no-store;
  hashed CSS/JS use one-year immutable caching. Security headers pass.
- Repository/environment/source/map/script/documentation/directory paths return
  404. No production canonical, analytics, external requests, source-site requests,
  mixed content, console errors or failing runtime assets were observed.
- Chromium 147 passed desktop/mobile menu, nested navigation, keyboard/focus trap,
  focus restoration, Escape, backdrop, scroll lock and reduced-motion checks.
- No horizontal overflow across the four required sizes plus 320×568, 768×1024,
  900×768 and 667×375. Axe reports **zero violations**, including serious violations,
  in closed and open states at each required size.

[Public browser report](public-qa-evidence/browser-report.json).
Fresh screenshots, both closed and open, are under `docs/screenshots/public-qa/`:
1440×900, 1024×768, 390×844 and 375×667. Local font captures remain separately under
`docs/screenshots/qa-fonts/`; original source captures remain untouched.

## Rollback and preservation

There was no prior accepted public QA site at the start. The tooling created and
publicly verified `baseline-20260919T065153Z-dd4bdabc5be4`, a maintenance page.
The first attempt stopped on a local SCP path compatibility error before candidate
activation; the verified maintenance baseline remained active. The fix was made
locally, committed and fully retested before retrying. No failed candidate needed
live repairs. Browser-failure rollback is covered by a dedicated release-safety test.

Current rollback target is that retained maintenance baseline. The successful
fixture release `20260919T065328Z-1def54455a07` is retained as the working baseline
for the next deployment. Both HTTP and browser gates passed before the server
ledger recorded verified, and the deployment lock is released. Follow the runbook
with current clean HEAD when invoking the recorded rollback after a docs commit.

[Preservation evidence](public-qa-evidence/preservation-result.json): all 95 recorded
existing server files and 68 local source files match their pre-work hashes.
Production target remains `/var/www/jaredgoldberg.org/releases/20260918213922`.
Production repository index.html, deployment script and Nginx template are also
unchanged. Production redirects/vhosts, source repository/site, unrelated DNS,
zone settings and existing certificates were not modified.

Remaining limits: validation used Chromium 147; physical iOS Safari and other
browser engines were not tested. The Latin font subset suits this fixture; future
non-Latin content may require additional licensed subsets. Existing mixed Nginx
listen/protocol conventions emit warnings despite successful configuration tests.
Automatic rollback depends on continued SSH/server availability, as documented.
