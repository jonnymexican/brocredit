import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  mergeStates,
  saveVaultSettings,
  loadVaultSettings,
  clearVaultSettings,
  vaultFetch,
  vaultPush,
  syncVault,
  pushMutation,
  VaultError,
} from './bureauVault.js';

const friend = (id, name = 'Sam', createdAt = 1000) => ({ id, name, createdAt });
const txn = (id, friendId = 'f1', createdAt = 1000) => ({
  id,
  friendId,
  categoryId: 'moved',
  delta: 20,
  createdAt,
});

describe('mergeStates', () => {
  it('unions disjoint friends and transactions', () => {
    const local = { friends: [friend('f1')], transactions: [txn('t1')] };
    const remote = { friends: [friend('f2', 'emily')], transactions: [txn('t2', 'f2')] };
    const { state, changed } = mergeStates(local, remote);
    expect(state.friends.map((f) => f.id).sort()).toEqual(['f1', 'f2']);
    expect(state.transactions.map((t) => t.id).sort()).toEqual(['t1', 't2']);
    expect(changed).toBe(true);
  });

  it('keeps the newest copy when both sides hold the same id', () => {
    const local = { friends: [friend('f1', 'Sam Renamed', 2000)], transactions: [] };
    const remote = { friends: [friend('f1', 'Sam', 1000)], transactions: [] };
    const { state } = mergeStates(local, remote);
    expect(state.friends[0].name).toBe('Sam Renamed');
  });

  it('reports changed=false when remote already covers local', () => {
    const remote = { friends: [friend('f1'), friend('f2')], transactions: [txn('t1')] };
    const local = { friends: [friend('f1')], transactions: [txn('t1')] };
    const { state, changed } = mergeStates(local, remote);
    expect(changed).toBe(false);
    expect(state.friends.length).toBe(2);
  });

  it('tombstones kill older live items and propagate', () => {
    const local = { friends: [friend('f1', 'Sam', 1000)], transactions: [], tombstones: [{ id: 'f1', deletedAt: 5000 }] };
    const remote = { friends: [friend('f1', 'Sam', 1000)], transactions: [], tombstones: [] };
    const { state } = mergeStates(local, remote);
    expect(state.friends.length).toBe(0);
    expect(state.tombstones.map((t) => t.id)).toEqual(['f1']);
    // A newer edit than the tombstone survives it.
    const revived = mergeStates(
      { friends: [friend('f1', 'Sam Reborn', 9000)], transactions: [], tombstones: [] },
      { friends: [], transactions: [], tombstones: [{ id: 'f1', deletedAt: 5000 }] }
    );
    expect(revived.state.friends.length).toBe(1);
  });

  it('tolerates missing lists', () => {
    const { state, changed } = mergeStates(
      { friends: [friend('f1')], transactions: [] },
      {}
    );
    expect(state.friends.length).toBe(1);
    expect(changed).toBe(true);
  });
});

describe('vault settings storage', () => {
  beforeEach(() => window.localStorage.clear());

  it('round-trips normalized settings', () => {
    const saved = saveVaultSettings({ url: 'https://vault.example.workers.dev/', code: ' bureau-42 ' });
    expect(saved).toEqual({ url: 'https://vault.example.workers.dev', code: 'bureau-42' });
    expect(loadVaultSettings()).toEqual(saved);
    clearVaultSettings();
    expect(loadVaultSettings()).toBe(null);
  });

  it('rejects junk urls and codes', () => {
    expect(() => saveVaultSettings({ url: 'http://insecure', code: 'bureau-42' })).toThrow(VaultError);
    expect(() => saveVaultSettings({ url: 'https://ok', code: 'no' })).toThrow(VaultError);
  });
});

describe('vault API plumbing', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('vaultFetch sends the code header and returns the state', async () => {
    const stub = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ v: 3, friends: [], transactions: [] }) })
    );
    vi.stubGlobal('fetch', stub);
    const res = await vaultFetch('https://v.example', 'bureau-42');
    expect(res.v).toBe(3);
    const [url, opts] = stub.mock.calls[0];
    expect(url).toBe('https://v.example/bureau/bureau-42');
    expect(opts.headers['x-vault-code']).toBe('bureau-42');
  });

  it('maps error statuses to VaultError codes', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false, status: 409, json: () => Promise.resolve({ error: 'conflict', remoteV: 7 }) })
    ));
    await expect(vaultPush('https://v.example', 'c', 5, { friends: [], transactions: [] })).rejects.toMatchObject({
      code: 'conflict',
      remoteV: 7,
    });
  });

  it('syncVault merges, pushes, and reports the new version', async () => {
    const remote = { v: 4, friends: [friend('f1')], transactions: [] };
    const pushes = [];
    vi.stubGlobal('fetch', vi.fn((url, opts) => {
      if (opts.method === 'GET') return Promise.resolve({ ok: true, json: () => Promise.resolve(remote) });
      pushes.push(JSON.parse(opts.body));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, v: 5 }) });
    }));
    const local = { friends: [friend('f2', 'emily')], transactions: [] };
    let stored = local;
    const res = await syncVault('https://v.example', 'c', () => local, (s) => { stored = s; });
    expect(res).toEqual({ ok: true, v: 5, merged: true });
    expect(stored.friends.map((f) => f.id).sort()).toEqual(['f1', 'f2']);
    expect(pushes[0].expectedV).toBe(4);
  });

  it('pushMutation retries with a merge after a conflict', async () => {
    let calls = 0;
    const remote = { v: 9, friends: [friend('f1')], transactions: [txn('t1')] };
    vi.stubGlobal('fetch', vi.fn((url, opts) => {
      if (opts.method === 'GET') return Promise.resolve({ ok: true, json: () => Promise.resolve(remote) });
      calls += 1;
      if (calls === 1) {
        return Promise.resolve({ ok: false, status: 409, json: () => Promise.resolve({ error: 'conflict', remoteV: 9 }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, v: 10 }) });
    }));
    const local = { friends: [friend('f3', 'newcomer')], transactions: [] };
    let stored = local;
    const res = await pushMutation('https://v.example', 'c', 8, () => local, (s) => { stored = s; });
    expect(res.v).toBe(10);
    expect(res.conflicted).toBe(true);
    expect(stored.friends.map((f) => f.id).sort()).toEqual(['f1', 'f3']);
  });
});
