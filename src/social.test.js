import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildBragText,
  shareToFacebook,
  shareToWhatsApp,
  shareNative,
  hasNativeShare,
  buildVaultInviteText,
  copyVaultInvite,
  shareVaultInviteToWhatsApp,
  APP_URL,
} from './social';

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

describe('vault invite sharing', () => {
  let openSpy;
  let writeSpy;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    writeSpy = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeSpy }, configurable: true });
  });

  afterEach(() => {
    openSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('builds an invite line that carries the bureau code', () => {
    const text = buildVaultInviteText('BLUE-HERON-77');
    expect(text).toContain('BLUE-HERON-77');
    expect(text).toContain('Bureau of Friend Conduct');
  });

  it('copies invite text plus the app link and reports success', async () => {
    writeSpy.mockResolvedValue();
    const ok = await copyVaultInvite('BLUE-HERON-77');
    expect(ok).toBe(true);
    const written = writeSpy.mock.calls[0][0];
    expect(written).toContain('BLUE-HERON-77');
    expect(written).toContain(APP_URL);
  });

  it('returns false instead of throwing when the clipboard is unavailable', async () => {
    writeSpy.mockRejectedValue(new Error('denied'));
    const ok = await copyVaultInvite('BLUE-HERON-77');
    expect(ok).toBe(false);
  });

  it('opens WhatsApp with the encoded invite and code', () => {
    shareVaultInviteToWhatsApp('BLUE-HERON-77');
    const url = openSpy.mock.calls[0][0];
    expect(url).toContain('https://wa.me/?text=');
    expect(url).toContain(encodeURIComponent('BLUE-HERON-77'));
    expect(url).toContain(encodeURIComponent(APP_URL));
  });
});
