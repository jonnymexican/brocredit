import * as React from 'react';
import { downloadBackup, parseBackup, applyBackup } from '../backup.js';

const STATUS_DURATION = 4000;

export default function BackupRestore() {
  const [status, setStatus] = React.useState(null); // { tone: 'ok' | 'error', text }
  const inputRef = React.useRef(null);
  const timerRef = React.useRef(null);

  React.useEffect(() => () => clearTimeout(timerRef.current), []);

  const flash = (tone, text) => {
    setStatus({ tone, text });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus(null), STATUS_DURATION);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    try {
      const applied = applyBackup(parseBackup(await file.text()));
      flash(
        applied > 0 ? 'ok' : 'error',
        applied > 0
          ? `Restored ${applied} record section${applied === 1 ? '' : 's'} — reload to see them.`
          : 'That backup has no restorable records.'
      );
    } catch (err) {
      flash(
        'error',
        err?.message === 'Not a FriendCredit backup file'
          ? 'That file is not a FriendCredit backup.'
          : 'Import failed — could not read that file.'
      );
    }
  };

  return (
    <div className="backup-restore">
      <button type="button" className="btn-secondary btn-small" onClick={downloadBackup}>
        Export records
      </button>
      <button
        type="button"
        className="btn-secondary btn-small"
        onClick={() => inputRef.current?.click()}
      >
        Import records
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={handleImport}
      />
      {status && (
        <p
          className={`backup-status ${status.tone === 'error' ? 'backup-status-error' : ''}`}
          role="status"
        >
          {status.text}
        </p>
      )}
    </div>
  );
}
