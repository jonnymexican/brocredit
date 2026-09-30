import * as React from 'react';
import useLedger from './useLedger.js';
import { computeScores, computeStats, todayStr } from './ledgerLogic.js';
import { PROPAGANDA, randomSlogan } from './propaganda.js';
import AwardPanel from './components/AwardPanel.jsx';
import Standings from './components/Standings.jsx';
import TransactionLog from './components/TransactionLog.jsx';
import Stats from './components/Stats.jsx';
import Roster from './components/Roster.jsx';
import BackupRestore from './components/BackupRestore.jsx';
import AppNav from './components/AppNav.jsx';
import FacebookConnect, { loadStoredProfile } from './components/FacebookConnect.jsx';
import { copyVaultInvite, shareVaultInviteToWhatsApp } from './social.js';

const VIEWS = [
  { id: 'standings', label: 'Standings' },
  { id: 'log', label: 'The Record' },
  { id: 'stats', label: 'Bureau Stats' },
];

function SharedVaultSection({ ledger }) {
  const [url, setUrl] = React.useState('');
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const joined = ledger.vaultInfo;
  const statusLabel = {
    idle: '',
    syncing: 'Syncing…',
    ok: 'Synced',
    error: `Sync problem (${ledger.vaultError})`,
  }[ledger.vaultStatus] || '';

  const join = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await ledger.joinVault(url, code);
      setUrl('');
      setCode('');
    } catch (err) {
      const msgs = {
        network: 'Could not reach the vault URL.',
        unauthorized: 'Wrong bureau code for that vault.',
        bad_url: 'The vault URL must start with https://',
        bad_code: 'Codes are 4-40 letters, digits or dashes.',
        bad_response: 'That URL is not a bureau vault.',
      };
      setError(msgs[err.code] || `Join failed (${err.code})`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="vault-zone" aria-label="Shared vault">
      <h2 className="section-title">Shared vault</h2>
      <p className="hint-line">
        Optionally sync the ledger across everyone's devices via a tiny worker you
        administer. Everyone who joins with the same bureau code shares one ledger;
        without a code, records stay on this device only.
      </p>
      {joined ? (
        <div className="vault-status-row">
          <span className={`vault-dot vault-${ledger.vaultStatus}`} aria-hidden="true" />
          <span>
            Joined <strong>{joined.code}</strong> · {statusLabel}
          </span>
          <button
            type="button"
            className="btn-secondary btn-small vault-invite-btn"
            onClick={async () => {
              setCopied(await copyVaultInvite(joined.code));
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? '✓ Copied' : 'Copy invite'}
          </button>
          <button
            type="button"
            className="btn-secondary btn-small vault-invite-btn"
            onClick={() => shareVaultInviteToWhatsApp(joined.code)}
          >
            WhatsApp
          </button>
          <button type="button" className="btn-secondary btn-small" onClick={ledger.leaveVault}>
            Leave vault
          </button>
        </div>
      ) : (
        <form className="vault-form" onSubmit={join}>
          <input
            className="form-input"
            type="url"
            placeholder="Vault URL (https://…workers.dev)"
            aria-label="Vault URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <input
            className="form-input"
            type="text"
            placeholder="Bureau code"
            aria-label="Bureau code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary" disabled={busy || !url.trim() || !code.trim()}>
            {busy ? 'Joining…' : 'Join vault'}
          </button>
        </form>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}

export default function App() {
  const ledger = useLedger();
  const [view, setView] = React.useState('standings');
  const [slogan, setSlogan] = React.useState(() => PROPAGANDA[0]);
  const [fbProfile, setFbProfile] = React.useState(() => loadStoredProfile());

  const scores = React.useMemo(
    () => computeScores(ledger.friends, ledger.transactions),
    [ledger.friends, ledger.transactions]
  );
  const stats = React.useMemo(
    () => computeStats(ledger.transactions),
    [ledger.transactions]
  );

  // Rotate the propaganda line periodically.
  React.useEffect(() => {
    const timer = setInterval(() => setSlogan((s) => randomSlogan(s)), 25000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="app">
      <AppNav current="https://jonnymexican.github.io/brocredit/" />
      <header className="app-header">
        <div className="crest" aria-hidden="true">🎖️</div>
        <h1>FriendCredit™</h1>
        <p className="bureau-line">Bureau of Friend Conduct — Est. whenever the friends said so</p>
      </header>

      <p className="propaganda" role="note">{slogan}</p>

      <nav className="tabs" role="tablist" aria-label="Views">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            className={`tab ${view === v.id ? 'active' : ''}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>

      <main className="panel">
        {view === 'standings' && (
          <>
            <AwardPanel
              friends={ledger.friends}
              onFile={ledger.fileTransaction}
              undoAvailable={ledger.undoAvailable}
              onUndo={ledger.undoLast}
              onAddFriend={ledger.addFriend}
              fbSuggestion={fbProfile && !fbProfile.demo ? fbProfile : null}
            />
            <Standings rows={scores} />
          </>
        )}

        {view === 'log' && (
          <TransactionLog
            friends={ledger.friends}
            transactions={ledger.transactions}
            onDelete={ledger.deleteTransaction}
          />
        )}

        {view === 'stats' && (
          <>
            <Stats stats={stats} />
            <Roster
              friends={ledger.friends}
              scores={scores}
              onAdd={ledger.addFriend}
              onRename={ledger.renameFriend}
              onRemove={ledger.removeFriend}
              fbSuggestion={fbProfile && !fbProfile.demo ? fbProfile : null}
            />
            <section className="danger-zone" aria-label="Danger zone">
              <h2 className="section-title">Regime change</h2>
              <p className="hint-line">
                Wipe every citizen and every record. The Bureau denies this ever happened.
              </p>
              <button type="button" className="btn-danger" onClick={ledger.clearAll}>
                Dissolve the Bureau
              </button>
            </section>

            <section className="records-office" aria-label="Records office">
              <h2 className="section-title">Records office</h2>
              <p className="hint-line">
                Download the ledgers as a file, or restore them from a previous export. Records
                stay on this device — keep a copy somewhere safe.
              </p>
              <BackupRestore />
            </section>

            <SharedVaultSection ledger={ledger} />

            <section className="fb-zone" aria-label="Facebook connection">
              <h2 className="section-title">Facebook liaison</h2>
              <p className="hint-line">
                Optionally link your Facebook profile to suggest your name and photo when a
                citizen registers. The connection lives only on this device.
              </p>
              <FacebookConnect onProfile={setFbProfile} />
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        All records stay on this device. The Bureau never leaks. Probably.{' '}
        <a className="app-footer-link" href="./privacy.html">Privacy</a>
        {' · '}
        <a className="app-footer-link" href="./data-deletion.html">Data deletion</a>
      </footer>
    </div>
  );
}
