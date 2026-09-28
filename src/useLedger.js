import { useCallback, useEffect, useRef, useState } from 'react';
import { clampDelta, todayStr } from './ledgerLogic.js';

const FRIENDS_KEY = 'friendcredit:friends';
const TXNS_KEY = 'friendcredit:transactions';

// One-time migration from the pre-rename storage keys.
const LEGACY_FRIENDS_KEY = 'brocredit:guys';
const LEGACY_TXNS_KEY = 'brocredit:transactions';

function loadList(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable — state stays in memory
  }
}

/** Rename guyId/personId → friendId in legacy transactions, if any. */
function migrateTransactions(txns) {
  return txns.map((t) => {
    if (Object.prototype.hasOwnProperty.call(t, 'friendId')) return t;
    const { guyId, personId, ...rest } = t;
    return { ...rest, friendId: personId ?? guyId };
  });
}

function migrateStorage() {
  try {
    if (
      !window.localStorage.getItem(FRIENDS_KEY) &&
      window.localStorage.getItem(LEGACY_FRIENDS_KEY)
    ) {
      window.localStorage.setItem(FRIENDS_KEY, window.localStorage.getItem(LEGACY_FRIENDS_KEY));
      window.localStorage.removeItem(LEGACY_FRIENDS_KEY);
    }
    if (
      !window.localStorage.getItem(TXNS_KEY) &&
      window.localStorage.getItem(LEGACY_TXNS_KEY)
    ) {
      const legacy = loadList(LEGACY_TXNS_KEY);
      window.localStorage.setItem(TXNS_KEY, JSON.stringify(migrateTransactions(legacy)));
      window.localStorage.removeItem(LEGACY_TXNS_KEY);
    }
  } catch {
    // migration is best-effort
  }
}

function makeId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function useLedger() {
  migrateStorage();

  const [friends, setFriends] = useState(() => loadList(FRIENDS_KEY));
  const friendsRef = useRef(friends);
  useEffect(() => {
    friendsRef.current = friends;
  }, [friends]);
  const [transactions, setTransactions] = useState(() =>
    migrateTransactions(loadList(TXNS_KEY))
  );
  const undoRef = useRef(null);
  const [undoAvailable, setUndoAvailable] = useState(false);

  useEffect(() => persist(FRIENDS_KEY, friends), [friends]);
  useEffect(() => persist(TXNS_KEY, transactions), [transactions]);

  /**
   * Returns false when the name is blank or already taken (so callers can
   * show an inline error), true when a citizen was registered.
   */
  const addFriend = useCallback((name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return false;
    if (friendsRef.current.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }
    setFriends((current) =>
      current.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())
        ? current
        : [...current, { id: makeId(), name: trimmed, createdAt: Date.now() }]
    );
    return true;
  }, []);

  const removeFriend = useCallback((id) => {
    setFriends((current) => current.filter((f) => f.id !== id));
    setTransactions((current) => current.filter((t) => t.friendId !== id));
  }, []);

  const renameFriend = useCallback((id, name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setFriends((current) => current.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
  }, []);

  /**
   * File a transaction. Returns true when it was recorded. The last filing
   * can be undone (the Bureau is benevolent).
   */
  const fileTransaction = useCallback(({ friendId, categoryId, delta, note, date }) => {
    if (!friendId) return false;
    const isCustom = categoryId === 'custom';
    if (isCustom && !Number.isFinite(Number(delta))) return false;

    const finalDelta = isCustom ? clampDelta(delta) : Number(delta);
    const txn = {
      id: makeId(),
      friendId,
      categoryId,
      delta: finalDelta,
      note: (note || '').trim() || null,
      date: date || todayStr(),
      createdAt: Date.now(),
    };
    setTransactions((current) => [...current, txn]);
    undoRef.current = txn.id;
    setUndoAvailable(true);
    return true;
  }, []);

  const deleteTransaction = useCallback((id) => {
    setTransactions((current) => current.filter((t) => t.id !== id));
    // If the deleted filing is the pending undo target, retire the undo
    // button instead of leaving it as a silent no-op.
    if (undoRef.current === id) {
      undoRef.current = null;
      setUndoAvailable(false);
    }
  }, []);

  const undoLast = useCallback(() => {
    const id = undoRef.current;
    if (!id) return;
    setTransactions((current) => current.filter((t) => t.id !== id));
    undoRef.current = null;
    setUndoAvailable(false);
  }, []);

  const clearAll = useCallback(() => {
    setFriends([]);
    setTransactions([]);
    undoRef.current = null;
    setUndoAvailable(false);
  }, []);

  return {
    friends,
    transactions,
    addFriend,
    removeFriend,
    renameFriend,
    fileTransaction,
    deleteTransaction,
    undoLast,
    undoAvailable,
    clearAll,
  };
}
