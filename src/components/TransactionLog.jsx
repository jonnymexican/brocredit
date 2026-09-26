import * as React from 'react';
import { CREDIT_CATEGORIES, prettyDate } from '../ledgerLogic.js';

function categoryLabel(id) {
  const cat = CREDIT_CATEGORIES.find((c) => c.id === id);
  return cat ? cat.label : 'Unlisted conduct';
}

export default function TransactionLog({ transactions, guys, onDelete }) {
  const [filter, setFilter] = React.useState('all');

  const nameOf = (guyId) => guys.find((g) => g.id === guyId)?.name || 'Unknown guy';

  const sorted = React.useMemo(
    () =>
      [...transactions].sort((a, b) => b.createdAt - a.createdAt),
    [transactions]
  );

  const visible = filter === 'all'
    ? sorted
    : sorted.filter((t) => (filter === 'awards' ? t.delta > 0 : t.delta < 0));

  return (
    <section aria-label="Transaction log">
      <h2 className="section-title">The Record</h2>

      <div className="filter-row" role="tablist" aria-label="Filter records">
        {[
          { id: 'all', label: 'All filings' },
          { id: 'awards', label: 'Honors' },
          { id: 'penalties', label: 'Offenses' },
        ].map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            className={`tab ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="empty-state">The Record is spotless. Suspiciously spotless.</p>
      ) : (
        <ul className="txn-list">
          {visible.map((t) => (
            <li key={t.id} className={`txn-row ${t.delta > 0 ? 'txn-honor' : 'txn-offense'}`}>
              <span className={`txn-delta ${t.delta > 0 ? 'delta-plus' : 'delta-minus'}`}>
                {t.delta > 0 ? `+${t.delta}` : t.delta}
              </span>
              <div className="txn-body">
                <div className="txn-headline">
                  <strong>{nameOf(t.guyId)}</strong> — {categoryLabel(t.categoryId)}
                </div>
                {t.note && <div className="txn-note">“{t.note}”</div>}
                <div className="txn-date">{prettyDate(t.date)}</div>
              </div>
              {onDelete && (
                <button
                  type="button"
                  className="btn-icon"
                  aria-label={`Redact filing for ${nameOf(t.guyId)}`}
                  onClick={() => onDelete(t.id)}
                >
                  🗑️
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
