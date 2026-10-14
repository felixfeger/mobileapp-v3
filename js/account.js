// Account: the signed-in screen (signed out visitors get the sign-in screen instead).
import { $, esc, fmtTime, toast, initials } from '../ui.js';
import { icon } from '../icons.js';
import { AUTH, LINKS } from '../config.js';
import { getSession, signOut, signOutEverywhere } from '../auth/oauth.js';
import { notifyAuthChange } from '../components/shell.js';
import { renderSignIn } from './signin.js';
import { navigate } from '../router.js';

export function renderAccount(main, ctx) {
  const s = getSession();
  if (!s) return renderSignIn(main, ctx);
  const manage = LINKS.accountSettings || `${AUTH.origin}/if/user/`;
  main.innerHTML = `
    <h1 class="page-title" id="pageTitle">Account</h1>
    <div class="account">
      <section class="card profile" aria-label="Your profile">
        <span class="avatar xl" aria-hidden="true">${esc(initials(s.user.name))}</span>
        <div><h2>${esc(s.user.name)}</h2>${s.user.email ? `<p>${esc(s.user.email)}</p>` : ''}${s.user.username ? `<p class="muted">@${esc(s.user.username)}</p>` : ''}</div>
      </section>
      <section class="card" aria-labelledby="ta">
        <h2 id="ta">Transit account</h2>
        <p>You're signed in with your City Metro transit account. Manage your name, email and password there.</p>
        <a class="btn ghost block" href="${esc(manage)}" target="_blank" rel="noopener noreferrer"><span>Manage transit account</span>${icon('external')}</a>
        <p class="fine">This sign-in is valid until about ${esc(fmtTime(s.expiresAt))} in this browser tab.</p>
      </section>
      <section class="card" aria-labelledby="so">
        <h2 id="so">Sign out</h2>
        <button class="btn dark block" type="button" id="signOutBtn">${icon('logout')}<span>Sign out of Trip-Planner</span></button>
        <button class="btn ghost block" type="button" id="signOutAll"><span>Sign out of all City Metro services</span></button>
        <p class="fine">The first only signs you out here. The second also ends your session with the central sign-in service, so other City Metro apps will ask you to sign in again.</p>
      </section>
    </div>`;
  $('#signOutBtn').addEventListener('click', () => { signOut(); notifyAuthChange(); toast('You signed out of Trip-Planner.'); navigate('/'); });
  $('#signOutAll').addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true; b.classList.add('is-loading');
    const url = await signOutEverywhere();
    notifyAuthChange();
    if (url) location.assign(url);
    else { toast('Signed out here. The sign-in service did not offer a global sign-out.'); navigate('/'); }
  });
}
