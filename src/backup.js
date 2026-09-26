// Backup/restore for the Bureau's records. All apps on this GitHub Pages
// origin share one localStorage bucket, so a "clear site data" anywhere
// wipes everything — this JSON backup is the safety net.

const KEYS = ['friendcredit:friends', 'friendcredit:transactions'];

export function exportBackup() {
  const data = {};
  for (const key of KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      data[key] = raw == null ? [] : JSON.parse(raw);
    } catch {
      data[key] = []; // corrupt entry — back up as empty rather than fail
    }
  }
  return {
    app: 'friendcredit',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function downloadBackup() {
  const blob = new Blob([JSON.stringify(exportBackup(), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `friendcredit-records-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Not a FriendCredit backup file');
  }
  if (
    !parsed ||
    parsed.app !== 'friendcredit' ||
    typeof parsed.data !== 'object' ||
    parsed.data === null
  ) {
    throw new Error('Not a FriendCredit backup file');
  }
  return parsed.data;
}

/**
 * Restores friends and transactions. Returns counts written. Only trusts
 * values that are arrays — anything else is left untouched.
 */
export function applyBackup(data) {
  let applied = 0;
  for (const key of KEYS) {
    const value = data[key];
    if (!Array.isArray(value)) continue;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      applied += 1;
    } catch {
      // Storage unavailable — skip this section.
    }
  }
  return applied;
}
