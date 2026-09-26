import * as React from 'react';
import useLedger from './useLedger.js';
import { computeScores, computeStats, todayStr } from './ledgerLogic.js';
import { PROPAGANDA, randomSlogan } from './propaganda.js';
import AwardPanel from './components/AwardPanel.jsx';
import Standings from './components/Standings.jsx';
import TransactionLog from './components/TransactionLog.jsx';
import Stats from './components/Stats.jsx';
import Roster from './components/Roster.jsx';

const VIEWS = [
  { id: 'standings', label: 'Standings' },
  { id: 'log', label: 'The Record' },
  { id: 'stats', label: 'Bureau Stats' },
];

export default function App() {
  const ledger = useLedger();
  const [view, setView] = React.useState('standings');
  const [slogan, setSlogan] = React.useState(() => PROPAGANDA[0]);

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
            />
            <Standings rows={scores} />
          </>
        )}

        {view === 'log' && (
          <TransactionLog
            transactions={ledger.transactions}
            friends={ledger.friends}
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
            />
            <section className="danger-zone" aria-label="Danger zone">
              <h2 className="section-title danger-title">Regime change</h2>
              <p className="hint-line">
                Wipe every citizen and every record. The Bureau denies this ever happened.
              </p>
              <button type="button" className="btn-danger" onClick={ledger.clearAll}>
                Dissolve the Bureau
              </button>
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        All records stay on this device. The Bureau never leaks. Probably.
      </footer>
    </div>
  );
}
