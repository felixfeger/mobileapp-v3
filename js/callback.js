// Runs on callback.html, the page the sign-in service sends the browser back to.
// It finishes the Authorization Code + PKCE exchange, then returns to the app (success) or to the
// sign-in screen with a message (cancelled, expired, error). Nothing here can create a session by itself:
// completeLogin() only succeeds after the token endpoint accepted the code and the ID token checked out.
import { completeLogin, setNotice, OAuthError } from './oauth.js';

const appUrl = hash => new URL('./' + hash, location.href).href;   // callback.html sits next to index.html

(async () => {
  try {
    const { returnTo } = await completeLogin(location.search);
    history.replaceState(null, '', location.pathname);              // the code never stays in the address bar
    location.replace(appUrl(returnTo));
  } catch (e) {
    const err = e instanceof OAuthError ? e : new OAuthError('unknown', 'Something went wrong while signing in. Please try again.');
    setNotice(err.code, err.message);
    history.replaceState(null, '', location.pathname);
    location.replace(appUrl('#/signin'));
  }
})();
