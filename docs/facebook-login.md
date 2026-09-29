# Facebook integration in FriendCredit™

Three layers, in increasing order of setup:

## 1. Share buttons (live, zero setup)

The Standings tab has a "Broadcast the verdict" row: **Facebook**, **WhatsApp**,
and the phone's native share sheet. These use Meta's open sharer endpoints
(`facebook.com/sharer`, `wa.me`) — no app, no review, no accounts. Same for
vicinityGo's quest-complete brag row.

Note: Facebook's sharer only shows the **link preview**; the `quote=` text
appears in the composer box but Meta may strip it in some clients. The invite
link always travels with the post.

## 2. Invite links (hub page, zero setup)

The hub has an "Invite your friends" section with WhatsApp / Facebook / copy
links pointing at the hub itself.

## 3. Facebook Login (LIVE — Consumer app "FriendCredit Login")

`src/fbConfig.js` carries `FB_APP_ID = '1590722445287716'` — the Consumer app
**FriendCredit Login** at <https://developers.facebook.com/apps>. Its
Facebook Login product has `https://jonnymexican.github.io/brocredit/` saved
as the Valid OAuth Redirect URI, with Client + Web OAuth login enabled.

- **App type matters.** A **Business**-type app only gets *Facebook Login for
  Business*, which requires `public_profile` at ADVANCED access (App Review +
  business verification) and rejects the dialog with "needs at least one
  supported permission". Pick **Consumer** for classic Facebook Login —
  standard `public_profile` needs no review. (The earlier Business app
  "FriendCredit Bureau", ID 28507890808863883, is parked for this reason.)
- **Development mode:** works for the app owner plus anyone listed under
  App roles → Testers. Flip to Live (needs a privacy policy URL) only when
  strangers should use it.
- **First login per person:** Facebook shows a GDPR consent screen
  ("Continue as …") before issuing the token; it's once per account+app.
- Preview hook: `?fbDemo=1` on any brocredit URL activates the clearly-labeled
  demo profile for the session without touching Facebook.

### What Login gives you (and what it deliberately doesn't)

- ✅ The connected person's **name and avatar** are stored **only on their own
  device** and suggested in the "Add friend" form.
- ❌ **No friends-list import.** Meta's `user_friends` scope only ever returns
  friends who *also authorized this exact app*, and it requires App Review
  with a written justification. It cannot see your real friend list — nobody's
  app can without that review. The friend group is still built by everyone
  typing their own names in, which also keeps the ledger honest (and funny).

### Flow used

OAuth **implicit flow** (`response_type=token`): the login dialog redirects
back with `#access_token=…`, the app fetches `graph.facebook.com/me`
(name + small picture), stores the profile locally, and strips the fragment
from the URL. No server, no code exchange, no secrets in the client.
