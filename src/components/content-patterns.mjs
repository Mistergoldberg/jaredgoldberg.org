import { escapeHTML as e } from './html.mjs';

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
  return value;
}

function requireClassName(value, field = 'class name') {
  if (value === '') return value;
  if (typeof value !== 'string' || !/^[a-z][a-z0-9_-]*(?: [a-z][a-z0-9_-]*)*$/.test(value)) {
    throw new Error(`${field} must contain space-separated CSS class names`);
  }
  return value;
}

function linkTarget(href) {
  requireText(href, 'href');
  if (/^(?:\/|#)/.test(href)) return { external: false };
  const url = new URL(href);
  if (url.protocol !== 'https:') throw new Error('Links must be local fragments, root-relative paths, or HTTPS URLs');
  return { external: true };
}

export function renderMetadata(items, className = '') {
  if (!Array.isArray(items)) throw new Error('Metadata items must be an array');
  const variants = new Set(['default', 'category', 'status']);
  const values = items.filter(Boolean).map(item => {
    const entry = typeof item === 'string' ? {label:item,variant:'default'} : item;
    const label = requireText(entry?.label, 'metadata item');
    const variant = entry.variant ?? 'default';
    if (!variants.has(variant)) throw new Error(`Unsupported metadata variant: ${variant}`);
    const variantClass = variant === 'default' ? '' : ` class="${variant}-label"`;
    return `<span${variantClass}>${e(label)}</span>`;
  });
  if (!values.length) throw new Error('At least one metadata item is required');
  const extraClass = requireClassName(className);
  return `<p class="record-meta${extraClass ? ` ${e(extraClass)}` : ''}">${values.join('')}</p>`;
}

export function renderCategoryLabel(label) {
  return `<span class="category-label">${e(requireText(label, 'category label'))}</span>`;
}

export function renderStatusLabel(label) {
  return `<span class="status-label">${e(requireText(label, 'status label'))}</span>`;
}

export function renderHeading({ level, text, id = '', className = '' } = {}) {
  if (!Number.isInteger(level) || level < 1 || level > 6) throw new Error('Heading level must be an integer from 1 to 6');
  const headingId = id ? ` id="${e(requireText(id, 'heading id'))}"` : '';
  const headingClass = className ? ` class="${e(requireClassName(className))}"` : '';
  return `<h${level}${headingId}${headingClass}><span class="heading-highlight">${e(requireText(text, 'heading text'))}</span></h${level}>`;
}

export function renderTextLink({ href, label, external, newTab = false } = {}) {
  const destination = linkTarget(href);
  const isExternal = external ?? destination.external;
  const className = `text-link${isExternal ? ' text-link--external' : ''}`;
  const target = newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a class="${className}" href="${e(href)}"${target}>${e(requireText(label, 'label'))}${isExternal ? '<span class="text-link__external-mark" aria-hidden="true"></span>' : ''}${newTab ? '<span class="u-sr-only"> (opens in a new tab)</span>' : ''}</a>`;
}

export function renderActionLink({ href, label, variant = 'secondary' } = {}) {
  if (!['primary', 'secondary', 'muted'].includes(variant)) throw new Error(`Unsupported action variant: ${variant}`);
  linkTarget(href);
  return `<a class="btn btn--${variant}" href="${e(href)}">${e(requireText(label, 'label'))}</a>`;
}

export function renderProjectRecord({ title, type, status, summary, destination } = {}) {
  const meta = renderMetadata([
    {label:type,variant:'category'},
    {label:status,variant:'status'},
  ]);
  const action = destination ? `<div class="record__actions">${renderTextLink(destination)}</div>` : '';
  return `<article class="record record--project"><div class="record__header"><h3 class="record__title">${e(requireText(title, 'title'))}</h3>${meta}</div><p class="record__summary">${e(requireText(summary, 'summary'))}</p>${action}</article>`;
}

export function renderInquiryRecord({ title, summary } = {}) {
  return `<article class="record record--inquiry"><h3 class="record__title">${e(requireText(title, 'title'))}</h3><p class="record__summary">${e(requireText(summary, 'summary'))}</p></article>`;
}

export function renderArchiveExcerpt({ body, destination } = {}) {
  return `<article class="editorial-excerpt"><p>${e(requireText(body, 'body'))}</p><div class="editorial-excerpt__action">${renderTextLink(destination)}</div></article>`;
}

export function renderWritingRecord({ title, summary, href } = {}) {
  return `<article class="writing-record"><h3 class="writing-record__title">${renderTextLink({ href, label: title })}</h3><p>${e(requireText(summary, 'summary'))}</p></article>`;
}

export function renderPendingDestination(label) {
  return `<p class="destination-pending" data-destination-status="pending"><span class="destination-pending__label">${e(requireText(label, 'destination label'))}</span><span class="destination-pending__status">Destination pending</span></p>`;
}

const mediaVariants = new Set(['banner', 'square']);
const mediaPositions = new Set(['center', 'top', 'bottom', 'left', 'right']);

function mediaClass(variant, position = 'center') {
  if (!mediaVariants.has(variant)) throw new Error(`Unsupported media variant: ${variant}`);
  if (!mediaPositions.has(position)) throw new Error(`Unsupported media position: ${position}`);
  return `media-frame media-frame--${variant} media-frame--position-${position}`;
}

export function renderMediaPlaceholder({ label = 'Image pending', decorative = false, variant = 'banner' } = {}) {
  const semantics = decorative ? ' aria-hidden="true"' : ` role="img" aria-label="${e(requireText(label, 'label'))}"`;
  return `<div class="${mediaClass(variant)} media-placeholder"${semantics}><span aria-hidden="true">${e(label)}</span></div>`;
}

export function renderMediaSlot({ media, placeholder = {}, variant = 'banner' } = {}) {
  if (!media) return renderMediaPlaceholder({...placeholder, variant});
  if (typeof media.src !== 'string' || !media.src.startsWith('/') || media.src.startsWith('//')) {
    throw new Error('Media src must be a root-relative local path');
  }
  if (typeof media.alt !== 'string') throw new Error('Media alt is required; use an empty string only for decorative images');
  if (!Number.isInteger(media.width) || media.width < 1 || !Number.isInteger(media.height) || media.height < 1) {
    throw new Error('Media width and height must be positive integers');
  }
  const loading = media.loading ?? 'lazy';
  const fetchPriority = media.fetchPriority ?? 'auto';
  if (!['eager', 'lazy'].includes(loading)) throw new Error(`Unsupported media loading mode: ${loading}`);
  if (!['auto', 'high', 'low'].includes(fetchPriority)) throw new Error(`Unsupported media fetch priority: ${fetchPriority}`);
  const position = media.position ?? 'center';
  return `<div class="${mediaClass(variant, position)}"><img src="${e(media.src)}" alt="${e(media.alt)}" width="${media.width}" height="${media.height}" loading="${loading}" decoding="async" fetchpriority="${fetchPriority}"></div>`;
}
