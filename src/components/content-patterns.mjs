import { escapeHTML as e } from './html.mjs';

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
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
  const values = items.filter(Boolean).map(item => requireText(item, 'metadata item'));
  if (!values.length) throw new Error('At least one metadata item is required');
  return `<p class="record-meta${className ? ` ${e(className)}` : ''}">${values.map(item => `<span>${e(item)}</span>`).join('')}</p>`;
}

export function renderCategoryLabel(label) {
  return `<span class="category-label">${e(requireText(label, 'category label'))}</span>`;
}

export function renderStatusLabel(label) {
  return `<span class="status-label">${e(requireText(label, 'status label'))}</span>`;
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
  const meta = `<p class="record-meta">${renderCategoryLabel(type)}${renderStatusLabel(status)}</p>`;
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

export function renderMediaPlaceholder({ label = 'Image pending', decorative = false } = {}) {
  const semantics = decorative ? ' aria-hidden="true"' : ` role="img" aria-label="${e(requireText(label, 'label'))}"`;
  return `<div class="media-frame media-frame--banner media-placeholder"${semantics}><span aria-hidden="true">${e(label)}</span></div>`;
}
