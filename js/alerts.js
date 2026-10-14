// Alerts: sample service alerts, filterable by line.
import { esc, lineBadge, agoText, plural } from '../ui.js';
import { icon } from '../icons.js';
import { allAlerts, allLines, getLine, getStop } from '../data/trip-service.js';
import { DEMO_NOTICE } from '../data/demo-data.js';

export function renderAlerts(main) {
  const lines = allLines();
  let filter = 'all';
  main.innerHTML = `
    <h1 class="page-title" id="pageTitle">Alerts</h1>
    <p class="lead">Delays, detours and maintenance that may affect your trip.</p>
    <p class="demo-note">${icon('info')}<span>${esc(DEMO_NOTICE)} These alerts are samples.</span></p>
    <div class="filters" role="group" aria-label="Filter alerts">
      <button type="button" class="filter-chip" aria-pressed="true" data-f="all">All</button>
      ${lines.map(l => `<button type="button" class="filter-chip" aria-pressed="false" data-f="${esc(l.id)}">${lineBadge(l)}<span>${esc(l.name)}</span></button>`).join('')}
      <button type="button" class="filter-chip" aria-pressed="false" data-f="general"><span>Stops &amp; stations</span></button>
    </div>
    <section id="alertList" aria-live="polite" aria-label="Alerts"></section>`;
  const list = main.querySelector('#alertList');
  function draw() {
    const items = allAlerts().filter(a => filter === 'all' || (filter === 'general' ? !a.lines.length : a.lines.includes(filter)));
    const name = filter === 'all' ? '' : filter === 'general' ? ' for stops and stations' : ` for ${getLine(filter).name}`;
    list.innerHTML = items.length ? `<p class="count">${plural(items.length, 'alert')}${esc(name)}</p>` + items.map(a => `
      <article class="card alert-card ${a.severity}">
        <span class="ic-circle ${a.severity === 'warning' ? 'warn' : ''}">${icon(a.severity === 'warning' ? 'alert' : 'info')}</span>
        <div class="alert-body">
          <h2>${esc(a.title)}</h2><p>${esc(a.body)}</p>
          <div class="meta">${a.lines.map(id => lineBadge(getLine(id))).join('')}${a.stops.map(id => `<span class="chip">${icon('pin')}${esc(getStop(id).name)}</span>`).join('')}<span class="chip chip-gray">${esc(agoText(a.minsAgo))}</span></div>
        </div></article>`).join('')
      : `<div class="card state-card"><span class="ic-circle lg">${icon('check')}</span><h2>No alerts${esc(name)}</h2><p>Nothing is affecting service here right now.</p></div>`;
  }
  main.querySelector('.filters').addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    filter = b.dataset.f;
    main.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    draw();
  });
  draw();
}
