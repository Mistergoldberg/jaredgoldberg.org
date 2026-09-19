# Font provenance and visual correction — 2026-09-19

Direct Chromium browser networking succeeded for this continuation. Network and
Chrome DevTools Protocol platform-font inspection are in `live-font-network.json`.

## Observed source behavior

- Homepage CSS: `/assets/css/tokens.css`, `/assets/css/global.css`,
  `/assets/css/components.css?v=20260502-menu-compass`, `/assets/css/responsive.css`.
  Declared family is Raleway; normal weights 400 (body), 700 (UI/headings), 900
  (display/menu links). It makes **no font requests**. CDP showed the Raleway 2.001
  TTF files already installed in this Mac's `~/Library/Fonts`, not Avenir fallback.
  The previous inventory's assumption that absence of font requests proved fallback
  rendering was incomplete. Other machines without Raleway could still fall back.
- Inner-page HTML (`/about/index.html`, also local source line 13) loads
  `https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap`.
- Browser loaded HTTP 200 from exactly:
  `https://fonts.gstatic.com/s/raleway/v37/1Ptug8zYS_SKggPNyC0IT4ttDfA.woff2`.
  Normal styles at 400/600/700 use the same Latin variable binary. The provider
  stylesheet is saved as evidence, outside the public build.
- Source production Nginx root remains `/var/www/jaredgoldberg.ca/public_html`.
  Read-only searches of that root and `/var/www/jaredgoldberg.ca` (through depth 4)
  found no WOFF/WOFF2/TTF/OTF files or font license files. The local source also has
  none. Installed Mac TTF files were inspected, not copied or modified.
- Apple's symbol font supplies the inner page hamburger glyph. It is not a required
  text webfont and is not copied. Decorative symbols in QA retain system fallback.

## Disposition

Self-host the exact **unmodified source-served WOFF2**, preserving its filename.
FontTools metadata confirms Raleway 4.026, normal/roman, with the `wght` axis
100–900. Its internal family label “Raleway Thin” reflects the default axis value
100, not a restriction to thin rendering. CSS declares the verified full weight
range, so the design's 400/700/900 use real font instances, not synthesized bold.
No italic specimen is used; no italic or unused language-subset files are copied.

- File: `public/fonts/1Ptug8zYS_SKggPNyC0IT4ttDfA.woff2`
- Size: 43,120 bytes
- SHA-256: `10f1a0ef3f3497901c1c3e9987d0cb97d092a6ce1ff45669a1aed503cf67e6ef`
- License: SIL Open Font License 1.1; copyright 2010 The Raleway Project Authors,
  reserved font name Raleway. The binary copyright and license link match the
  [upstream license](https://raw.githubusercontent.com/google/fonts/main/ofl/raleway/OFL.txt).
- Copyright and full license are distributed at `public/fonts/OFL.txt` and emitted
  at `/fonts/OFL.txt`; the binary is not renamed internally, converted or subsetted.
- `src/styles/fonts.css` uses local URL, `font-display: swap`, normal style,
  weight 100–900, and the provider's Latin unicode range. Existing fallback tokens
  remain. There is deliberately no `local()` source that could mask this binary.
- `tests/font-policy.json` pins the required filename, hash and used weights.

This is a documented switch from this Mac's old installed 2.001 to the source's
currently network-served 4.026, not an unrelated font substitution. The user was
informed before downloading. OFL redistribution permission resolves the licensing
question without proprietary-font uncertainty or a runtime provider dependency.

## Verification and comparison

Full suite passed after the change: 9 Node test/subtest results and 8 Python release
safety tests. Browser assertions confirm actual **custom Raleway webfonts**, not
just computed family declarations, on regular paragraph, bold Menu button and
heavy h1. No external font/asset requests, console errors or axe violations.

New local captures: `docs/screenshots/qa-fonts/`; previous local baseline remains
`docs/screenshots/qa/`, source references remain `docs/screenshots/source/`.

At 1440, 1024, 390 and 375px widths, drawer widths and trigger y/height are unchanged.
The new Menu text makes the button 0.015625 CSS px narrower; desktop centering shifts
x by 0.0078125px. Mobile x is unchanged. These subpixel differences are consistent
with the observed font version change. Line breaks, controls, nesting and overflow
are reviewed again with the public deployment; no spacing/font-size values are
altered to disguise the font correction.

Future non-Latin editorial content may need additional licensed language subsets.
That is outside this Latin QA fixture and is not silently declared complete.
