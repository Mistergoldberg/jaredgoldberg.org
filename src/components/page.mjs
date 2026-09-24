import { escapeHTML as e } from './html.mjs';
import { renderHeader, renderNavigation } from './navigation.mjs';
import {
  renderActionLink,
  renderInquiryRecord,
  renderPendingDestination,
  renderProjectRecord,
  renderWritingRecord,
} from './content-patterns.mjs';

function sectionHeader({ title, introduction, id }) {
  return `<div class="section-heading"><div class="section-heading__copy"><h2 id="${e(id)}">${e(title)}</h2>${introduction ? `<p class="section-introduction">${e(introduction)}</p>` : ''}</div></div>`;
}

function renderStartRoute(route) {
  return `<article class="start-route"><h3>${e(route.title)}</h3><p>${e(route.summary)}</p></article>`;
}

export function renderPage({ site, navigation, homepage, stylesheet, script }) {
  if (site.googleTagId && !/^G-[A-Z0-9]+$/.test(site.googleTagId)) throw new Error('Invalid Google tag ID');
  const nameLines = (site.nameLines ?? [site.name]).map(line => `<span aria-hidden="true">${e(line)}</span>`).join('');
  const googleTag = site.googleTagId ? `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${site.googleTagId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${site.googleTagId}');
</script>` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow"><meta name="description" content="Jared Goldberg works across art, software, archives, education, professional systems and public writing."><title>${e(site.title)}</title>
${googleTag}
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${stylesheet}"><script type="module" src="${script}"></script></head>
<body class="page home-page"><a class="skip-link" href="#main-content" data-page-background>Skip to main content</a>
${renderHeader()}${renderNavigation(navigation)}
<main id="main-content" tabindex="-1" data-page-background>
  <section class="home-hero" aria-labelledby="home-title"><div class="layout-shell layout-shell--stage home-hero__inner">
    <p class="home-hero__identity type-eyebrow">${e(site.identity)}</p>
    <div class="home-hero__heading"><h1 id="home-title" aria-label="${e(site.name)}">${nameLines}</h1><p class="home-hero__role">${e(site.role)}</p></div>
    <div class="home-hero__introduction">${homepage.introduction.map(paragraph => `<p>${e(paragraph)}</p>`).join('')}<div class="button-group">${homepage.actions.map(renderActionLink).join('')}</div></div>
    <p class="home-hero__index-note type-caption">An institutional index of one practice</p>
  </div></section>

  <section id="inquiries" class="home-section home-section--surface" aria-labelledby="inquiries-title"><div class="layout-shell layout-shell--stage">
    ${sectionHeader({title: homepage.inquiries.title, introduction: homepage.inquiries.introduction, id: 'inquiries-title'})}
    <div class="inquiry-grid">${homepage.inquiries.records.map(renderInquiryRecord).join('')}</div>
    ${renderPendingDestination(homepage.inquiries.destination)}
  </div></section>

  <section id="projects" class="home-section" aria-labelledby="projects-title"><div class="layout-shell layout-shell--stage">
    ${sectionHeader({title: homepage.projects.title, introduction: homepage.projects.introduction, id: 'projects-title'})}
    <div class="record-list">${homepage.projects.records.map(renderProjectRecord).join('')}</div>
    ${renderPendingDestination(homepage.projects.destination)}
  </div></section>

  <section id="archive" class="home-section home-section--dark" aria-labelledby="archive-title"><div class="layout-shell layout-shell--stage archive-layout">
    ${sectionHeader({title: homepage.archive.title, id: 'archive-title'})}
    <div class="archive-layout__body"><p><strong>${e(homepage.archive.firstTitle)}</strong>${e(homepage.archive.firstBody)}<strong>${e(homepage.archive.secondTitle)}</strong>${e(homepage.archive.secondBody)}</p>${renderPendingDestination(homepage.archive.destination)}</div>
  </div></section>

  <section id="writing" class="home-section home-section--surface" aria-labelledby="writing-title"><div class="layout-shell layout-shell--stage">
    ${sectionHeader({title: homepage.writing.title, introduction: homepage.writing.introduction, id: 'writing-title'})}
    <div class="writing-list">${homepage.writing.records.map(renderWritingRecord).join('')}</div>
    ${renderPendingDestination(homepage.writing.destination)}
  </div></section>

  <section id="ecosystem" class="home-section ecosystem" aria-labelledby="ecosystem-title"><div class="layout-shell layout-shell--stage">
    ${sectionHeader({title: homepage.ecosystem.title, id: 'ecosystem-title'})}
    <div class="ecosystem__statements">${homepage.ecosystem.statements.map(statement => `<p>${e(statement)}</p>`).join('')}</div>
  </div></section>

  <section id="start" class="home-section home-section--closing" aria-labelledby="start-title"><div class="layout-shell layout-shell--stage">
    ${sectionHeader({title: homepage.start.title, id: 'start-title'})}
    <div class="start-grid">${homepage.start.routes.map(renderStartRoute).join('')}</div>
    <div class="pending-destination-group">${homepage.start.destinations.map(renderPendingDestination).join('')}</div>
  </div></section>
</main>
<footer class="site-footer" data-page-background><div class="layout-shell layout-shell--stage site-footer__inner"><p class="type-utility">${e(site.name)}</p><p class="type-caption">${e(site.role)}</p></div></footer>
</body></html>\n`;
}
