// ─────────────────────────────────────────────────────────────────────────────
//  Transit-account sign-in (OAuth 2.0 / OpenID Connect) for a browser app.
//
//  • Authorization Code flow with PKCE (S256). This is a PUBLIC client: there is no client secret anywhere.
//  • Provider endpoints come from <issuer>/.well-known/openid-configuration (discovery), never hard-coded.
//  • Nothing here ever fakes a login: a session exists only after the provider returned a valid code and the
//    token endpoint answered. If client id / issuer are missing, `beginLogin` refuses with `not_configured`.
//
//  The ID token arrives straight from the token endpoint over TLS, so its claims (issuer, audience, expiry,
//  nonce) are checked but its signature is not (allowed by OIDC Core §3.1.3.7). Tokens live in sessionStorage
//  (tab-scoped), never in localStorage.
//
//  Every function takes an optional `env` so it can be tested without a browser.
// ─────────────────────────────────────────────────────────────────────────────
import { AUTH } from '../config.js';

export class OAuthError extends Error {
  constructor(code, message) { super(message); this.name = 'OAuthError'; this.code = code; }
}

const KEYS = { flow: 'cm_tp_oauth', session: 'cm_tp_session', notice: 'cm_tp_notice' };
const enc = new TextEncoder();
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

export const randomString = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));
export const pkceChallenge = async verifier => b64url(await crypto.subtle.digest('SHA-256', enc.encode(verifier)));

export function decodeJwt(jwt) {
  try {
    const part = String(jwt).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part), c => c.charCodeAt(0))));
  } catch { return {}; }
}

const defaults = () => ({
  fetch: (...a) => globalThis.fetch(...a),
  storage: globalThis.sessionStorage,
  now: () => Date.now(),
  origin: globalThis.location ? globalThis.location.origin : '',
  config: AUTH
});
const withEnv = e => ({ ...defaults(), ...(e || {}) });
const trimSlash = s => String(s || '').replace(/\/+$/, '');

// Only in-app hash routes may be used as the "go back to" target (no open redirects).
export const safeReturn = r => (typeof r === 'string' && /^#\/(?!\/)\S*$/.test(r) ? r : '#/account');

// ── configuration ──
export function redirectUri(e) { const env = withEnv(e); return env.config.redirectUri || `${env.origin}/callback.html`; }
export function missingConfig(e) {
  const c = withEnv(e).config, missing = [];
  if (!c.issuer || /[<>]/.test(c.issuer)) missing.push('issuer');
  if (!c.clientId) missing.push('clientId');
  return missing;
}
export const isConfigured = e => missingConfig(e).length === 0;

// ── discovery ──
const discoveryCache = new Map();
export const clearDiscoveryCache = () => discoveryCache.clear();
export async function discover(e) {
  const env = withEnv(e), issuer = trimSlash(env.config.issuer);
  if (discoveryCache.has(issuer)) return discoveryCache.get(issuer);
  let meta;
  try {
    const res = await env.fetch(`${issuer}/.well-known/openid-configuration`, { headers: { Accept: 'application/json' }, credentials: 'omit' });
    if (!res.ok) throw new Error(String(res.status));
    meta = await res.json();
  } catch {
    throw new OAuthError('discovery_failed', "We couldn't reach the City Metro sign-in service. Check your connection and try again.");
  }
  if (!meta.authorization_endpoint || !meta.token_endpoint || !meta.issuer) {
    throw new OAuthError('discovery_failed', 'The sign-in service returned an unexpected configuration.');
  }
  discoveryCache.set(issuer, meta);
  return meta;
}

// ── step 1: build the authorization URL (and remember state / verifier / nonce) ──
export async function beginLogin(returnTo, e) {
  const env = withEnv(e), missing = missingConfig(env);
  if (missing.length) throw new OAuthError('not_configured', `Sign-in isn't set up yet (missing: ${missing.join(', ')}).`);
  const meta = await discover(env);
  const verifier = randomString(48), state = randomString(24), nonce = randomString(16);
  env.storage.setItem(KEYS.flow, JSON.stringify({ state, verifier, nonce, returnTo: safeReturn(returnTo), at: env.now() }));
  const url = new URL(meta.authorization_endpoint);
  const params = {
    response_type: 'code', client_id: env.config.clientId, redirect_uri: redirectUri(env), scope: env.config.scopes,
    state, nonce, code_challenge: await pkceChallenge(verifier), code_challenge_method: 'S256'
  };
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}
export async function startLogin(returnTo, e) { location.assign(await beginLogin(returnTo, e)); }

// ── step 2: the provider sent the browser back to the callback page ──
export async function completeLogin(search, e) {
  const env = withEnv(e), params = new URLSearchParams(search);
  let flow = null;
  try { flow = JSON.parse(env.storage.getItem(KEYS.flow)); } catch { /* none */ }
  env.storage.removeItem(KEYS.flow);                                   // single use, even when this fails

  if (params.get('error')) {
    if (params.get('error') === 'access_denied') throw new OAuthError('cancelled', 'Sign-in was cancelled. You were not signed in.');
    throw new OAuthError('provider_error', params.get('error_description') || 'The sign-in service reported a problem.');
  }
  if (!flow) throw new OAuthError('no_flow', 'This sign-in link has expired or was already used. Please start again.');
  if (env.now() - flow.at > 10 * 60 * 1000) throw new OAuthError('flow_expired', 'That sign-in took too long. Please start again.');
  if (!params.get('state') || params.get('state') !== flow.state) throw new OAuthError('state_mismatch', "We couldn't verify that sign-in came from this device. Please start again.");
  const code = params.get('code');
  if (!code) throw new OAuthError('missing_code', 'The sign-in service did not return a sign-in code.');

  const meta = await discover(env);
  let res, tok = {};
  try {
    res = await env.fetch(meta.token_endpoint, {
      method: 'POST', credentials: 'omit',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(env), client_id: env.config.clientId, code_verifier: flow.verifier })
    });
    tok = await res.json().catch(() => ({}));
  } catch {
    throw new OAuthError('token_failed', "We couldn't reach the sign-in service to finish signing you in.");
  }
  if (!res.ok || !tok.access_token) throw new OAuthError('token_failed', tok.error_description || 'The sign-in service did not accept the request. Please try again.');

  const id = decodeJwt(tok.id_token);
  const aud = [].concat(id.aud || []);
  if (!tok.id_token || !id.sub || trimSlash(id.iss) !== trimSlash(meta.issuer) || !aud.includes(env.config.clientId) ||
      !(id.exp * 1000 > env.now() - 60000) || id.nonce !== flow.nonce) {
    throw new OAuthError('id_token_invalid', 'The sign-in response could not be verified. Please try again.');
  }

  let info = {};
  if (meta.userinfo_endpoint) {
    try {
      const ui = await env.fetch(meta.userinfo_endpoint, { headers: { Authorization: `Bearer ${tok.access_token}`, Accept: 'application/json' }, credentials: 'omit' });
      if (ui.ok) info = await ui.json();
    } catch { /* the ID token already carries who you are */ }
  }
  const claims = { ...id, ...info };
  if (info.sub && info.sub !== id.sub) throw new OAuthError('id_token_invalid', 'The sign-in response could not be verified. Please try again.');

  const session = {
    user: { sub: claims.sub, name: claims.name || claims.preferred_username || (claims.email || '').split('@')[0] || 'Rider', email: claims.email || '', username: claims.preferred_username || '' },
    idToken: tok.id_token, accessToken: tok.access_token,
    expiresAt: env.now() + (tok.expires_in ? tok.expires_in * 1000 : Math.max(0, id.exp * 1000 - env.now()))
  };
  env.storage.setItem(KEYS.session, JSON.stringify(session));
  return { returnTo: flow.returnTo, session };
}

// ── session ──
export function getSession(e) {
  const env = withEnv(e);
  let s = null;
  try { s = JSON.parse(env.storage.getItem(KEYS.session)); } catch { /* none */ }
  if (!s) return null;
  if (!(s.expiresAt > env.now())) {
    env.storage.removeItem(KEYS.session);
    setNotice('session_expired', 'Your session ended. Sign in again to continue.', env);
    return null;
  }
  return s;
}
export const getAccessToken = e => { const s = getSession(e); return s ? s.accessToken : null; };

// A one-time message for the sign-in screen (cancelled, failed, expired…).
export function setNotice(code, message, e) { withEnv(e).storage.setItem(KEYS.notice, JSON.stringify({ code, message })); }
export function takeNotice(e) {
  const env = withEnv(e);
  try { return JSON.parse(env.storage.getItem(KEYS.notice)); } catch { return null; } finally { env.storage.removeItem(KEYS.notice); }
}

// Signs out of THIS app only. The City Metro transit account itself stays signed in at the provider.
export function signOut(e) { const env = withEnv(e); env.storage.removeItem(KEYS.session); env.storage.removeItem(KEYS.flow); }

// "Sign out of all City Metro services": ends the provider session too (when it offers an end-session endpoint).
// Returns the URL to send the browser to, or null if the provider has none. Local session is cleared either way.
export async function signOutEverywhere(e) {
  const env = withEnv(e), session = getSession(env);
  let url = null;
  try {
    const meta = await discover(env);
    if (meta.end_session_endpoint) {
      const u = new URL(meta.end_session_endpoint);
      if (session && session.idToken) u.searchParams.set('id_token_hint', session.idToken);
      if (env.config.postLogoutRedirectUri) u.searchParams.set('post_logout_redirect_uri', env.config.postLogoutRedirectUri);
      url = u.toString();
    }
  } catch { /* offline or unconfigured: fall back to local sign-out */ }
  signOut(env);
  return url;
}
