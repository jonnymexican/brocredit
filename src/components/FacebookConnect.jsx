// Facebook Login connector, rendered only when an App ID is configured
// (see fbConfig.js). Implements the OAuth implicit flow by hand — no SDK
// script needed, which keeps the app fast and dependency-free.
//
// What you get: the citizen's display name and avatar are suggested in the
// "Add friend" form (and stored in their own device's localStorage only).
// It does NOT import a friends list — Meta only ever returns friends who
// also authorized this app, and it requires an app review.

import * as React from 'react';
import { FB_APP_ID, FB_ENABLED, FB_REDIRECT_URI, FB_SCOPES } from '../fbConfig.js';

const STORAGE_KEY = 'friendcredit:fb-profile';

export function loadStoredProfile() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed.name === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function storeProfile(profile) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage unavailable — profile just won't persist.
  }
}

export function clearStoredProfile() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

/** Reads the OAuth response Facebook appends to the URL, if any. */
export function readTokenFromUrl() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  if (!accessToken) return null;
  return { accessToken, expiresInMs: Number(params.get('expires_in') || 0) * 1000 };
}

/** Removes the #access_token=... fragment Facebook left behind. */
export function cleanUrlFragment() {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

/**
 * Fetches "me" from the Graph API and returns a small profile, or null.
 * Graph API errors (expired token, offline) resolve to null, never throw.
 */
export async function fetchMe(accessToken) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/me?fields=name,picture.type(small)&access_token=${encodeURIComponent(accessToken)}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !json.name) return null;
    return {
      name: json.name,
      picture: json.picture?.data?.url ?? null,
      id: json.id ?? null,
    };
  } catch {
    return null;
  }
}

export function buildLoginUrl() {
  const params = new URLSearchParams({
    client_id: FB_APP_ID,
    redirect_uri: FB_REDIRECT_URI,
    response_type: 'token',
    scope: FB_SCOPES.join(','),
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export default function FacebookConnect({ onProfile }) {
  if (!FB_ENABLED) return null;

  const [profile, setProfile] = React.useState(() => loadStoredProfile());
  const [connecting, setConnecting] = React.useState(false);

  // Handle a returning redirect: token in URL → fetch profile → store.
  React.useEffect(() => {
    const token = readTokenFromUrl();
    if (!token) return undefined;
    cleanUrlFragment();
    setConnecting(true);
    fetchMe(token.accessToken).then((me) => {
      setConnecting(false);
      if (me) {
        storeProfile(me);
        setProfile(me);
        onProfile?.(me);
      }
    });
    return undefined;
  }, [onProfile]);

  const connect = () => {
    window.location.href = buildLoginUrl();
  };

  const disconnect = () => {
    clearStoredProfile();
    setProfile(null);
    onProfile?.(null);
  };

  if (connecting) {
    return (
      <p className="fb-connect-status" role="status">
        Talking to the Bureau's Facebook liaison…
      </p>
    );
  }

  if (profile) {
    return (
      <div className="fb-connect" aria-label="Facebook connection">
        {profile.picture && (
          <img className="fb-avatar" src={profile.picture} alt="" width="28" height="28" />
        )}
        <span className="fb-name">Linked as {profile.name}</span>
        <button type="button" className="fb-btn" onClick={disconnect}>
          Unlink
        </button>
      </div>
    );
  }

  return (
    <button type="button" className="fb-btn fb-connect-btn" onClick={connect}>
      📘 Connect with Facebook
    </button>
  );
}
