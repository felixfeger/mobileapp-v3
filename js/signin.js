// Sign-in screen (also what the Account tab shows when signed out).
// Real OAuth only: the button starts the Authorization Code + PKCE flow, or is disabled with an explanation
// of exactly what must be configured. It never pretends someone is signed in.
import { $, esc, toast } from '../ui.js';
import { icon } from '../icons.js';
import { AUTH } from '../config.js';
import { getSession, takeNotice, startLogin, missingConfig, redirectUri, OAuthError } from '../auth/oauth.js';
import { navigate } from '../router.js';

const GOOD = new Set(['cancelled', 'session_expired']);   // gentle messages vs. real errors

export function renderSignIn(main, { query }) {
  if (getSession()) return navigate('/account');
  const notice = takeNotice();
  const missing = missingConfig(), configured = missing.length === 0;
  const host = new URL(AUTH.origin).host;
  const returnTo = /^#\/(?!\/)\S*$/.test(query.get('return') || '') ? query.get('return') : '#/account';

  main.innerHTML = `
    <section class="card signin" aria-labelledby="pageTitle">
      <img class="signin-logo" src="img/logo.png" alt="City Metro" width="64" height="64">
      <h1 class="page-title" id="pageTitle">Sign in with your transit account</h1>
      <p class="lead">Use your City Metro transit account to save places and trips. It's designed to be the same account across Trip-Planner, Alerts, Map, Transit and BrickPass where supported.</p>
      ${notice ? `<div class="banner ${GOOD.has(notice.code) ? 'info' : 'error'}" role="alert">${icon(GOOD.has(notice.code) ? 'info' : 'alert')}<p>${esc(notice.message)}</p></div>` : ''}
      <p id="signinErr" class="form-error" role="alert" hidden></p>
      <button id="signInBtn" class="btn primary lg block" type="button" ${configured ? '' : 'disabled aria-describedby="cfgHelp"'}>${icon('lock')}<span>Continue with City Metro</span></button>
      <p class="fine">You'll go to <strong>${esc(host)}</strong> to sign in. Trip-Planner never sees your password and has no password of its own.</p>
      ${configured ? '' : `
      <section class="config-help" id="cfgHelp" aria-labelledby="cfgTitle">
        <h2 id="cfgTitle">${icon('info')}Sign-in isn't configured yet</h2>
        <p>To turn on real sign-in, supply these in <code>js/config.js</code>. Nothing is guessed, and no one can be signed in until this is done.</p>
        <ul class="cfg-list">
          <li class="${missing.includes('issuer') ? 'miss' : 'ok'}"><code>AUTH.issuer</code><span>The application's issuer URL, e.g. <code>${esc(AUTH.origin)}/application/o/&lt;slug&gt;/</code></span><b>${missing.includes('issuer') ? 'Needed' : 'Set'}</b></li>
          <li class="${missing.includes('clientId') ? 'miss' : 'ok'}"><code>AUTH.clientId</code><span>The Client ID of a <em>public</em> OAuth client (no secret is used).</span><b>${missing.includes('clientId') ? 'Needed' : 'Set'}</b></li>
        </ul>
        <p>Then register this redirect URI on that application (Authorization Code with PKCE):</p>
        <div class="copybox"><code id="redirUri">${esc(redirectUri())}</code><button class="btn ghost sm" type="button" id="copyUri">${icon('copy')}<span>Copy</span></button></div>
      </section>`}
      <p class="fine">Signing in once across several City Metro services depends on how the central sign-in service and each app are configured. Trip-Planner only handles its own sign-in and sign-out.</p>
      <p class="center"><a href="#/">Continue without signing in</a></p>
    </section>`;

  const btn = $('#signInBtn'), err = $('#signinErr');
  btn.addEventListener('click', async () => {
    err.hidden = true; btn.disabled = true; btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
    try { await startLogin(returnTo); }
    catch (e) {
      btn.disabled = false; btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy');
      err.textContent = e instanceof OAuthError ? e.message : 'Something went wrong starting sign-in. Please try again.'; err.hidden = false; btn.focus();
    }
  });
  const copy = $('#copyUri');
  if (copy) copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#redirUri').textContent); toast('Redirect URI copied.'); }
    catch { toast('Select the address and copy it manually.'); }
  });
}
