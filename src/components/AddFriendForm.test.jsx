import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AddFriendForm from './AddFriendForm.jsx';

const PROFILE = { name: 'Juanito Pedro Luis Guzman', picture: 'https://example/pic.png', id: '9', demo: false };

describe('AddFriendForm Facebook suggestion', () => {
  afterEach(cleanup);

  it('offers a one-click register chip when a real profile is linked', () => {
    const added = [];
    const { container } = render(
      <AddFriendForm onAdd={(n) => { added.push(n); return true; }} fbSuggestion={PROFILE} />
    );
    const chip = screen.getByRole('button', { name: /register yourself as juanito/i });
    // The avatar renders inside the chip (empty alt = presentational img).
    expect(container.querySelector('.fb-suggest-avatar')).toBeTruthy();
    fireEvent.click(chip);
    expect(added).toEqual(['Juanito Pedro Luis Guzman']);
    expect(screen.queryByRole('button', { name: /register yourself as/i })).toBeNull();
  });

  it('shows no chip for the demo profile or while the user types', () => {
    render(<AddFriendForm onAdd={() => true} fbSuggestion={{ ...PROFILE, demo: true }} />);
    expect(screen.queryByRole('button', { name: /register yourself as/i })).toBeNull();
    cleanup();

    render(<AddFriendForm onAdd={() => true} fbSuggestion={PROFILE} />);
    fireEvent.change(screen.getByRole('textbox', { name: /add a friend by name/i }), {
      target: { value: 'Sam' },
    });
    expect(screen.queryByRole('button', { name: /register yourself as/i })).toBeNull();
  });

  it('surfaces the duplicate-name error when the chip name is taken', () => {
    render(<AddFriendForm onAdd={() => false} fbSuggestion={PROFILE} />);
    fireEvent.click(screen.getByRole('button', { name: /register yourself as juanito/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/already exists/i);
  });
});
