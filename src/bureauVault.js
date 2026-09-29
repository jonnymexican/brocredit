// Client for the bureau-vault Worker (see bureau-vault/ in the main repo).
//
// A "shared vault" is one bureau code pointing at a deployed vault Worker.
// Sync model: the whole ledger state is pushed with a version number; the
// Worker rejects the push when someone else bumped the version first, and we
// merge + retry. Merge is by-id union with a newest-wins rule, so two people
// filing different offenses always converge.

const SETTINGS_KEY = 'friendcredit:vault-settings';

export class VaultError extends Error {
  constructor(code, extra = {}) {
    super(`vault:${code}`);
    this.name = 'VaultError';
    this.code = code; // network | unauthorized | unknown_bureau | conflict | bad_response
    Object.assign(this, extra);
  }
}

// ---------- settings (which vault are we joined to?) ----------

export function loadVaultSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.url !== 'string' || typeof parsed.code !== 'string') return null;
    return { url: normalizeVaultUrl(parsed.url), code: parsed.code };
  } catch {
    return null;
  }
}

export function saveVaultSettings(settings) {
  const url = normalizeVaultUrl(settings.url);
  const code = (settings.code || '').trim();
  if (!/^https:\/\/.+/.test(url)) throw new VaultError('bad_url');
  if (!/^[A-Za-z0-9-]{4,40}$/.test(code)) throw new VaultError('bad_code');
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ url, code }));
  return { url, code };
}

export function clearVaultSettings() {
  try {
    window.localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // ignore
  }
}

function normalizeVaultUrl(url) {
  return (url || '').trim().replace(/\/+$/, '');
}

// ---------- merge (pure, unit-tested) ----------

/**
 * Merges two ledger states { friends, transactions, tombstones }.
 * - Live items: union by id, newest (updatedAt ?? createdAt) wins.
 * - Tombstones: union by id, newest deletedAt wins; a tombstone kills any
 *   live item it is at least as new as, so deletions propagate.
 * Returns { state, changed } — changed=true when local holds anything the
 * merged result did not already have (i.e. there is something to push).
 */
export function mergeStates(local, remote) {
  const itemTime = (x) => Number(x.updatedAt ?? x.createdAt ?? 0);
  const pickNewer = (a, b) => (itemTime(b) > itemTime(a) ? b : a);

  const union = (localList, remoteList) => {
    const byId = new Map();
    for (const item of localList || []) byId.set(item.id, item);
    for (const item of remoteList || []) {
      byId.set(item.id, byId.has(item.id) ? pickNewer(byId.get(item.id), item) : item);
    }
    return byId;
  };

  const friends = union(local.friends, remote.friends);
  const transactions = union(local.transactions, remote.transactions);
  const tombstones = union(local.tombstones, remote.tombstones);

  // Apply tombstones: drop live items the newest tombstone covers.
  for (const [id, tb] of tombstones) {
    const tTime = Number(tb.deletedAt || 0);
    for (const list of [friends, transactions]) {
      const item = list.get(id);
      if (item && itemTime(item) <= tTime) list.delete(id);
    }
  }

  // "changed" means the merged result holds something the REMOTE lacks or
  // holds newer than the remote copy — i.e. there is a reason to push back.
  const remoteById = new Map();
  for (const x of remote.friends || []) remoteById.set(x.id, x);
  for (const x of remote.transactions || []) remoteById.set(x.id, x);
  for (const x of remote.tombstones || []) remoteById.set(x.id, x);
  const mergedById = new Map();
  for (const [id, x] of friends) mergedById.set(id, x);
  for (const [id, x] of transactions) mergedById.set(id, x);
  for (const [id, x] of tombstones) mergedById.set(id, x);

  let changed = false;
  for (const [id, mergedItem] of mergedById) {
    const remoteItem = remoteById.get(id);
    if (!remoteItem || itemTime(mergedItem) > itemTime(remoteItem)) {
      changed = true;
      break;
    }
  }

  return {
    state: {
      friends: [...friends.values()],
      transactions: [...transactions.values()],
      tombstones: [...tombstones.values()],
    },
    changed,
  };
}

// ---------- API ----------

async function call(url, path, options) {
  let res;
  try {
    res = await fetch(url + path, options);
  } catch {
    throw new VaultError('network');
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    throw new VaultError('bad_response');
  }
  if (!res.ok) {
    const code =
      res.status === 401
        ? 'unauthorized'
        : res.status === 404
          ? 'unknown_bureau'
          : res.status === 409
            ? 'conflict'
            : 'bad_response';
    throw new VaultError(code, { status: res.status, remoteV: body?.remoteV });
  }
  return body;
}

/** Fetch the remote bureau state. Throws VaultError on network/auth problems. */
export function vaultFetch(url, code) {
  return call(url, `/bureau/${code}`, {
    method: 'GET',
    headers: { 'x-vault-code': code },
  });
}

/**
 * Push local state. expectedV is the version we last saw from the server.
 * Returns { v } of the new version. Throws VaultError('conflict') when the
 * remote moved — caller should fetch, merge, and retry.
 */
export function vaultPush(url, code, expectedV, state) {
  return call(url, `/bureau/${code}`, {
    method: 'PUT',
    headers: { 'x-vault-code': code, 'content-type': 'application/json' },
    body: JSON.stringify({ expectedV, state }),
  });
}

/**
 * Fetch → merge into local → push (retrying once on conflict).
 * `getLocal` and `setLocal` integrate with the React ledger.
 * Returns a status string for the UI.
 */
export async function syncVault(url, code, getLocal, setLocal) {
  const remote = await vaultFetch(url, code);
  const local = getLocal();
  const { state, changed } = mergeStates(local, remote);
  let base = remote;
  if (changed) {
    // Prefer the merged (superset) state on both sides.
    setLocal(state);
  } else {
    // Remote covers local — adopt remote wholesale (same data, fresher meta).
    setLocal(state);
  }
  const expectedV = base.v ?? 1;
  try {
    const pushed = await vaultPush(url, code, expectedV, state);
    return { ok: true, v: pushed.v, merged: changed };
  } catch (err) {
    if (err.code !== 'conflict') throw err;
    // Someone pushed between our fetch and our push: merge again and retry once.
    const remote2 = await vaultFetch(url, code);
    const merged2 = mergeStates(state, remote2.state ?? remote2);
    const state2 = merged2.state;
    setLocal(state2);
    const pushed2 = await vaultPush(url, code, remote2.v ?? 1, state2);
    return { ok: true, v: pushed2.v, merged: true, conflicted: true };
  }
}

/**
 * Push after a local mutation. Optimistic: uses lastKnownV, and on conflict
 * pulls, merges, and pushes the superset so the user's change survives.
 */
export async function pushMutation(url, code, lastKnownV, getLocal, setLocal) {
  const local = getLocal();
  try {
    const pushed = await vaultPush(url, code, lastKnownV, local);
    return { ok: true, v: pushed.v };
  } catch (err) {
    if (err.code !== 'conflict') throw err;
    const remote = await vaultFetch(url, code);
    const { state } = mergeStates(local, remote);
    setLocal(state);
    const pushed = await vaultPush(url, code, remote.v ?? 1, state);
    return { ok: true, v: pushed.v, conflicted: true };
  }
}
