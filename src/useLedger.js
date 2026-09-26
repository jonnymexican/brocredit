import { useCallback, useEffect, useRef, useState } from 'react';
import { clampDelta, todayStr } from './ledgerLogic.js';

const GUYS_KEY = 'brocredit:guys';
const TXNS_KEY = 'brocredit:transactions';

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

function makeId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function useLedger() {
  const [guys, setGuys] = useState(() => loadList(GUYS_KEY));
  const [transactions, setTransactions] = useState(() => loadList(TXNS_KEY));
  const undoRef = useRef(null);
  const [undoAvailable, setUndoAvailable] = useState(false);

  useEffect(() => persist(GUYS_KEY, guys), [guys]);
  useEffect(() => persist(TXNS_KEY, transactions), [transactions]);

  const addGuy = useCallback((name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return false;
    setGuys((current) =>
      current.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())
        ? current
        : [...current, { id: makeId(), name: trimmed, createdAt: Date.now() }]
    );
    return true;
  }, []);

  const removeGuy = useCallback((id) => {
    setGuys((current) => current.filter((g) => g.id !== id));
    setTransactions((current) => current.filter((t) => t.guyId !== id));
  }, []);

  const renameGuy = useCallback((id, name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setGuys((current) => current.map((g) => (g.id === id ? { ...g, name: trimmed } : g)));
  }, []);

  /**
   * File a transaction. Returns true when it was recorded. The last filing
   * can be undone (the Bureau is benevolent).
   */
  const fileTransaction = useCallback(({ guyId, categoryId, delta, note, date }) => {
    if (!guyId) return false;
    const isCustom = categoryId === 'custom';
    if (isCustom && !Number.isFinite(Number(delta))) return false;

    const finalDelta = isCustom ? clampDelta(delta) : Number(delta);
    const txn = {
      id: makeId(),
      guyId,
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
  }, []);

  const undoLast = useCallback(() => {
    const id = undoRef.current;
    if (!id) return;
    setTransactions((current) => current.filter((t) => t.id !== id));
    undoRef.current = null;
    setUndoAvailable(false);
  }, []);

  const clearAll = useCallback(() => {
    setGuys([]);
    setTransactions([]);
    undoRef.current = null;
    setUndoAvailable(false);
  }, []);

  return {
    guys,
    transactions,
    addGuy,
    removeGuy,
    renameGuy,
    fileTransaction,
    deleteTransaction,
    undoLast,
    undoAvailable,
    clearAll,
  };
}
