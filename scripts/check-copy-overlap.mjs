import { homepage } from '../src/content/homepage.mjs';
import { sectionPages } from '../src/content/section-pages.mjs';

function plain(value) {
  if (typeof value === 'string') return value;
  return value.parts.map(part => {
    if (typeof part === 'string') return part;
    if (typeof part.emphasis === 'string') return part.emphasis;
    if (part.link) return part.link.label;
    return '';
  }).join('');
}

function pageText(page) {
  return [
    page.h1,
    ...page.introduction.map(plain),
    ...page.sections.flatMap(section => [section.title, ...section.paragraphs.map(plain)]),
    ...page.links.map(link => link.label),
  ].join(' ');
}

function htmlText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, decimal) => String.fromCodePoint(Number.parseInt(hex ?? decimal, hex ? 16 : 10)))
    .replace(/&(?:nbsp|amp|quot|apos|#39);/gi, entity => ({
      '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&apos;': "'", '&#39;': "'",
    })[entity.toLowerCase()])
    .replace(/\s+/g, ' ');
}

function words(text) {
  return text.toLocaleLowerCase('en').match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
}

function longestSharedRun(leftText, rightText) {
  const left = words(leftText), right = words(rightText);
  let previous = new Uint16Array(right.length + 1);
  let bestLength = 0, bestEnd = 0;
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = new Uint16Array(right.length + 1);
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      if (left[leftIndex - 1] !== right[rightIndex - 1]) continue;
      current[rightIndex] = previous[rightIndex - 1] + 1;
      if (current[rightIndex] > bestLength) {
        bestLength = current[rightIndex];
        bestEnd = leftIndex;
      }
    }
    previous = current;
  }
  return { words: bestLength, phrase: left.slice(bestEnd - bestLength, bestEnd).join(' ') };
}

const homeText = [
  homepage.h1,
  ...homepage.introduction,
  homepage.indexHeading,
  ...homepage.sections.flatMap(section => [section.title, plain(section.summary), section.action]),
  homepage.about.title,
  ...homepage.about.paragraphs,
  ...homepage.about.links.map(link => link.label),
].join(' ');

const pages = new Map([['home', homeText], ...sectionPages.map(page => [page.slug, pageText(page)])]);
const comparisons = {
  home: ['https://jaredgoldberg.ca/writing/'],
  'media-archives-and-memory': ['https://jaredgoldberg.ca/writing/medium-is-the-message/'],
  'community-service': [
    'https://jaredgoldberg.ca/projects/the-money-club/maiden-voyage/',
    'https://jaredgoldberg.ca/writing/the-money-club-as-a-deployable-education-system/',
    'https://jaredgoldberg.ca/projects/capital-works/',
    'https://jaredgoldberg.ca/writing/the-future-of-work-is-a-design-problem/',
    'https://jaredgoldberg.ca/writing/dignity-is-a-systems-output/',
  ],
  'systems-and-institutions': [
    'https://jaredgoldberg.ca/work/china.html',
    'https://jaredgoldberg.ca/work/loblaw.html',
    'https://jaredgoldberg.ca/work/walmart.html',
    'https://jaredgoldberg.ca/work/canadian-tire.html',
    'https://jaredgoldberg.ca/writing/real-systems-incentives/',
  ],
  art: ['https://jaredgoldberg.ca/writing/'],
};

const results = [];
for (const [page, urls] of Object.entries(comparisons)) {
  for (const url of urls) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    const overlap = longestSharedRun(pages.get(page), htmlText(await response.text()));
    results.push({ page, url, status: response.status, ...overlap });
  }
}

const threshold = 18;
for (const result of results) console.log(`${result.page} | ${result.words} words | ${result.url} | ${result.phrase}`);
if (results.some(result => result.words >= threshold)) {
  throw new Error(`Found a shared run of ${threshold} or more words`);
}
console.log(`No shared run reached the ${threshold}-word substantive-repetition threshold.`);
