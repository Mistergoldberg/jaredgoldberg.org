# Source design-system inventory

Inspected 2026-09-18 (America/Toronto; server UTC date 2026-09-19).

## Repository baseline — observed

- Destination: `/Users/jaredgoldberg/Desktop/jaredgoldberg.org`, existing Git repository, clean `main`, HEAD `6b9f8a5c01e60b2f670115be2fa7f38b7d9fa09b`.
- Origin: `https://github.com/Mistergoldberg/jaredgoldberg.org.git`. No push performed.
- Five tracked files: `.gitignore`, `README.md`, `index.html`, `scripts/deploy.sh`, `ops/nginx/jaredgoldberg.org.conf`. Static placeholder, no package scripts or framework.
- Source: `/Users/jaredgoldberg/Desktop/jaredgoldberg.ca`, HEAD `84e0e03e311e6a25a58eb7a175624f07c23b395a`; many modified and untracked editorial files already present. Inspection uses the current working copy, not just HEAD. Nothing in that repository is written or committed.
- No applicable AGENTS.md found in either repository or the destination's ancestors. Read both READMEs, destination deployment script/config, source Nginx config, and relevant CSS/JS/HTML. No source package.json.
- Source contains two distinct plain HTML/CSS/JS systems. Homepage loads `tokens.css`, `global.css`, `components.css`, `responsive.css`, `navigation.js`, and `main.js`. Inner pages load the separate `wiki.css` and `wiki.js` system.

All source paths below are relative to the source repository. “Copy” means selected reusable source rules, never a whole website copy.

## Rules and assets

| Source path / rule | Purpose and exact evidence | Decision | Dependencies / uncertainty |
| --- | --- | --- | --- |
| `assets/css/tokens.css` | Raleway/Avenir Next/Segoe UI/sans-serif family; weights 400/700/900; fluid type sizes; display line-height .95, body 1.55; tracking .04/.11/.08/.002em | Copy tokens, remove obsolete compatibility aliases | Values are source facts; declared Raleway is not evidence that Raleway renders |
| `assets/css/tokens.css`, `index.html` font comments | Explicitly say fonts are not embedded yet | Adapt into `src/styles/fonts.css` documentation; retain fallback stack | No font files or @font-face exist; provenance, format and licensing cannot be established |
| `about/index.html:13` and other inner HTML | Google Fonts stylesheet for Raleway 400/600/700 | Exclude third-party font loading from homepage-system shell | External font service; no local binaries/provenance or formats recorded in repo |
| Entire current source file inventory | No WOFF, WOFF2, TTF, OTF, EOT or font license files | Nothing to copy | Required downloadable font set is empty. Local font licensing/availability remains unresolved; do not download substitutes |
| `assets/css/tokens.css` color rules | Background #eceae4; surface #f7f5f0; muted #e3e0d9; primary #141412; secondary #57544f; inverse #f8f7f3; former blue focus accent; alpha borders | Adapt | The completion candidate replaces the former focus accent with the approved dark red; homepage text-stage background separately uses #efefef |
| `assets/css/tokens.css` spacing/layout | 0/.25/.5/.75/1/1.5/2/3/4/5/7rem scale; 82rem page, 94rem stage, 70rem content; fluid gutters and section spacing | Copy | `--gutter` switches in responsive layer; CSS breakpoint tokens document values but cannot drive media queries |
| `assets/css/global.css` | Border-box reset; image max-width; headings; 66ch paragraphs; selection and 2px focus; skip link; layout shells, grids, text/button groups, type utilities | Copy, separate base/type/layout layers | Typography depends on tokens; preserve browser zoom |
| `assets/css/components.css` `.page` | #e8e5dd to background gradient | Copy | Static shell uses this general page surface |
| `assets/css/components.css` header and menu trigger | Fixed overlay z20; safe top/inline insets; desktop trigger centered over conceptual preview rail; mobile trigger at left; 120ms hover | Copy geometry | No old logo/icon transferred; new site identity appears in shell content |
| `assets/css/components.css` `.menu-panel*` | z80; backdrop rgba(10,10,10,.46); right sheet min(22rem,84vw), 100dvh; black .95; border and shadow; 24px padding/32px gaps; heavy uppercase navigation; native details groups | Copy/adapt | Data-driven fixture tree only; icon slots use decorative text symbols, not old page identities |
| `assets/css/responsive.css` menu rules | Tablet <=63.99rem: min(20rem,88vw). Mobile <=47.99rem: min(22rem,84vw), trigger left, 2.8rem x2.25rem minimum. Coarse landscape <=63.99rem and <=31.99rem high: narrower sheet, compact gaps, safe-area padding | Copy selected rules | Preserve cascade order; apply landscape font compaction to summaries as well as links (accessibility correction) |
| `assets/js/navigation.js` | Open/close, initial close-button focus, Tab cycling, Escape, backdrop and link dismissal, fixed-body scroll lock/restoration | Reconstruct as small ES module | Fix hidden descendants in closed details entering focus list; inert background and closed panel; preserve position without smooth scroll |
| `assets/css/tokens.css`, `global.css`, `components.css` motion | Menu 360ms cubic-bezier(.2,.88,.2,1); backdrop 220ms; micro 120ms; reduced motion .01ms | Copy/adapt | Allow closing slide to complete before visibility:hidden; original hides immediately on close |
| `assets/css/components.css` `.section-header`, `.card*`, `.btn`, `.cta_*`, `.site-footer*` | 3-column cards, 2.6rem buttons, 1px borders, subtle rounded corners, surface footer and responsive grid | Copy; rename CTA variants to descriptive classes | Footer exists in stylesheet but is absent from rendered homepage; fixture deliberately demonstrates its treatment |
| `assets/css/global.css` `.media-block`, `components.css` `.project-slide__media` | Clipped rounded general images; object-fit:cover; full-bleed stage uses two dark gradients and centered crop | Copy general image primitive; inventory stage overlays | No images needed for this fixture; no editorial images transferred |
| `assets/css/components.css` `.project-stage*`, `.project-slide*`; `assets/js/main.js` | Fullscreen carousel, previews, progress, auto-advance, gesture/wheel handling; includes zoom suppression | Exclude carousel behavior and page-specific slides for this milestone | Not required to test navigation and primitives; keep source evidence for later explicit component request |
| `assets/css/wiki.css`, `assets/js/wiki.js`, `about/index.html` | Separate white #fafafa reading system, 20px body/1.7 leading, 1240px shell, full-screen left menu, desktop TOC, 900px and 1024px breakpoints | Inventory only; exclude from homepage-system shell | Would introduce a competing navigation/reading architecture; later choice remains open |
| `assets/js/wiki.js`, `assets/js/analytics-placeholders.js`, tracking in `main.js` / HTML | Analytics initialization, identifiers and event hooks | Exclude entirely | No runtime tracking or analytics dependency |
| `index.html` and inner-page HTML | Biography, essays, project names, canonical/OG/JSON-LD, favicons and old public identity | Exclude | Screenshots are reference evidence only, never public assets |
| Source images, archives, 640×480, generated libraries, R2 media, experiments | Editorial or unrelated projects | Exclude | No dependency demonstrated; no archive copied or traversed for content migration |
| `deploy/nginx/jaredgoldberg.ca.conf` | Source production root, redirects, legacy route rules | Inspect only | No configuration transferred to QA |

## Observations versus assumptions

Observed: the homepage and inner-page systems differ. Exact reusable homepage values are available in source. The current source has no embedded fonts. Source screenshot captures and network observations are retained separately as reference evidence; browser platform fallbacks can differ between machines.

Working choice: use the homepage system for the minimal QA shell. This is a design-system choice, not approval of future navigation or editorial architecture. New QA fixture strings are explicitly marked temporary. No claim is made that Raleway has been transferred.

## Infrastructure baseline — read-only

SSH to `root@5.161.223.134` succeeds. Production root resolves from `/var/www/jaredgoldberg.org/current` to `/var/www/jaredgoldberg.org/releases/20260918213922`. The parent has `releases` and `shared`, but no `qa-current`. No QA vhost exists. `qa.jaredgoldberg.org` resolves NXDOMAIN. The existing Let's Encrypt certificate covers only apex and www, not QA.

Inspected neighboring established deployment documentation at `../pixilation.org/docs/deployment.md`, and `../duchamped-wordpress/scripts/deploy-qa.sh`; inspected the existing `qa.duchamped.com` Nginx configuration read-only. Adopt immutable exact-SHA artifacts and atomic release symlinks from the static-site pattern. Do not reuse the WordPress mutable-root or production-media fallback model.

No server, DNS, TLS, Cloudflare, production symlink or unrelated site changes are authorized by infrastructure discovery. Per the brief, missing prerequisites mean prepare tooling and stop before deployment.

## Baseline screenshots

`docs/screenshots/source/` contains local/live open and closed states at 1440×900,
1024×768, 390×844 and 375×667, plus geometry/network observations. Captured with
Chromium 147 in reduced-motion mode to hold the carousel still. Direct browser
HTTPS timed out; live source responses were fetched by curl (normal TLS validation)
and fulfilled into the browser. No page content was imported into the public build.
Reference captures do contain the source page text by design.

## Font correction — 2026-09-19 (supersedes initial font disposition)

Direct live browser network and platform-font inspection confirmed two versions:
the homepage uses this Mac's installed Raleway 2.001 without requesting fonts;
inner pages load Google Fonts Raleway 4.026 normal 400/600/700. No source-server
webfont files were found. The exact source-served Latin WOFF2 is now copied
unmodified into `public/fonts/`, with original filename and SIL OFL 1.1 notice.
Its verified variable range is 100–900, supporting the homepage design's 900.
`src/styles/fonts.css` declares local normal 100–900, swap, original unicode range,
and retains fallback tokens. No external provider or source-domain requests remain.
The Design System V2 menu also uses the file's named authentic ExtraLight 200
instance; no additional binary or font-face declaration is required.
See [complete font evidence](font-evidence/README.md) for source URLs, checksum,
metadata, licensing, browser traces and measured subpixel geometry differences.
