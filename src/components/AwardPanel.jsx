import * as React from 'react';
import { CREDIT_CATEGORIES, CUSTOM_CATEGORY_ID, clampDelta, todayStr } from '../ledgerLogic.js';

export default function AwardPanel({ guys, onFile, undoAvailable, onUndo }) {
  const [guyId, setGuyId] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [customDelta, setCustomDelta] = React.useState('');
  const [note, setNote] = React.useState('');
  const [date, setDate] = React.useState(todayStr());
  const [error, setError] = React.useState('');

  const selected = CREDIT_CATEGORIES.find((c) => c.id === categoryId) || null;
  const isCustom = selected && selected.id === CUSTOM_CATEGORY_ID;
  const effectiveDelta = isCustom
    ? customDelta.trim() === ''
      ? null
      : clampDelta(customDelta)
    : selected
      ? selected.delta
      : null;

  const canSubmit = Boolean(guyId && selected && (isCustom ? Number.isFinite(effectiveDelta) && customDelta.trim() !== '' : true));

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) {
      if (!guyId) setError('Select a citizen of the guy-republic.');
      else if (!selected) setError('Select an offense or honor.');
      else setError('Enter a custom point value between -100 and 100.');
      return;
    }
    const ok = onFile({ guyId, categoryId, delta: effectiveDelta, note, date });
    if (ok) {
      setCategoryId('');
      setCustomDelta('');
      setNote('');
      setDate(todayStr());
      setError('');
    }
  };

  if (guys.length === 0) {
    return (
      <section aria-label="File a report">
        <h2 className="section-title">File a report</h2>
        <p className="empty-state">
          The Bureau has no citizens on record. Add some guys first (Bureau Stats → Roster).
        </p>
      </section>
    );
  }

  return (
    <section aria-label="File a report">
      <h2 className="section-title">File a report</h2>
      <form className="award-form" onSubmit={submit}>
        <div className="field">
          <span className="field-label">Citizen</span>
          <div className="chip-grid" role="radiogroup" aria-label="Citizen">
            {guys.map((g) => (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={guyId === g.id}
                className={`chip ${guyId === g.id ? 'selected' : ''}`}
                onClick={() => { setGuyId(g.id); setError(''); }}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Offense / Honor</span>
          <div className="chip-grid" role="radiogroup" aria-label="Offense or honor">
            {CREDIT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={categoryId === c.id}
                className={`chip ${categoryId === c.id ? 'selected' : ''} ${c.delta > 0 || c.delta === null ? 'chip-good' : 'chip-bad'}`}
                onClick={() => { setCategoryId(c.id); setError(''); }}
              >
                {c.label}
                {c.delta !== null && (
                  <span className={`chip-delta ${c.delta > 0 ? 'delta-plus' : 'delta-minus'}`}>
                    {c.delta > 0 ? `+${c.delta}` : c.delta}
                  </span>
                )}
                {c.delta === null && <span className="chip-delta delta-custom">?</span>}
              </button>
            ))}
          </div>
        </div>

        {isCustom && (
          <div className="field">
            <label className="field-label" htmlFor="custom-delta">Custom value (−100 to +100)</label>
            <input
              id="custom-delta"
              className="form-input"
              type="number"
              min="-100"
              max="100"
              step="1"
              placeholder="e.g. -25 or +40"
              value={customDelta}
              onChange={(e) => { setCustomDelta(e.target.value); setError(''); }}
            />
          </div>
        )}

        <div className="field">
          <label className="field-label" htmlFor="award-note">Evidence (optional)</label>
          <input
            id="award-note"
            className="form-input"
            type="text"
            placeholder="The Bureau accepts receipts, screenshots described in words, vibes"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="award-date">Date of conduct</label>
            <input
              id="award-date"
              className="form-input date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {effectiveDelta !== null && (
            <div className="delta-preview" aria-live="polite">
              Filed impact: <strong className={effectiveDelta >= 0 ? 'delta-plus' : 'delta-minus'}>
                {effectiveDelta >= 0 ? `+${effectiveDelta}` : effectiveDelta}
              </strong>
            </div>
          )}
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            File with the Bureau
          </button>
          {undoAvailable && (
            <button type="button" className="btn-secondary" onClick={onUndo}>
              Undo last filing
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
