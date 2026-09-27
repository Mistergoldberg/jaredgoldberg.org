import { mkdir, writeFile } from 'node:fs/promises';
import { homepage, sectionRoutes, site } from '../src/content/homepage.mjs';
import { sectionPages } from '../src/content/section-pages.mjs';

const outputDirectory = 'docs/copy-reviews';

function inline(value) {
  if (typeof value === 'string') return value;
  return value.parts.map(part => {
    if (typeof part === 'string') return part;
    if (typeof part.emphasis === 'string') return `*${part.emphasis}*`;
    if (part.link) {
      const link = `[${part.link.label}](${part.link.href})`;
      return part.link.emphasis ? `*${link}*` : link;
    }
    throw new Error('Unsupported rich-text part');
  }).join('');
}

function siteInterface(currentPath) {
  const links = sectionRoutes.map(route => `${route.label}${route.href === currentPath ? ' (current page)' : ''} — ${route.href}`);
  return [
    '## Site interface text',
    '',
    'Skip to main content',
    '',
    'Menu',
    '',
    'Main menu',
    '',
    `Home${currentPath === '/' ? ' (current page)' : ''} — /`,
    '',
    "Explore Jared's practice",
    '',
    ...links.flatMap(link => [link, '']),
  ];
}

function footer() {
  return [
    '## Footer text',
    '',
    site.footerIdentity,
    '',
    site.role,
    '',
    site.copyright,
    '',
  ];
}

function reviewHeader({ route, contentFile, title, description, h1 }) {
  return [
    `# Copy review: ${h1}`,
    '',
    `- Actual path: \`${route}\``,
    `- Content source: \`${contentFile}\``,
    `- HTML title: ${title}`,
    `- Meta description: ${description}`,
    `- H1: ${h1}`,
    '',
  ];
}

function homeReview() {
  const lines = reviewHeader({
    route: '/',
    contentFile: 'src/content/homepage.mjs',
    title: site.title,
    description: homepage.description,
    h1: homepage.h1,
  });
  lines.push(...siteInterface('/'), '## Main content', '', `# ${homepage.h1}`, '');
  for (const paragraph of homepage.introduction) lines.push(inline(paragraph), '');
  lines.push(`## ${homepage.indexHeading}`, '');
  for (const section of homepage.sections) {
    lines.push(`### ${section.title}`, '', inline(section.summary), '', `[${section.action}](${section.href})`, '');
  }
  lines.push(`## ${homepage.about.title}`, '');
  for (const paragraph of homepage.about.paragraphs) lines.push(inline(paragraph), '');
  lines.push(homepage.about.links.map(link => `[${link.label}](${link.href})`).join(' · '), '', ...footer());
  return lines.join('\n');
}

function sectionReview(page) {
  const path = `/${page.slug}/`;
  const lines = reviewHeader({
    route: path,
    contentFile: 'src/content/section-pages.mjs',
    title: page.metaTitle,
    description: page.description,
    h1: page.h1,
  });
  lines.push(...siteInterface(path), '## Main content', '', `# ${page.h1}`, '', 'Image pending', '', '## Table of contents', '');
  for (const section of page.sections) lines.push(`[${section.title}](#${section.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')})`, '');
  for (const paragraph of page.introduction) lines.push(inline(paragraph), '');
  for (const section of page.sections) {
    lines.push(`## ${section.title}`, '');
    for (const paragraph of section.paragraphs) lines.push(inline(paragraph), '');
  }
  lines.push('## Continue:', '', page.links.map(link => `[${link.label}](${link.href})`).join(' · '), '', "## Explore Jared's practice", '');
  for (const route of sectionRoutes) lines.push(`[${route.label}](${route.href})${route.href === path ? ' (current page)' : ''}`, '');
  lines.push(...footer());
  return lines.join('\n');
}

await mkdir(outputDirectory, { recursive: true });
const reviews = [
  ['01-homepage.md', homeReview()],
  ...sectionPages.map((page, index) => [`0${index + 2}-${page.slug}.md`, sectionReview(page)]),
];
for (const [filename, contents] of reviews) await writeFile(`${outputDirectory}/${filename}`, `${contents.trim()}\n`);
console.log(`Wrote ${reviews.length} copy reviews to ${outputDirectory}`);
