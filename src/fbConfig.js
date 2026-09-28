// Facebook Login configuration.
//
// To enable the "Connect with Facebook" button in FriendCredit:
//   1. Create an app at https://developers.facebook.com/apps (type: Business)
//   2. Add the "Facebook Login for Web" product
//   3. In Settings → Basic, copy the App ID and paste it below
//   4. Under Facebook Login settings, add
//      https://jonnymexican.github.io to "Valid OAuth Redirect URIs"
//   5. Deploy — the button appears automatically once an ID is present.
//
// While APP_ID is empty the connector renders nothing, so the app stays
// account-free by default.

export const FB_APP_ID = '';

export const FB_ENABLED = Boolean(FB_APP_ID);

// Where Facebook sends the user back to after the login dialog.
export const FB_REDIRECT_URI = 'https://jonnymexican.github.io/brocredit/';

// Scopes: public_profile gives name + avatar. The friends_list scope only
// ever returns friends who ALSO use this app (Meta policy) — documented in
// docs/facebook-login.md.
export const FB_SCOPES = ['public_profile'];
