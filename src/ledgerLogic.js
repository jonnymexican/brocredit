// Pure logic for FriendCredit — no React, fully unit-testable.

export const BASE_SCORE = 700; // every friend starts with the benefit of the doubt
export const MIN_SCORE = 300;
export const MAX_SCORE = 850;

export function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function prettyDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function clampScore(score) {
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, score));
}

/** Custom deltas are limited so no single deed can destroy or crown a friend. */
export function clampDelta(delta) {
  return Math.min(100, Math.max(-100, Math.round(Number(delta) || 0)));
}

/**
 * The official offense and honor catalog. Each preset carries a recommended
 * delta the tribunal can adjust before filing. `custom` has a null delta —
 * the user supplies their own.
 */
export const CREDIT_CATEGORIES = [
  // Honors
  { id: 'moved', label: 'Helped a friend move', delta: 20 },
  { id: 'tech', label: 'Fixed a tech emergency', delta: 10 },
  { id: 'advice', label: 'Gave genuinely good advice', delta: 10 },
  { id: 'hosting', label: 'Hosted the hangout', delta: 10 },
  { id: 'on-time', label: 'Showed up on time', delta: 5 },
  { id: 'snacks', label: 'Brought snacks', delta: 5 },
  { id: 'fair-split', label: 'Split the bill fairly', delta: 5 },
  // Offenses
  { id: 'birthday', label: "Forgot a friend's birthday", delta: -20 },
  { id: 'flake', label: 'Flaked on plans', delta: -15 },
  { id: 'on-my-way', label: "Texted 'on my way' from bed", delta: -15 },
  { id: 'leftovers', label: 'Ate leftovers without asking', delta: -10 },
  { id: 'left-on-read', label: 'Left a friend on read', delta: -5 },
  { id: 'k-text', label: "Replied with just 'K.'", delta: -5 },
  // Wildcard
  { id: 'custom', label: 'Custom offense / honor', delta: null },
];

export const CUSTOM_CATEGORY_ID = 'custom';

/**
 * Rank tiers. The Bureau recognizes seven classifications of friend.
 */
export const RANKS = [
  { id: 'legend', title: 'Legend', emoji: '🐐', min: 800, max: 850, tagline: 'The Council consults them.' },
  { id: 'good-friend', title: 'Certified Good Friend', emoji: '🏅', min: 740, max: 799, tagline: 'Trusted with the aux cord.' },
  { id: 'solid', title: 'Solid Friend', emoji: '👍', min: 680, max: 739, tagline: 'Reliable. Brings snacks unprompted.' },
  { id: 'probation', title: 'On Probation', emoji: '📋', min: 620, max: 679, tagline: 'Under observation. Watch it.' },
  { id: 'flake', title: 'Certified Flake', emoji: '❄️', min: 550, max: 619, tagline: "'On my way' means still in bed." },
  { id: 'clown', title: 'Clown Behavior', emoji: '🤡', min: 480, max: 549, tagline: 'The Bureau is not amused.' },
  { id: 'pariah', title: 'Enemy of the Friend Group', emoji: '🚨', min: MIN_SCORE, max: 479, tagline: 'Your conduct has been NOTED.' },
];

/** Map a score to its rank tier (score is clamped first). */
export function scoreToRank(score) {
  const clamped = clampScore(score);
  return RANKS.find((r) => clamped >= r.min && clamped <= r.max) || RANKS[RANKS.length - 1];
}

/**
 * Score every friend: base score + net transaction deltas, clamped to the
 * official range. Sorted by score descending, ties broken alphabetically
 * (the Bureau is impartial).
 */
export function computeScores(friends, transactions) {
  return friends
    .map((friend) => {
      const txns = transactions.filter((t) => t.friendId === friend.id);
      const net = txns.reduce((sum, t) => sum + t.delta, 0);
      const score = clampScore(BASE_SCORE + net);
      return {
        friend,
        score,
        rank: scoreToRank(score),
        net,
        awards: txns.filter((t) => t.delta > 0).length,
        penalties: txns.filter((t) => t.delta < 0).length,
        txnCount: txns.length,
      };
    })
    .sort((a, b) => b.score - a.score || a.friend.name.localeCompare(b.friend.name));
}

/**
 * Bureau-wide statistics: filing activity over the last 7 days and the
 * total credit awarded vs. penalties issued.
 */
export function computeStats(transactions, referenceDay = todayStr()) {
  const awards = transactions.filter((t) => t.delta > 0);
  const penalties = transactions.filter((t) => t.delta < 0);

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(
      Number(referenceDay.slice(0, 4)),
      Number(referenceDay.slice(5, 7)) - 1,
      Number(referenceDay.slice(8, 10))
    );
    d.setDate(d.getDate() - i);
    const day = todayStr(d);
    last7.push({
      day,
      filed: transactions.filter((t) => t.date === day).length,
    });
  }

  return {
    total: transactions.length,
    awards: awards.length,
    penalties: penalties.length,
    creditIssued: awards.reduce((s, t) => s + t.delta, 0),
    damageIssued: penalties.reduce((s, t) => s + t.delta, 0),
    last7,
  };
}
