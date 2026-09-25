import { escapeHTML as e } from './html.mjs';
import { renderHeader, renderNavigation } from './navigation.mjs';
import { renderActionLink, renderMediaPlaceholder, renderTextLink } from './content-patterns.mjs';

function analytics(site) {
  if (site.googleTagId && !/^G-[A-Z0-9]+$/.test(site.googleTagId)) throw new Error('Invalid Google tag ID');
  return site.googleTagId ? `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${site.googleTagId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${site.googleTagId}');
</script>` : '';
}

function pageStart({ site, navigation, title, description, stylesheet, script, path, bodyClass }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow"><meta name="description" content="${e(description)}"><title>${e(title)}</title>
${analytics(site)}
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${stylesheet}"><script type="module" src="${script}"></script></head>
<body class="page ${e(bodyClass)}"><a class="skip-link" href="#main-content" data-page-background>Skip to main content</a>
${renderHeader()}${renderNavigation(navigation, path)}`;
}

function footer(site) {
  return `<footer class="site-footer" data-page-background><div class="layout-shell layout-shell--stage site-footer__inner"><p class="site-footer__identity type-utility">${e(site.footerIdentity)}</p><p class="type-caption">${e(site.role)}</p></div></footer></body></html>\n`;
}

function headingText(value) {
  return `<span class="heading-highlight">${e(value)}</span>`;
}

function renderIndexEntry(section) {
  return `<article class="index-entry"><h3>${headingText(section.title)}</h3><p>${e(section.summary)}</p><div class="index-entry__action">${renderTextLink({ href: section.href, label: section.action })}</div></article>`;
}

export function renderHomePage({ site, navigation, homepage, stylesheet, script }) {
  const nameLines = (site.nameLines ?? [site.name]).map(line => `<span class="heading-highlight" aria-hidden="true">${e(line)}</span>`).join('');
  const start = pageStart({site,navigation,title:site.title,description:homepage.introduction[0],stylesheet,script,path:'/',bodyClass:'home-page'});
  return `${start}
<main id="main-content" tabindex="-1" data-page-background>
  <section class="home-hero" aria-labelledby="home-title"><div class="layout-shell layout-shell--stage home-hero__inner">
    <p class="home-hero__identity type-eyebrow">${e(site.identity)}</p>
    <div class="home-hero__heading"><h1 id="home-title" aria-label="${e(site.name)}">${nameLines}</h1><p class="home-hero__role">${e(site.role)}</p></div>
    <div class="home-hero__introduction">${homepage.introduction.slice(0,1).map(paragraph => `<p>${e(paragraph)}</p>`).join('')}</div>
    <p class="home-hero__index-note type-caption">An institutional index of Jared's practice</p>
  </div></section>
  <section id="practice-index" class="home-index" aria-labelledby="practice-index-title"><div class="layout-shell layout-shell--stage">
    <header class="home-index__header"><h2 id="practice-index-title">${headingText("Explore Jared's practice")}</h2><p>${e(homepage.introduction[1])}</p></header>
    <div class="index-grid">${homepage.sections.map(renderIndexEntry).join('')}</div>
  </div></section>
</main>
${footer(site)}`;
}

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function renderRichParagraph(paragraph) {
  if (typeof paragraph === 'string') return `<p>${e(paragraph)}</p>`;
  if (!Array.isArray(paragraph?.parts)) throw new Error('Unsupported paragraph structure');
  const body = paragraph.parts.map(part => typeof part === 'string' ? e(part) : `<em>${e(part.emphasis)}</em>`).join('');
  return `<p>${body}</p>`;
}

function renderArticleSection(section) {
  const id = slugify(section.title);
  return `<section class="article-section" aria-labelledby="${id}"><h2 id="${id}">${headingText(section.title)}</h2>${section.paragraphs.map(renderRichParagraph).join('')}</section>`;
}

function renderSiblingNavigation(sectionRoutes, currentPath) {
  const items = sectionRoutes.map(route => `<li><a href="${e(route.href)}"${route.href === currentPath ? ' aria-current="page"' : ''}>${e(route.label)}</a></li>`).join('');
  return `<nav class="section-page__siblings" aria-labelledby="explore-practice-title"><h2 id="explore-practice-title">${headingText("Explore Jared's practice")}</h2><ul>${items}</ul></nav>`;
}

export function renderSectionPage({ site, navigation, sectionRoutes, page, stylesheet, script }) {
  const path = `/${page.slug}/`;
  const description = page.sections[0].paragraphs.find(paragraph => typeof paragraph === 'string');
  const toc = page.sections.map(section => `<li><a href="#${slugify(section.title)}">${e(section.title)}</a></li>`).join('');
  const links = page.links.map(link => `<li>${renderTextLink(link)}</li>`).join('');
  const start = pageStart({site,navigation,title:`${page.title} — ${site.name}`,description,stylesheet,script,path,bodyClass:'section-page'});
  return `${start}
<main id="main-content" tabindex="-1" data-page-background>
  <header class="section-page__hero"><div class="layout-shell layout-shell--stage">
    <h1>${headingText(page.title)}</h1>
  </div></header>
  <div class="layout-shell layout-shell--stage section-page__media">${renderMediaPlaceholder({label:'Image pending',decorative:true})}</div>
  <div class="layout-shell layout-shell--stage section-page__layout">
    <aside class="section-page__toc"><nav aria-labelledby="table-of-contents-title"><h2 id="table-of-contents-title">${headingText('Table of contents')}</h2><ul>${toc}</ul></nav></aside>
    <article class="section-page__article">${page.sections.map(renderArticleSection).join('')}
      <section class="section-page__destinations" aria-labelledby="continue-title"><h2 id="continue-title">${headingText('Continue')}</h2><ul>${links}</ul></section>
    </article>
    ${renderSiblingNavigation(sectionRoutes, path)}
  </div>
</main>
${footer(site)}`;
}
