// Brag about the standings. Open sharer endpoints only — no SDK, no accounts.

export const APP_URL = 'https://jonnymexican.github.io/brocredit/';

export function buildBragText(top) {
  return `👑 ${top.friend.name} leads our Bureau of Friend Conduct with ${top.score} pts — ${top.rank.emoji} ${top.rank.title}. File your grievances here:`;
}

export function openSharePopup(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function shareToFacebook(text, url = APP_URL) {
  openSharePopup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`);
}

export function shareToWhatsApp(text) {
  openSharePopup(`https://wa.me/?text=${encodeURIComponent(`${text} ${APP_URL}`)}`);
}

export async function shareNative({ title, text }) {
  if (typeof navigator.share !== 'function') return false;
  try {
    await navigator.share({ title, text, url: APP_URL });
    return true;
  } catch {
    return false;
  }
}

export function hasNativeShare() {
  return typeof navigator.share === 'function';
}

// ---------- vault invites ----------

/** Invite blurb for a shared-vault bureau code (the code IS the credential). */
export function buildVaultInviteText(code) {
  return `🎖️ You're invited to our Bureau of Friend Conduct. Join the shared vault with bureau code ${code}`;
}

/** Copies "invite text + app link"; returns false when the clipboard is unavailable. */
export async function copyVaultInvite(code) {
  try {
    await navigator.clipboard.writeText(`${buildVaultInviteText(code)} — ${APP_URL}`);
    return true;
  } catch {
    return false;
  }
}

export function shareVaultInviteToWhatsApp(code) {
  openSharePopup(`https://wa.me/?text=${encodeURIComponent(`${buildVaultInviteText(code)} — ${APP_URL}`)}`);
}
