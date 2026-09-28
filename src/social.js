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
