import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildBragText, shareToFacebook, shareToWhatsApp, shareNative, hasNativeShare, APP_URL } from './social';

describe('FriendCredit social sharing', () => {
  let openSpy;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('builds a brag line for the leader', () => {
    const top = { friend: { name: 'Sam' }, score: 725, rank: { emoji: '🏅', title: 'Certified Good Friend' } };
    const text = buildBragText(top);
    expect(text).toContain('👑 Sam');
    expect(text).toContain('725 pts');
    expect(text).toContain('🏅 Certified Good Friend');
  });

  it('opens the Facebook sharer with the encoded brag', () => {
    shareToFacebook('verdict text');
    const url = openSpy.mock.calls[0][0];
    expect(url).toContain('facebook.com/sharer/sharer.php');
    expect(url).toContain(encodeURIComponent(APP_URL));
    expect(url).toContain(encodeURIComponent('verdict text'));
  });

  it('opens WhatsApp with text plus app URL', () => {
    shareToWhatsApp('the bureau has ruled');
    expect(openSpy.mock.calls[0][0]).toContain('https://wa.me/?text=');
  });

  it('detects native share support honestly', () => {
    expect(hasNativeShare()).toBe(typeof navigator.share === 'function');
  });

  it('shareNative returns false and does not throw when unsupported', async () => {
    const result = await shareNative({ title: 't', text: 'x' });
    expect(result).toBe(false);
  });
});
