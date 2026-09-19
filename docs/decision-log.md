# Foundation decisions

## 2026-09-18

1. Keep plain HTML/CSS/JavaScript. The destination had only a static placeholder;
   the source design needs no application framework. Build-time Node rendering
   provides a single source for navigation/content and deterministic hashed assets.
2. Use the homepage visual system. The source also has an independent wiki/reading
   system. An optional preference question was offered; absent a response, proceed
   with the stated homepage-system assumption. Final reading layouts remain open.
3. Preserve exact homepage tokens, header/menu geometry, breakpoints, nested
   disclosure treatment, shadows, borders and transitions. Reconstruct behavior
   without the source analytics bundle or carousel code.
4. No font binaries were found. Homepage Raleway is only a declared family; its
   effective fallback remains platform-dependent. Inner HTML links Google Fonts
   Raleway 400/600/700, but that is not a locally stored asset. Preserve homepage
   fallbacks and leave a documented font module; do not fabricate font provenance
   or introduce a new third-party dependency. Licensed local files/formats remain
   an unresolved input.
5. The fixture uses the source's content shells and general surfaces instead of
   its editorial carousel. Footer treatment is demonstrated from source CSS even
   though the homepage currently has no footer. No photos, archive, wiki content,
   essay text, form, metadata, analytics, old icons or project navigation transfer.
6. Accessibility corrections: visible-only focus traversal (closed details are
   excluded), inert background/closed drawer, valid div dialog semantics instead
   of aside[role=dialog], keyboard continuation at hash targets, immediate scroll
   restoration, browser zoom allowed, and a completed exit animation. Backdrop is
   decorative with pointer dismissal; the close button is the keyboard equivalent.
   Coarse landscape summaries receive the same compact size as top-level links.
7. Add a neutral QA favicon to avoid inherited branding or missing favicon requests.
   It is a fixture, not a final identity mark.
8. Source's immutable release pattern is the relevant infrastructure model; QA
   uses its own root/symlink and an exact SHA export. A first-deploy maintenance
   baseline establishes a rollback target before the candidate becomes active.
9. DNS NXDOMAIN, absent QA vhost and certificate coverage block public deployment.
   SSH works. No DNS/TLS/Cloudflare/Nginx changes or production publication are made.
10. Existing production files stay preserved and outside the build. README directs
    users to the QA workflow; legacy production deploy is never invoked.
11. Baseline browser networking timed out on direct HTTPS. Source homepage captures
    rendered the live HTML/CSS/JS fetched using curl with normal TLS verification
    through Playwright request fulfillment. Local source was rendered directly.
    Reduced motion freezes the source carousel for comparison. These captures
    are not proof of browser-to-origin networking performance.
12. Validation uses cached Chromium 147 because current Playwright downloads do not
    support macOS 12. Physical iOS Safari and another browser engine remain untested.

## 2026-09-19 — font resolution

Direct browser/CDP evidence found local Raleway 2.001 on the inspection Mac and
Google-hosted Raleway 4.026 on source inner pages. The network-served WOFF2 is
redistributable under verified SIL OFL 1.1. Self-host that exact unmodified binary
and its notice, preserving filename and format. This removes machine dependence
without introducing a runtime provider. Its wght axis supports the required 900.
The network-served version differs from the old local installation; report the
subpixel trigger-width difference rather than adjusting exact source layout tokens.
