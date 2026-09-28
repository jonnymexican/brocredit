// Facebook Login connector, rendered only when an App ID is configured
// (see fbConfig.js) or when the ?fbDemo=1 preview hook is active. The real
// flow implements the OAuth implicit flow by hand — no SDK script needed.
//
// What you get: the citizen's display name and avatar are suggested in the
// "Add friend" form (and stored in their own device's localStorage only).
// It does NOT import a friends list — Meta only ever returns friends who
// also authorized this app, and it requires an app review.
//
// Demo mode (?fbDemo=1): activates for the browser session only, shows a
// DEMO-tagged profile, and never contacts Facebook. It exists so the hook
// can be previewed before a Meta app exists.

import * as React from 'react';
import { FB_APP_ID, FB_ENABLED, FB_REDIRECT_URI, FB_SCOPES, FB_DEMO_SESSION_KEY } from '../fbConfig.js';

const STORAGE_KEY = 'friendcredit:fb-profile';

export function isDemoSession() {
  try {
    if (new URLSearchParams(window.location.search).get('fbDemo') === '1') {
      window.sessionStorage.setItem(FB_DEMO_SESSION_KEY, '1');
      return true;
    }
    return window.sessionStorage.getItem(FB_DEMO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function exitDemoSession() {
  try {
    window.sessionStorage.removeItem(FB_DEMO_SESSION_KEY);
  } catch {
    // Ignore.
  }
}

const DEMO_PROFILE = { demo: true, name: 'Demo Citizen', picture: null, id: 'demo-1' };

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
  const demo = isDemoSession();
  if (!FB_ENABLED && !demo) return null;

  const [profile, setProfile] = React.useState(() => loadStoredProfile());
  const [connecting, setConnecting] = React.useState(false);

  // Handle a returning redirect: token in URL → fetch profile → store.
  React.useEffect(() => {
    if (!FB_ENABLED || demo) return;
    const token = readTokenFromUrl();
    if (!token) return;
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
  }, [onProfile, demo]);

  const connect = () => {
    if (demo) {
      // Demo: skip Facebook entirely, install the tagged demo profile.
      storeProfile(DEMO_PROFILE);
      setProfile(DEMO_PROFILE);
      onProfile?.(DEMO_PROFILE);
      return;
    }
    window.location.href = buildLoginUrl();
  };

  const disconnect = () => {
    // Unlink removes the profile only; the demo session itself is per-tab
    // and follows the ?fbDemo=1 flag, so it survives unlinking.
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
        <span className="fb-name">
          {profile.demo && <strong className="fb-demo-tag">DEMO — </strong>}
          Linked as {profile.name}
        </span>
        <button type="button" className="fb-btn" onClick={disconnect}>
          Unlink
        </button>
      </div>
    );
  }

  return (
    <button type="button" className="fb-btn fb-connect-btn" onClick={connect}>
      {demo ? '📘 Connect with Facebook (demo)' : '📘 Connect with Facebook'}
    </button>
  );
}
