// Full-app smoke test: renders the real App and clicks through the core
// flows the way a player would. Catches wiring bugs (like the add-friend
// form that silently submitted an outer form) that unit tests miss.
// A failure here blocks the Pages deploy.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import App from './App.jsx';

const readJson = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const chipByName = (name) =>
  screen
    .getAllByRole('radio')
    .find((el) => el.textContent.replace(/\s+/g, ' ').trim().startsWith(name));

// Fresh storage starts with zero citizens (real devices carry their own
// data). Seed one citizen so the report form has chips to work with.
const seedSam = () => {
  window.localStorage.setItem(
    'friendcredit:friends',
    JSON.stringify([{ id: 'sam-1', name: 'Sam', createdAt: Date.now() }])
  );
};

beforeEach(() => {
  window.localStorage.clear();
  // Brag buttons open popups — stub so tests don't navigate away.
  vi.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('FriendCredit smoke: core flows', () => {
  it('adds a friend from the report form without reloading or losing the selection', () => {
    render(<App />);

    // The regression: typing a name and clicking "+ Add friend" used to
    // submit the OUTER report form as a GET navigation — the friend was
    // never saved. Assert the citizen actually joins the roster.
    fireEvent.change(screen.getByLabelText(/add a friend by name/i), {
      target: { value: 'Maya' },
    });
    fireEvent.click(screen.getByRole('button', { name: /\+ add friend/i }));

    const friends = readJson('friendcredit:friends', []);
    expect(friends.map((f) => f.name)).toContain('Maya');

    // The new citizen chip appears in the report form immediately.
    expect(chipByName('Maya')).toBeTruthy();

    // And the page did not navigate (form-submission symptom).
    expect(window.location.pathname).toBe('/');
  });

  it('files a report end to end and updates the standings', () => {
    seedSam();
    render(<App />);

    fireEvent.click(chipByName('Sam'));
    fireEvent.click(chipByName('Brought snacks'));

    const fileBtn = screen.getByRole('button', { name: /file with the bureau/i });
    expect(fileBtn).toBeEnabled();
    fireEvent.click(fileBtn);

    const txns = readJson('friendcredit:transactions', []);
    expect(txns).toHaveLength(1);
    expect(txns[0].delta).toBe(5);

    // Leader card reflects the new total (720 seeded? no — fresh storage starts
    // at 0, so the score is exactly the +5 we just filed).
    expect(screen.getByLabelText('Current leader').textContent).toContain('5 pts');

    // Undo is offered for the last filing.
    expect(screen.getByRole('button', { name: /undo last filing/i })).toBeTruthy();
  });

  it('undo actually reverses the last filing', () => {
    seedSam();
    render(<App />);
    fireEvent.click(chipByName('Sam'));
    fireEvent.click(chipByName('Showed up on time'));
    fireEvent.click(screen.getByRole('button', { name: /file with the bureau/i }));
    expect(readJson('friendcredit:transactions', [])).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /undo last filing/i }));

    // The undo button retires and the ledger is empty again.
    expect(readJson('friendcredit:transactions', [])).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /undo last filing/i })).toBeNull();
  });

  it('redacting a filing retires a stale undo button (the silent no-op bug)', async () => {
    seedSam();
    render(<App />);
    fireEvent.click(chipByName('Sam'));
    fireEvent.click(chipByName('Brought snacks'));
    fireEvent.click(screen.getByRole('button', { name: /file with the bureau/i }));

    // Delete the filing we just made from The Record.
    fireEvent.click(screen.getByRole('tab', { name: 'The Record' }));
    await waitFor(() => screen.getByRole('button', { name: /redact filing for sam/i }));
    fireEvent.click(screen.getByRole('button', { name: /redact filing for sam/i }));

    await waitFor(() => expect(readJson('friendcredit:transactions', [])).toHaveLength(0));

    // Back on Standings, no dead "Undo last filing" button may remain.
    fireEvent.click(screen.getByRole('tab', { name: 'Standings' }));
    expect(screen.queryByRole('button', { name: /undo last filing/i })).toBeNull();
  });

  it('offers brag buttons on the standings', () => {
    seedSam();
    render(<App />);
    fireEvent.click(chipByName('Sam'));
    fireEvent.click(chipByName('Brought snacks'));
    fireEvent.click(screen.getByRole('button', { name: /file with the bureau/i }));

    expect(screen.getByRole('button', { name: /facebook/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /whatsapp/i })).toBeTruthy();
  });

  it('renders the bureau stats with citizens present (regression: missing scores prop crashed the app)', () => {
    seedSam();
    window.localStorage.setItem(
      'friendcredit:friends',
      JSON.stringify([
        { id: 'sam-1', name: 'Sam', createdAt: Date.now() },
        { id: 'em-1', name: 'emily', createdAt: Date.now() },
      ])
    );
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /bureau stats/i }));
    expect(screen.getByRole('region', { name: /roster/i })).toBeTruthy();
    expect(screen.getByRole('region', { name: /records office/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /export records/i })).toBeTruthy();
    // The roster renders each citizen with their score (crashed when the
    // scores prop was dropped: undefined.find inside friends.map).
    expect(screen.getByText('Sam')).toBeTruthy();
    expect(screen.getByText('emily')).toBeTruthy();
    expect(screen.getAllByText(/\d+ pts · \d+ filings/).length).toBe(2);
    // The real Facebook connector is live: the App ID is configured, so the
    // connect button renders inside the liaison zone (no DEMO tag).
    expect(document.querySelector('.fb-zone')).toBeTruthy();
    // Shared-vault section renders its join form while no vault is joined.
    expect(document.querySelector('.vault-zone')).toBeTruthy();
    expect(screen.getByRole('button', { name: /join vault/i })).toBeTruthy();
    const fbBtn = screen.getByRole('button', { name: /connect with facebook/i });
    expect(fbBtn.textContent).not.toMatch(/demo/i);
  });
});

describe('FriendCredit smoke: Facebook suggestion', () => {
  it('suggests the linked Facebook profile in the add-friend form', () => {
    // A device with a linked (non-demo) Facebook profile pre-seeds the chip.
    window.localStorage.setItem(
      'friendcredit:fb-profile',
      JSON.stringify({ name: 'Juanito Pedro Luis Guzman', picture: null, id: '9', demo: false })
    );
    seedSam();
    render(<App />);
    const chip = screen.getByRole('button', {
      name: /register yourself as juanito pedro luis guzman/i,
    });
    fireEvent.click(chip);
    // The suggested citizen is registered and visible in the standings…
    expect(screen.getAllByText('Juanito Pedro Luis Guzman').length).toBeGreaterThan(0);
    // …and the chip is consumed.
    expect(screen.queryByRole('button', { name: /register yourself as/i })).toBeNull();
  });
});

describe('FriendCredit smoke: vault invite', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('joins a vault and shares the bureau code via copy or WhatsApp', async () => {
    // joinVault creates an unknown bureau: first GET 404s, then PUT succeeds.
    vi.spyOn(global, 'fetch').mockImplementation(async (_url, opts = {}) => {
      if (opts.method === 'GET') {
        return { ok: false, status: 404, json: async () => ({ error: 'unknown_bureau' }) };
      }
      if (opts.method === 'PUT') {
        return { ok: true, status: 200, json: async () => ({ ok: true, v: 1 }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
    const writeSpy = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeSpy }, configurable: true });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /bureau stats/i }));
    fireEvent.change(screen.getByLabelText('Vault URL'), { target: { value: 'https://vault.example' } });
    fireEvent.change(screen.getByLabelText('Bureau code'), { target: { value: 'BLUE-HERON-77' } });
    fireEvent.click(screen.getByRole('button', { name: /join vault/i }));

    // Joined row shows the code, along with the new invite buttons.
    await waitFor(() => expect(screen.getByText('BLUE-HERON-77')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /copy invite/i }));
    await waitFor(() => expect(screen.getByText(/copied/i)).toBeTruthy());
    expect(writeSpy.mock.calls[0][0]).toContain('BLUE-HERON-77');

    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }));
    expect(openSpy.mock.calls[0][0]).toContain('https://wa.me/?text=');
    expect(decodeURIComponent(openSpy.mock.calls[0][0])).toContain('BLUE-HERON-77');
  });
});
