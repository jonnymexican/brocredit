import * as React from 'react';

export default function Roster({ guys, scores, onAdd, onRename, onRemove }) {
  const [newName, setNewName] = React.useState('');
  const [editingId, setEditingId] = React.useState(null);
  const [editName, setEditName] = React.useState('');

  const add = (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (guys.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) {
      setNewName('');
      return;
    }
    onAdd(trimmed);
    setNewName('');
  };

  const scoreFor = (id) => scores.find((s) => s.guy.id === id);
  const nameTaken = guys.some(
    (g) => g.name.toLowerCase() === newName.trim().toLowerCase()
  ) && newName.trim() !== '';

  return (
    <section aria-label="Roster">
      <h2 className="section-title">Citizen registry</h2>
      <p className="hint-line">
        Citizenship is granted upon entry and revoked only by the tribunal (you).
      </p>

      <form className="roster-form" onSubmit={add}>
        <input
          className="form-input"
          type="text"
          placeholder="Name of the guy"
          aria-label="Name of the guy"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={!newName.trim() || nameTaken}>
          Register citizen
        </button>
      </form>
      {nameTaken && (
        <p className="form-error" role="alert">A citizen by that name already exists.</p>
      )}

      {guys.length === 0 ? (
        <p className="empty-state">No citizens registered yet. Every republic starts somewhere.</p>
      ) : (
        <ul className="roster-list">
          {guys.map((g) => {
            const s = scoreFor(g.id);
            const isEditing = editingId === g.id;
            return (
              <li key={g.id} className="roster-row">
                {isEditing ? (
                  <>
                    <input
                      className="form-input roster-edit-input"
                      value={editName}
                      aria-label="New name"
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-primary btn-small"
                      onClick={() => {
                        onRename(g.id, editName);
                        setEditingId(null);
                      }}
                      disabled={!editName.trim()}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="roster-name">{g.name}</span>
                    <span className="roster-meta">
                      {s ? s.score + ' pts · ' + s.txnCount + ' filings' : ''}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={() => {
                        setEditingId(g.id);
                        setEditName(g.name);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="btn-danger btn-small"
                      onClick={() => {
                        if (window.confirm('Expel ' + g.name + ' and redact all their records?')) {
                          onRemove(g.id);
                        }
                      }}
                    >
                      Expel
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
