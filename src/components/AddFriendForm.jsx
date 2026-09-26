import * as React from 'react';

export default function AddFriendForm({ onAdd, compact }) {
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');

  const submit = (e) => {
    e.preventDefault();
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

  return (
    <form className={`add-friend-form ${compact ? 'compact' : ''}`} onSubmit={submit}>
      <input
        className="form-input"
        type="text"
        placeholder="Add a friend by name"
        aria-label="Add a friend by name"
        value={name}
        onChange={(e) => { setName(e.target.value); setError(''); }}
      />
      <button type="submit" className="btn-secondary" disabled={!name.trim()}>
        + Add friend
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}
