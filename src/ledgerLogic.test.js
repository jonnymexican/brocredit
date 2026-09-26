import { describe, it, expect } from 'vitest';
import {
  BASE_SCORE,
  MIN_SCORE,
  MAX_SCORE,
  CREDIT_CATEGORIES,
  CUSTOM_CATEGORY_ID,
  RANKS,
  clampScore,
  clampDelta,
  scoreToRank,
  computeScores,
  computeStats,
  todayStr,
} from './ledgerLogic.js';

function guy(overrides = {}) {
  return { id: overrides.id || Math.random().toString(16).slice(2), name: 'Dave', ...overrides };
}

function txn(overrides = {}) {
  return {
    id: Math.random().toString(16).slice(2),
    guyId: 'g1',
    categoryId: 'snacks',
    delta: 5,
    note: null,
    date: todayStr(),
    createdAt: 1,
    ...overrides,
  };
}

describe('clamping', () => {
  it('clamps scores to the official range', () => {
    expect(clampScore(1200)).toBe(MAX_SCORE);
    expect(clampScore(-50)).toBe(MIN_SCORE);
    expect(clampScore(BASE_SCORE)).toBe(BASE_SCORE);
  });

  it('clamps custom deltas to ±100 and rounds them', () => {
    expect(clampDelta(250)).toBe(100);
    expect(clampDelta(-250)).toBe(-100);
    expect(clampDelta(12.6)).toBe(13);
    expect(clampDelta('abc')).toBe(0);
  });
});

describe('rank tiers', () => {
  it('maps scores to the correct tier', () => {
    expect(scoreToRank(850).id).toBe('legend');
    expect(scoreToRank(800).id).toBe('legend');
    expect(scoreToRank(799).id).toBe('good-guy');
    expect(scoreToRank(700).id).toBe('solid');
    expect(scoreToRank(600).id).toBe('flake');
    expect(scoreToRank(300).id).toBe('pariah');
  });

  it('covers the entire score range with no gaps', () => {
    for (let s = MIN_SCORE; s <= MAX_SCORE; s++) {
      expect(scoreToRank(s)).toBeDefined();
      expect(scoreToRank(s).title.length).toBeGreaterThan(0);
    }
  });

  it('clamps out-of-range scores before mapping', () => {
    expect(scoreToRank(9999).id).toBe('legend');
    expect(scoreToRank(-9999).id).toBe('pariah');
  });
});

describe('category catalog', () => {
  it('has a unique custom wildcard with a null delta', () => {
    const customs = CREDIT_CATEGORIES.filter((c) => c.id === CUSTOM_CATEGORY_ID);
    expect(customs).toHaveLength(1);
    expect(customs[0].delta).toBeNull();
  });

  it('has unique ids and nonzero preset deltas', () => {
    const ids = new Set(CREDIT_CATEGORIES.map((c) => c.id));
    expect(ids.size).toBe(CREDIT_CATEGORIES.length);
    for (const c of CREDIT_CATEGORIES) {
      if (c.id !== CUSTOM_CATEGORY_ID) {
        expect(c.delta).not.toBe(0);
        expect(Number.isInteger(c.delta)).toBe(true);
      }
    }
  });
});

describe('computeScores', () => {
  it('starts everyone at the base score', () => {
    const rows = computeScores([guy({ id: 'g1', name: 'Dave' }), guy({ id: 'g2', name: 'Mike' })], []);
    expect(rows.map((r) => r.score)).toEqual([BASE_SCORE, BASE_SCORE]);
    expect(rows[0].rank.id).toBe('solid');
  });

  it('sums deltas and clamps the total', () => {
    const txns = [
      txn({ guyId: 'g1', delta: 20 }),
      txn({ guyId: 'g1', delta: -50 }),
      txn({ guyId: 'g1', delta: 15 }),
    ];
    const [row] = computeScores([guy({ id: 'g1' })], txns);
    expect(row.net).toBe(-15);
    expect(row.score).toBe(BASE_SCORE - 15);
  });

  it('honors the floor when penalties bury a guy', () => {
    const txns = [txn({ guyId: 'g1', delta: -500 })];
    const [row] = computeScores([guy({ id: 'g1' })], txns);
    expect(row.score).toBe(MIN_SCORE);
    expect(row.rank.id).toBe('pariah');
  });

  it('honors the ceiling when a guy ascends', () => {
    const txns = [txn({ guyId: 'g1', delta: 500 })];
    const [row] = computeScores([guy({ id: 'g1' })], txns);
    expect(row.score).toBe(MAX_SCORE);
    expect(row.rank.id).toBe('legend');
  });

  it('sorts by score descending, ties alphabetical', () => {
    const guys = [guy({ id: 'z', name: 'Zack' }), guy({ id: 'a', name: 'Adam' }), guy({ id: 'm', name: 'Mike' })];
    const txns = [txn({ guyId: 'z', delta: 30 }), txn({ guyId: 'a', delta: 30 })];
    const rows = computeScores(guys, txns);
    expect(rows.map((r) => r.guy.name)).toEqual(['Adam', 'Zack', 'Mike']);
  });

  it('counts awards and penalties per guy', () => {
    const txns = [
      txn({ guyId: 'g1', delta: 5 }),
      txn({ guyId: 'g1', delta: -10 }),
      txn({ guyId: 'g1', delta: -5 }),
      txn({ guyId: 'g2', delta: 5 }),
    ];
    const rows = computeScores([guy({ id: 'g1', name: 'Dave' }), guy({ id: 'g2', name: 'Mike' })], txns);
    const dave = rows.find((r) => r.guy.id === 'g1');
    const mike = rows.find((r) => r.guy.id === 'g2');
    expect(dave.awards).toBe(1);
    expect(dave.penalties).toBe(2);
    expect(mike.txnCount).toBe(1);
  });
});

describe('computeStats', () => {
  it('aggregates bureau-wide activity', () => {
    const txns = [
      txn({ delta: 20 }),
      txn({ delta: -15 }),
      txn({ delta: -5 }),
    ];
    const stats = computeStats(txns);
    expect(stats.total).toBe(3);
    expect(stats.awards).toBe(1);
    expect(stats.penalties).toBe(2);
    expect(stats.creditIssued).toBe(20);
    expect(stats.damageIssued).toBe(-20);
  });

  it('returns 7 days of filing history ending today', () => {
    const today = todayStr();
    const stats = computeStats([txn({ date: today })]);
    expect(stats.last7).toHaveLength(7);
    expect(stats.last7[6].day).toBe(today);
    expect(stats.last7[6].filed).toBe(1);
    expect(stats.last7[0].filed).toBe(0);
  });
});
