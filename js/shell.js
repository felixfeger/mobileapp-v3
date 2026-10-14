// The frame around every screen: compact header (logo, wordmark, account, hamburger), desktop top navigation,
// mobile bottom navigation, and the slide-in menu drawer.
import { $, $$, esc, initials, toast } from '../ui.js';
import { icon } from '../icons.js';
import { LINKS, AUTH } from '../config.js';
import { getSession, signOut } from '../auth/oauth.js';
import { navigate } from '../router.js';

export const NAV = [
  { id: 'plan',    path: '/',        label: 'Plan',    icon: 'route' },
  { id: 'transit', path: '/transit', label: 'Transit', icon: 'train' },
  { id: 'map',     path: '/map',     label: 'Map',     icon: 'map' },
  { id: 'alerts',  path: '/alerts',  label: 'Alerts',  icon: 'bell' },
  { id: 'account', path: '/account', label: 'Account', icon: 'user' }
];
export function navIdFor(path) {
  if (path === '/' || path === '/results' || path === '/trip') return 'plan';
  if (path === '/signin' || path === '/account') return 'account';
  return (NAV.find(n => n.path === path) || NAV[0]).id;
}

// Menu destinations that come from config.js. An empty URL is shown as "not configured", never invented.
const MENU_LINKS = [
  { key: 'website',       label: 'City Metro website',        icon: 'building' },
  { key: 'transitPolice', label: 'City Metro Transit Police', icon: 'shield' },
  { key: 'support',       label: 'Support',                   icon: 'info' }
];

let opener = null;

export function mountShell(root) {
  root.innerHTML = `
    <a class="skip" href="#main">Skip to content</a>
    <header class="hdr">
      <a class="hdr-brand" href="#/" aria-label="City Metro Trip-Planner, home">
        <img src="img/logo.png" alt="" width="38" height="38">
        <span class="wordmark">City <span>Metro</span></span>
        <span class="app-name">Trip-Planner</span>
      </a>
      <nav class="hdr-nav" aria-label="Main">
        ${NAV.map(n => `<a href="#${n.path}" data-nav="${n.id}">${icon(n.icon)}<span>${n.label}</span></a>`).join('')}
      </nav>
      <a class="hdr-account" id="hdrAccount" href="#/account"></a>
      <button class="hdr-menu" id="menuBtn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="drawer">${icon('menu')}</button>
    </header>
    <main id="main" class="main" tabindex="-1"></main>
    <nav class="bnav" aria-label="Main">
      ${NAV.map(n => `<a href="#${n.path}" data-nav="${n.id}"><span class="bnav-ic">${icon(n.icon)}</span><span class="bnav-label">${n.label}</span></a>`).join('')}
    </nav>
    <div class="scrim" id="scrim" hidden></div>
    <aside class="drawer" id="drawer" aria-label="Menu" inert></aside>`;
  renderDrawer();
  bind();
}

function renderDrawer() {
  const s = getSession();
  const links = MENU_LINKS.map(l => {
    const url = LINKS[l.key];
    return url
      ? `<a class="dl" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="ic-circle sm">${icon(l.icon)}</span><span class="dl-text">${l.label}</span>${icon('external', 'dl-end')}</a>`
      : `<button class="dl is-unavailable" type="button" data-unavailable="${esc(l.label)}" aria-disabled="true"><span class="ic-circle sm">${icon(l.icon)}</span><span class="dl-text">${l.label}<small>Link not configured yet</small></span></button>`;
  }).join('');
  $('#drawer').innerHTML = `
    <div class="drawer-head">
      <p class="drawer-title">Menu</p>
      <button class="icon-btn" id="closeBtn" type="button" aria-label="Close menu">${icon('close')}</button>
    </div>
    <div class="drawer-body">
      ${s
        ? `<div class="drawer-user"><span class="avatar">${esc(initials(s.user.name))}</span><div><strong>${esc(s.user.name)}</strong><small>${esc(s.user.email)}</small></div></div>`
        : `<a class="btn primary block" href="#/signin" data-close>Sign in</a>`}
      <p class="drawer-h">More from City Metro</p>
      ${links}
      <p class="drawer-h">Your account</p>
      <a class="dl" href="#/account" data-close><span class="ic-circle sm">${icon('user')}</span><span class="dl-text">Account settings</span></a>
      ${s ? `<button class="dl" type="button" id="drawerSignOut"><span class="ic-circle sm">${icon('logout')}</span><span class="dl-text">Sign out</span></button>` : ''}
    </div>
    <p class="drawer-foot">Trip results and alerts in this app are demonstration data.</p>`;
}

function focusables() { return $$('#drawer a[href], #drawer button:not([disabled])').filter(el => el.offsetParent !== null || el === document.activeElement); }

export function openDrawer() {
  const drawer = $('#drawer');
  opener = document.activeElement;
  renderDrawer();
  drawer.inert = false;
  drawer.classList.add('open'); $('#scrim').hidden = false;
  $('#menuBtn').setAttribute('aria-expanded', 'true');
  document.body.classList.add('no-scroll');
  $('#closeBtn').focus();
}
export function closeDrawer({ restore = true } = {}) {
  const drawer = $('#drawer');
  if (!drawer.classList.contains('open')) return;
  drawer.classList.remove('open'); drawer.inert = true; $('#scrim').hidden = true;
  $('#menuBtn').setAttribute('aria-expanded', 'false');
  document.body.classList.remove('no-scroll');
  if (restore && opener && opener.focus) opener.focus();
}

function bind() {
  $('#menuBtn').addEventListener('click', openDrawer);
  $('#scrim').addEventListener('click', () => closeDrawer());
  $('#drawer').addEventListener('click', e => {
    if (e.target.closest('#closeBtn')) return closeDrawer();
    const un = e.target.closest('[data-unavailable]');
    if (un) return toast(`${un.dataset.unavailable} hasn't been configured yet. Add its URL in js/config.js.`);
    if (e.target.closest('#drawerSignOut')) { signOut(); closeDrawer({ restore: false }); notifyAuthChange(); toast('You signed out of Trip-Planner.'); return navigate('/'); }
    if (e.target.closest('[data-close]')) closeDrawer({ restore: false });
  });
  document.addEventListener('keydown', e => {
    const drawer = $('#drawer');
    if (!drawer.classList.contains('open')) return;
    if (e.key === 'Escape') { e.preventDefault(); return closeDrawer(); }
    if (e.key === 'Tab') {                                   // keep keyboard focus inside the open drawer
      const f = focusables(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  addEventListener('resize', () => { if (innerWidth >= 900) closeDrawer({ restore: false }); });
  addEventListener('cm-auth', () => { renderAccountChip(); renderDrawer(); });
}

export const notifyAuthChange = () => dispatchEvent(new Event('cm-auth'));

function renderAccountChip() {
  const s = getSession(), a = $('#hdrAccount');
  if (!a) return;
  a.innerHTML = s
    ? `<span class="avatar" aria-hidden="true">${esc(initials(s.user.name))}</span><span class="sr-only">Account: ${esc(s.user.name)}</span>`
    : `<span class="avatar ghost" aria-hidden="true">${icon('user')}</span><span class="hdr-account-label">Sign in</span>`;
  a.setAttribute('href', s ? '#/account' : '#/signin');
}

// Called on every screen change.
export function updateShell(path) {
  const id = navIdFor(path);
  $$('[data-nav]').forEach(a => {
    const on = a.dataset.nav === id;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  renderAccountChip();
  closeDrawer({ restore: false });
}

export const authOriginHost = () => new URL(AUTH.origin).host;
