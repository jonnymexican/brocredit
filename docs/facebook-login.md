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

## 3. Facebook Login (needs a Meta app ID — currently OFF)

`src/fbConfig.js` has `FB_APP_ID = ''`, so the connector renders nothing.
To turn it on:

1. Create an app at <https://developers.facebook.com/apps> — type **Business**
   (Consumer works too; Business skips some review friction).
2. Add the **Facebook Login for Web** product.
3. Settings → Basic → copy the **App ID** into `FB_APP_ID` in
   `brocredit/src/fbConfig.js`, commit, push.
4. Facebook Login → Settings → add `https://jonnymexican.github.io/brocredit/`
   to **Valid OAuth Redirect URIs**.
5. Leave the app in **Development mode** — development mode works fine for
   anyone listed as a **Tester/Developer/Admin** in the app's Roles. Put the
   app live (requires a privacy policy URL) only if you want strangers to use
   it too.

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
