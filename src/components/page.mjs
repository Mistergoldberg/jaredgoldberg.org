import { escapeHTML as e } from './html.mjs';
import { renderHeader, renderNavigation } from './navigation.mjs';
import { renderHeading, renderMediaSlot, renderTextLink } from './content-patterns.mjs';

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

export function renderPageStart({ site, navigation, title, description, stylesheet, script, path, environment, bodyClass = '' }) {
  if (!['qa','production'].includes(environment)) throw new Error('Invalid publication environment');
  const robots = environment === 'qa' ? '\n<meta name="robots" content="noindex, nofollow">' : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${robots}<meta name="description" content="${e(description)}"><title>${e(title)}</title>
${analytics(site)}
<link rel="preload" href="/fonts/1Ptug8zYS_SKggPNyC0IT4ttDfA.woff2" as="font" type="font/woff2" crossorigin><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${e(stylesheet)}"><script type="module" src="${e(script)}"></script></head>
<body class="page ${e(bodyClass)}"><a class="skip-link" href="#main-content" data-page-background>Skip to main content</a>
${renderHeader()}${renderNavigation(navigation, path)}`;
}

export function renderFooter(site) {
  return `<footer class="site-footer" data-page-background><div class="layout-shell layout-shell--stage site-footer__inner"><p class="site-footer__identity type-utility">${e(site.footerIdentity)}</p><p class="type-caption">${e(site.role)}</p></div></footer></body></html>\n`;
}

function renderIndexEntry(section) {
  return `<article class="index-entry">${renderHeading({level:3,text:section.title})}<p>${e(section.summary)}</p><div class="index-entry__action">${renderTextLink({ href: section.href, label: section.action })}</div></article>`;
}

export function renderHomePage({ site, navigation, homepage, stylesheet, script, environment }) {
  const nameLines = (site.nameLines ?? [site.name]).map(line => `<span class="heading-highlight" aria-hidden="true">${e(line)}</span>`).join('');
  const start = renderPageStart({site,navigation,title:site.title,description:homepage.introduction[0],stylesheet,script,path:'/',environment,bodyClass:'home-page'});
  return `${start}
<main id="main-content" tabindex="-1" data-page-background>
  <section class="home-hero" aria-labelledby="home-title"><div class="layout-shell layout-shell--stage home-hero__inner">
    <p class="home-hero__identity type-eyebrow">${e(site.identity)}</p>
    <div class="home-hero__heading"><h1 id="home-title" aria-label="${e(site.name)}">${nameLines}</h1><p class="home-hero__role">${e(site.role)}</p></div>
    <div class="home-hero__introduction">${homepage.introduction.slice(0,1).map(paragraph => `<p>${e(paragraph)}</p>`).join('')}</div>
    <p class="home-hero__index-note type-caption">An institutional index of Jared's practice</p>
  </div></section>
  <section id="practice-index" class="home-index" aria-labelledby="practice-index-title"><div class="layout-shell layout-shell--stage">
    <header class="home-index__header">${renderHeading({level:2,id:'practice-index-title',text:"Explore Jared's practice"})}<p>${e(homepage.introduction[1])}</p></header>
    <div class="index-grid">${homepage.sections.map(renderIndexEntry).join('')}</div>
  </div></section>
</main>
${renderFooter(site)}`;
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
  return `<section class="article-section" aria-labelledby="${id}">${renderHeading({level:2,id,text:section.title})}${section.paragraphs.map(renderRichParagraph).join('')}</section>`;
}

function renderSiblingNavigation(sectionRoutes, currentPath) {
  const items = sectionRoutes.map(route => `<li><a href="${e(route.href)}"${route.href === currentPath ? ' aria-current="page"' : ''}>${e(route.label)}</a></li>`).join('');
  return `<nav class="section-page__siblings" aria-labelledby="explore-practice-title">${renderHeading({level:2,id:'explore-practice-title',text:"Explore Jared's practice"})}<ul>${items}</ul></nav>`;
}

export function renderSectionPage({ site, navigation, sectionRoutes, page, stylesheet, script, environment }) {
  const path = `/${page.slug}/`;
  const description = page.sections[0].paragraphs.find(paragraph => typeof paragraph === 'string');
  const toc = page.sections.map(section => `<li><a href="#${slugify(section.title)}">${e(section.title)}</a></li>`).join('');
  const links = page.links.map(link => `<li>${renderTextLink(link)}</li>`).join('');
  const start = renderPageStart({site,navigation,title:`${page.title} — ${site.name}`,description,stylesheet,script,path,environment,bodyClass:'section-page'});
  return `${start}
<main id="main-content" tabindex="-1" data-page-background>
  <header class="section-page__hero"><div class="layout-shell layout-shell--stage">
    ${renderHeading({level:1,text:page.title})}
  </div></header>
  <div class="layout-shell layout-shell--stage section-page__media">${renderMediaSlot({placeholder:{label:'Image pending',decorative:true}})}</div>
  <div class="layout-shell layout-shell--stage section-page__layout">
    <aside class="section-page__toc"><nav aria-labelledby="table-of-contents-title">${renderHeading({level:2,id:'table-of-contents-title',text:'Table of contents'})}<ul>${toc}</ul></nav></aside>
    <article class="section-page__article">${page.sections.map(renderArticleSection).join('')}
      <section class="section-page__destinations" aria-labelledby="continue-title">${renderHeading({level:2,id:'continue-title',text:'Continue'})}<ul>${links}</ul></section>
    </article>
    ${renderSiblingNavigation(sectionRoutes, path)}
  </div>
</main>
${renderFooter(site)}`;
}
