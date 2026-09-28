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

  it('renders the bureau stats, records office and roster', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /bureau stats/i }));
    expect(screen.getByRole('region', { name: /roster/i })).toBeTruthy();
    expect(screen.getByRole('region', { name: /records office/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /export records/i })).toBeTruthy();
    // Facebook connector stays hidden without an App ID.
    expect(document.querySelector('.fb-zone')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /connect with facebook/i })).toBeNull();
  });
});
