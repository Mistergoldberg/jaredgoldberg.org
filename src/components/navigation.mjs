import { escapeHTML as e } from './html.mjs';
function entry(item, currentPath, depth = 0) {
  const label = `<span class="menu-panel__text">${e(item.label)}</span>`;
  if (item.children) {
    const group = depth ? 'menu-panel__subgroup' : 'menu-panel__group';
    const summary = depth ? 'menu-panel__nested-summary' : 'menu-panel__summary';
    const containsCurrent = item.children.some(child => child.href === currentPath);
    return `<li><details class="${group}"${containsCurrent ? ' open' : ''}><summary class="${summary}" data-menu-depth="${depth}">${label}<span class="menu-panel__chevron" aria-hidden="true"></span></summary><ul class="menu-panel__sublist">${item.children.map(child => entry(child, currentPath, depth + 1)).join('')}</ul></details></li>`;
  }
  if (!item.href.startsWith('/') || item.href.startsWith('//')) throw new Error('Site navigation must stay local');
  const className = depth ? 'menu-panel__nested-link' : 'menu-panel__link';
  return `<li><a class="${className}" data-menu-depth="${depth}" href="${e(item.href)}"${item.href === currentPath ? ' aria-current="page"' : ''}>${label}</a></li>`;
}
export function renderHeader() {
  return `<header class="site-header site-header--overlay" data-page-background><div class="layout-shell layout-shell--stage site-header__inner site-header__inner--no-brand"><button class="menu-trigger type-nav" type="button" data-menu-toggle aria-label="Open menu" aria-controls="site-menu-panel" aria-expanded="false" aria-haspopup="dialog"><span class="menu-trigger__label">Menu</span><span class="menu-trigger__icon" aria-hidden="true"></span></button></div></header>`;
}
export function renderNavigation(items, currentPath = '/') {
  return `<div id="site-menu-panel" class="menu-panel" data-menu-panel aria-hidden="true" inert>
    <div class="menu-panel__backdrop" data-menu-close aria-hidden="true"></div>
    <div class="menu-panel__sheet" role="dialog" aria-modal="true" aria-labelledby="menu-panel-title" tabindex="-1">
      <div class="menu-panel__top"><h2 id="menu-panel-title" class="u-sr-only">Main menu</h2><button class="menu-panel__close" type="button" data-menu-close aria-label="Close menu"><span class="menu-panel__close-icon" aria-hidden="true"></span></button></div>
      <nav class="menu-panel__nav" aria-label="Primary"><ul class="menu-panel__links">${items.map(item => entry(item, currentPath)).join('')}</ul></nav>
    </div></div>`;
}
