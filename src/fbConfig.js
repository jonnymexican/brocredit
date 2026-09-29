// Facebook Login configuration.
//
// Live Meta app: "FriendCredit Bureau" (type: Business), created at
// https://developers.facebook.com/apps. Product: Facebook Login for
// Business — the classic implicit token flow in FacebookConnect.jsx
// (response_type=token) is used against its OAuth settings.
//   - Valid OAuth Redirect URI (saved in the dashboard):
//       https://jonnymexican.github.io/brocredit/
//   - App Mode is Development: only the owner and anyone listed under
//     App roles → Testers can complete the login dialog.
//
// While APP_ID is empty the connector renders nothing, so the app stays
// account-free by default.

export const FB_APP_ID = '28507890808863883';

export const FB_ENABLED = Boolean(FB_APP_ID);

// Preview hook: visiting any brocredit URL with ?fbDemo=1 activates a
// clearly-labeled demo profile for that browser session (sessionStorage),
// so the connect UI can be exercised without a Meta app. Real users never
// see it — the flag is opt-in per session and nothing touches Facebook.
export const FB_DEMO_SESSION_KEY = 'friendcredit:fb-demo-session';

// Where Facebook sends the user back to after the login dialog.
export const FB_REDIRECT_URI = 'https://jonnymexican.github.io/brocredit/';

// Scopes: public_profile gives name + avatar. The friends_list scope only
// ever returns friends who ALSO use this app (Meta policy) — documented in
// docs/facebook-login.md.
export const FB_SCOPES = ['public_profile'];
