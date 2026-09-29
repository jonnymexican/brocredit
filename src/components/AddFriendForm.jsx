import * as React from 'react';

export default function AddFriendForm({ onAdd, compact, fbSuggestion }) {
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');
  const [dismissed, setDismissed] = React.useState(false);

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const ok = onAdd(trimmed);
    if (!ok) {
      setError('A citizen by that name already exists.');
      return;
    }
    setName('');
    setError('');
  };

  // Rendered inside other <form>s, where nested <form> tags get flattened by
  // the browser — so this must not rely on form submission. A plain container
  // with an explicit click handler and Enter-key handling is flatten-proof.
  const suggestion = fbSuggestion && !fbSuggestion.demo ? fbSuggestion : null;
  const showSuggestion = suggestion && !dismissed && !name.trim();

  return (
    <div className={`add-friend-form ${compact ? 'compact' : ''}`}>
      {showSuggestion && (
        <div className="fb-suggest-row">
          <button
            type="button"
            className="fb-suggest-chip"
            aria-label={'Register yourself as ' + suggestion.name}
            onClick={() => {
              const ok = onAdd(suggestion.name);
              if (!ok) setError('A citizen by that name already exists.');
              setDismissed(true);
            }}
          >
            {suggestion.picture && (
              <img className="fb-suggest-avatar" src={suggestion.picture} alt="" width="20" height="20" />
            )}
            <span className="fb-suggest-text">Register yourself as {suggestion.name}</span>
          </button>
          <button
            type="button"
            className="fb-suggest-dismiss"
            aria-label="Dismiss name suggestion"
            onClick={() => setDismissed(true)}
          >
            &times;
          </button>
        </div>
      )}
      <input
        className="form-input"
        type="text"
        placeholder="Add a friend by name"
        aria-label="Add a friend by name"
        value={name}
        onChange={(e) => { setName(e.target.value); setError(''); }}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(e); }}
      />
      <button type="button" className="btn-secondary" disabled={!name.trim()} onClick={submit}>
        + Add friend
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
