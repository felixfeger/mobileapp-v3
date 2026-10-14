// City Metro Trip-Planner — entry point: builds the shell and shows the screen for the current address.
import { $, setTitle, focusHeading, esc } from './ui.js';
import { mountShell, updateShell } from './components/shell.js';
import { startRouter } from './router.js';
import { renderHome } from './views/home.js';
import { renderResults } from './views/results.js';
import { renderItinerary } from './views/itinerary.js';
import { renderTransit } from './views/transit.js';
import { renderMap } from './views/map.js';
import { renderAlerts } from './views/alerts.js';
import { renderAccount } from './views/account.js';
import { renderSignIn } from './views/signin.js';

const VIEWS = {
  '/':        [renderHome, 'Plan your trip'],
  '/results': [renderResults, 'Trips'],
  '/trip':    [renderItinerary, 'Your trip'],
  '/transit': [renderTransit, 'Transit'],
  '/map':     [renderMap, 'Map'],
  '/alerts':  [renderAlerts, 'Alerts'],
  '/account': [renderAccount, 'Account'],
  '/signin':  [renderSignIn, 'Sign in']
};

mountShell($('#app'));
let routeId = 0;

startRouter(async route => {
  const id = ++routeId, alive = () => id === routeId;
  const main = $('#main');
  const fresh = main.cloneNode(false);                 // a clean <main>: drops the previous screen's event listeners
  main.replaceWith(fresh);
  const [view, title] = VIEWS[route.path] || [null, 'Page not found'];
  setTitle(title);
  updateShell(route.path);
  try {
    if (view) await view(fresh, { query: route.query, path: route.path, alive });
    else fresh.innerHTML = `<section class="card state-card" aria-labelledby="pageTitle"><h1 class="page-title sm" id="pageTitle">Page not found</h1><p>That page doesn't exist.</p><a class="btn primary" href="#/">Plan a trip</a></section>`;
  } catch (e) {
    console.error(e);
    if (alive()) fresh.innerHTML = `<section class="card state-card" role="alert"><h1 class="page-title sm" id="pageTitle">Something went wrong</h1><p>${esc(e.message || 'Please try again.')}</p><a class="btn primary" href="#/">Back to start</a></section>`;
  }
  if (alive()) { scrollTo(0, 0); focusHeading(); }
});
