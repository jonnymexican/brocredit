import * as React from 'react';
import { prettyDate } from '../ledgerLogic.js';

export default function Stats({ stats }) {
  const magnitudes = stats.creditIssued - stats.damageIssued;
  let honorRatio = 0;
  if (magnitudes > 0) {
    honorRatio = Math.round((stats.creditIssued / magnitudes) * 100);
  }
  const maxFiled = Math.max.apply(
    null,
    stats.last7.map(function (d) {
      return d.filed;
    }).concat([1])
  );

  return (
    <section aria-label="Bureau statistics">
      <h2 className="section-title">Bureau stats</h2>
      <p className="hint-line">
        Every filing strengthens the Guy-republic. Or lands someone on probation.
      </p>
      {stats.total === 0 ? (
        <p className="empty-state">No filings yet. The Bureau is disappointed but unsurprised.</p>
      ) : (
        <div>
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total filings</div>
            </div>
            <div className="stat-card">
              <div className="stat-value delta-plus">{stats.awards}</div>
              <div className="stat-label">Honors</div>
            </div>
            <div className="stat-card">
              <div className="stat-value delta-minus">{stats.penalties}</div>
              <div className="stat-label">Offenses</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.creditIssued}</div>
              <div className="stat-label">Net credit issued</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.damageIssued}</div>
              <div className="stat-label">Net damage issued</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{honorRatio}%</div>
              <div className="stat-label">Honor ratio</div>
            </div>
          </div>

          <h3 className="sub-title">Filing activity — last 7 days</h3>
          <div className="last7">
            {stats.last7.map(function (d) {
              return (
                <div key={d.day} className="day-col">
                  <div
                    className="day-bar"
                    style={{ height: Math.max(4, (d.filed / maxFiled) * 56) + 'px' }}
                    title={d.day + ': ' + d.filed + ' filings'}
                  />
                  <div className="day-label">{prettyDate(d.day).split(',')[0]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
