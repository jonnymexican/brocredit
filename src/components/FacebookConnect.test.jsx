import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FacebookConnect, {
  loadStoredProfile,
  storeProfile,
  clearStoredProfile,
  readTokenFromUrl,
  fetchMe,
  buildLoginUrl,
} from './FacebookConnect.jsx';
import { FB_APP_ID, FB_ENABLED, FB_SCOPES, FB_REDIRECT_URI } from '../fbConfig.js';

describe('FacebookConnect gating', () => {
  it('renders nothing while no App ID is configured', () => {
    expect(FB_APP_ID).toBe('');
    expect(FB_ENABLED).toBe(false);
    const { container } = render(<FacebookConnect />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('profile storage helpers', () => {
  it('round-trips and clears a stored profile', () => {
    clearStoredProfile();
    expect(loadStoredProfile()).toBe(null);
    storeProfile({ name: 'Jon', picture: 'http://x/y.png', id: '1' });
    expect(loadStoredProfile().name).toBe('Jon');
    clearStoredProfile();
    expect(loadStoredProfile()).toBe(null);
  });

  it('treats corrupt storage as no profile', () => {
    window.localStorage.setItem('friendcredit:fb-profile', '{oops');
    expect(loadStoredProfile()).toBe(null);
    window.localStorage.removeItem('friendcredit:fb-profile');
  });
});

describe('OAuth plumbing', () => {
  it('reads a token from the URL fragment', () => {
    window.location.hash = '#access_token=abc123&expires_in=86400';
    const token = readTokenFromUrl();
    expect(token).toEqual({ accessToken: 'abc123', expiresInMs: 86400000 });
    window.location.hash = '';
  });

  it('returns null without a fragment token', () => {
    window.location.hash = '';
    expect(readTokenFromUrl()).toBe(null);
  });

  it('builds the login URL from config', () => {
    const url = buildLoginUrl();
    expect(url).toContain('facebook.com/v19.0/dialog/oauth');
    expect(url).toContain(`client_id=${FB_APP_ID}`);
    expect(url).toContain(encodeURIComponent(FB_REDIRECT_URI));
    expect(url).toContain(encodeURIComponent(FB_SCOPES.join(',')));
  });

  it('fetchMe resolves null on network failure instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    await expect(fetchMe('token')).resolves.toBe(null);
    vi.unstubAllGlobals();
  });

  it('fetchMe maps the Graph API response to a small profile', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: '9', name: 'Jon', picture: { data: { url: 'pic.png' } } }),
      })
    ));
    await expect(fetchMe('token')).resolves.toEqual({ id: '9', name: 'Jon', picture: 'pic.png' });
    vi.unstubAllGlobals();
  });
});
