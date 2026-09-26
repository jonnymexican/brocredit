import * as React from 'react';

function rankPill(rank) {
  return (
    <span className={`rank-pill rank-${rank.id}`}>
      <span aria-hidden="true">{rank.emoji}</span> {rank.title}
    </span>
  );
}

export default function Standings({ rows }) {
  if (rows.length === 0) {
    return (
      <section aria-label="Standings">
        <h2 className="section-title">Official standings</h2>
        <p className="empty-state">
          No citizens registered. The leaderboard awaits its first legend — or its first cautionary tale.
        </p>
      </section>
    );
  }

  const [top, ...rest] = rows;

  return (
    <section aria-label="Standings">
      <h2 className="section-title">Official standings</h2>

      <div className="leader-card" aria-label="Current leader">
        <div className="leader-crown" aria-hidden="true">👑</div>
        <div className="leader-info">
          <div className="leader-name">{top.friend.name}</div>
          <div className="leader-meta">
            {top.score} pts — {top.rank.emoji} {top.rank.title}
          </div>
        </div>
      </div>

      <ol className="standings-list">
        {rest.map((row, i) => (
          <li key={row.friend.id} className="standing-row">
            <span className="standing-pos">#{i + 2}</span>
            <span className="standing-name">{row.friend.name}</span>
            {rankPill(row.rank)}
            <span className="standing-score">{row.score}</span>
            <span className="standing-net">
              ({row.net >= 0 ? `+${row.net}` : row.net})
            </span>
          </li>
        ))}
      </ol>

      <div className="legend-line">
        <span className="hint-line">
          Awards {top.awards} · Penalties {top.penalties} — all records final. Appeals cost credibility.
        </span>
      </div>
    </section>
  );
}
