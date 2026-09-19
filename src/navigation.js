// Drawer behavior only. Fixture navigation is rendered at build time from content data.
const panel = document.querySelector('[data-menu-panel]');
const sheet = panel.querySelector('.menu-panel__sheet');
const nav = panel.querySelector('nav');
const toggle = document.querySelector('[data-menu-toggle]');
const background = [...document.querySelectorAll('[data-page-background]')];
let previousFocus;
let scrollY = 0;
const isOpen = () => panel.classList.contains('is-open');
const focusables = () => [...sheet.querySelectorAll('a[href], button, summary, [tabindex]:not([tabindex="-1"])')]
  .filter(element => !element.disabled && element.checkVisibility() && !element.closest('[inert]'));
function openMenu() {
  if (isOpen()) return;
  previousFocus = document.activeElement;
  scrollY = window.scrollY;
  panel.inert = false;
  panel.setAttribute('aria-hidden', 'false');
  panel.classList.add('is-open');
  toggle.setAttribute('aria-expanded', 'true');
  document.documentElement.classList.add('is-scroll-locked');
  document.body.classList.add('is-scroll-locked', 'is-menu-open');
  document.body.style.top = `-${scrollY}px`;
  nav.scrollTop = 0;
  sheet.querySelector('button').focus({preventScroll: true});
  background.forEach(element => { element.inert = true; });
}
function closeMenu() {
  if (!isOpen()) return;
  panel.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
  background.forEach(element => { element.inert = false; });
  document.documentElement.classList.remove('is-scroll-locked');
  document.body.classList.remove('is-scroll-locked', 'is-menu-open');
  document.body.style.top = '';
  window.scrollTo({top: scrollY, left: 0, behavior: 'instant'});
  (previousFocus?.isConnected ? previousFocus : toggle).focus({preventScroll: true});
  panel.inert = true;
  panel.setAttribute('aria-hidden', 'true');
}
toggle.addEventListener('click', openMenu);
panel.querySelectorAll('[data-menu-close], a').forEach(element => element.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (!isOpen()) return;
  if (event.key === 'Escape') { event.preventDefault(); closeMenu(); return; }
  if (event.key !== 'Tab') return;
  const items = focusables();
  const first = items[0] ?? sheet;
  const last = items.at(-1) ?? sheet;
  if (event.shiftKey && (document.activeElement === first || !sheet.contains(document.activeElement))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !sheet.contains(document.activeElement))) {
    event.preventDefault(); first.focus();
  }
});
// Hash destinations become the keyboard continuation point after an in-page selection.
window.addEventListener('hashchange', () => {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (!target) return;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({preventScroll: true});
});
