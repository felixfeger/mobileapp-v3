// ─────────────────────────────────────────────────────────────────────────────
//  City Metro Trip-Planner — configuration
//  Everything that has to be supplied before real sign-in works lives here.
//  Nothing in this file is a secret: this app is a *public* OAuth client (PKCE), so there is no client secret.
// ─────────────────────────────────────────────────────────────────────────────

export const AUTH = {
  // The sign-in service. This origin is fixed; the application slug is NOT known yet.
  origin: 'https://auth.citymetro.xyz',

  // REQUIRED — the OpenID Connect issuer of the Authentik application created for this app, with trailing slash:
  //   https://auth.citymetro.xyz/application/o/<APPLICATION_SLUG>/
  // Leave empty until the application exists. (Not guessed on purpose.)
  issuer: '',

  // REQUIRED — the Client ID of that application (a public client; no secret is ever used or stored here).
  clientId: '',

  // Optional — where the provider sends people back after sign-in. Empty = "<this site>/callback.html".
  // Whatever it resolves to must be registered as a redirect URI on the provider (the Account/Sign-in screens show it).
  redirectUri: '',

  // Optional — where the provider sends people after "Sign out of all City Metro services". Must be registered too.
  postLogoutRedirectUri: '',

  scopes: 'openid profile email'
};

// Links for the menu. Empty string = not configured yet (the menu shows the item as unavailable).
// URLs are intentionally NOT filled in: supply the real ones.
export const LINKS = {
  website: '',          // City Metro website
  transitPolice: '',    // City Metro Transit Police website
  support: '',          // Support
  accountSettings: ''   // Optional: transit-account settings page. Empty = "<AUTH.origin>/if/user/" (Authentik's own user settings)
};
