import { escapeHTML as e } from './html.mjs';
import { renderHeader, renderNavigation } from './navigation.mjs';
export function renderPage({site, navigation, fixture, stylesheet, script}) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow"><title>${e(site.title)}</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${stylesheet}"><script type="module" src="${script}"></script></head>
<body class="page"><a class="skip-link" href="#main-content" data-page-background>Skip to main content</a>
${renderHeader()}${renderNavigation(navigation)}
<!-- TEMPORARY QA FIXTURE: replace content independently of the design system. -->
<main id="main-content" tabindex="-1" data-page-background>
<section class="fixture-intro"><div class="layout-shell layout-shell--content text-block"><p class="type-eyebrow">${e(site.identity)}</p><h1>${e(site.name)}</h1><p class="type-meta">${e(site.status)}</p><p>${e(fixture.introduction)}</p></div></section>
<section id="typography" class="fixture-section section section--tight"><div class="layout-shell layout-shell--content"><h2>${e(fixture.heading)}</h2><div class="grid-2"><div class="text-block"><p>${e(fixture.paragraph)}</p><p>${e(fixture.sample)}</p></div><div class="text-block"><h3>${e(fixture.headingSpecimen)}</h3><p><strong>${e(fixture.emphasis)}</strong>${e(fixture.linkPrefix)}<a href="#controls">${e(fixture.linkLabel)}</a>.</p><p class="type-caption">${e(fixture.caption)}</p></div></div></div></section>
<section id="controls" class="fixture-section section section--tight"><div class="layout-shell layout-shell--content fixture-specimen text-block"><h2>${e(fixture.controlsHeading)}</h2><div class="button-group">${fixture.actions.map(action => `<a class="btn btn--${e(action.variant)}" href="${e(action.href)}">${e(action.label)}</a>`).join('')}</div></div></section>
<section id="surfaces" class="fixture-section section section--tight"><div class="layout-shell layout-shell--content"><div class="card"><h3>${e(fixture.surfaceHeading)}</h3><p class="card__meta">${e(fixture.surfaceCaption)}</p><div class="fixture-swatches" aria-hidden="true">${fixture.swatches.map(name => `<span class="fixture-swatch fixture-swatch--${name}"></span>`).join('')}</div></div></div></section>
</main><footer class="site-footer" data-page-background><div class="layout-shell layout-shell--content site-footer__inner"><p class="type-utility">${e(site.identity)}</p><p class="type-caption">${e(fixture.footer)}</p></div></footer>
</body></html>\n`;
}
