// Facebook Login configuration.
//
// Live Meta app: "FriendCredit Login" (type: Consumer), App ID
// 1590722445287716, product Facebook Login (classic), with
//   - Valid OAuth Redirect URI: https://jonnymexican.github.io/brocredit/
//   - Client OAuth login + Web OAuth login: Yes
//   - App Mode: Development (owner + App roles → Testers only; flip to
//     Live in the dashboard to open it to everyone).
// The classic implicit token flow in FacebookConnect.jsx
// (response_type=token) talks to this app; standard public_profile
// access needs no App Review.
//
// Note: an earlier app "FriendCredit Bureau" (Business type, ID
// 28507890808863883) is parked — Business apps only offer "Facebook
// Login for Business", which requires public_profile at ADVANCED
// access (App Review + business verification) and rejects the login
// dialog with "needs at least one supported permission".
//
// While APP_ID is empty the connector renders nothing, so the app stays
// account-free by default.

export const FB_APP_ID = '1590722445287716';

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
