import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GuestNameEditor } from '../GuestNameEditor';
import { getStoredUsername } from '@/utils/profileStorage';
import { getGuestName, hasChosenGuestName, markGuestNameChosen } from '@/utils/guestManager';
import { GUEST_DAILY_PLAYER_KEY } from '@/utils/dailyChallenge/constants';
import { trackGrowthEvent } from '@/utils/growthTracking';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

// Mirrors LanguageContext: fallback text with {param} interpolation.
const t = (key: string, fallbackOrParams?: string | Record<string, string | number>, params?: Record<string, string | number>) => {
  const text = typeof fallbackOrParams === 'string' ? fallbackOrParams : key;
  const values = typeof fallbackOrParams === 'object' ? fallbackOrParams : params ?? {};
  return text.replace(/\{(\w+)\}/g, (m, k) => (values[k] !== undefined ? String(values[k]) : m));
};

// A name from the generated pool vs one a player typed.
const GENERATED = 'Sneaky Potato';
const CHOSEN = 'Zigzag';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function rename(to: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Change name' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: to } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
}

const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.mocked(trackGrowthEvent).mockClear();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('GuestNameEditor — a guest who owns their name', () => {
  beforeEach(() => markGuestNameChosen());

  it('renames on the server, persists every local guest-name store, and notifies the parent', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { displayName: 'Ohad' }));
    const onRenamed = vi.fn();
    render(<GuestNameEditor name={CHOSEN} guestFingerprint="fp-1" onRenamed={onRenamed} t={t} />);

    expect(screen.getByText(CHOSEN)).toBeInTheDocument();
    rename('  Ohad ');

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('Ohad'));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/daily-challenge/guest-name');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ guestFingerprint: 'fp-1', displayName: 'Ohad' });
    expect(getStoredUsername()).toBe('Ohad');
    expect(getGuestName()).toBe('Ohad');
    expect(JSON.parse(localStorage.getItem(GUEST_DAILY_PLAYER_KEY) ?? '{}').displayName).toBe('Ohad');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(trackGrowthEvent).toHaveBeenCalledWith('daily_guest_name_saved', { source: 'edit', was_default: false });
  });

  it('keeps the old name and shows an error when the server rejects it', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: 'profane' }));
    const onRenamed = vi.fn();
    render(<GuestNameEditor name={CHOSEN} guestFingerprint="fp-1" onRenamed={onRenamed} t={t} />);

    rename('badword');

    expect(await screen.findByRole('alert')).toHaveTextContent('Pick a different name');
    expect(onRenamed).not.toHaveBeenCalled();
    expect(getStoredUsername()).not.toBe('badword');
  });

  it('does not call the server for a blank or unchanged name', () => {
    render(<GuestNameEditor name={CHOSEN} guestFingerprint="fp-1" onRenamed={vi.fn()} t={t} />);
    rename('   ');
    rename(CHOSEN);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows no random-name nudge for a chosen name', () => {
    render(<GuestNameEditor name={CHOSEN} guestFingerprint="fp-1" onRenamed={vi.fn()} t={t} />);
    expect(screen.queryByTestId('guest-name-default-nudge')).not.toBeInTheDocument();
  });
});

describe('GuestNameEditor — still on a generated name after the prompt', () => {
  beforeEach(() => markGuestNameChosen());

  it('says the name is random and offers to swap it, without blocking the screen', async () => {
    // Given a guest who kept "Sneaky Potato" earlier
    fetchMock.mockResolvedValue(jsonResponse(200, { displayName: 'Ohad' }));
    const onRenamed = vi.fn();
    render(<GuestNameEditor name={GENERATED} guestFingerprint="fp-1" onRenamed={onRenamed} t={t} />);

    // Then the bar names it as a random name, and no dialog is open
    expect(screen.getByTestId('guest-name-default-nudge')).toHaveTextContent(
      "You're on the board as Sneaky Potato, a random name. Make this score yours.",
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // When they take the offer, the field starts empty rather than on the random name
    fireEvent.click(screen.getByRole('button', { name: 'Use my name' }));
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Your name');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ohad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('Ohad'));
    expect(trackGrowthEvent).toHaveBeenCalledWith('daily_guest_name_saved', { source: 'nudge', was_default: true });
  });

  it('spots a generated name from another language too', () => {
    render(<GuestNameEditor name="דונאט שובב" guestFingerprint="fp-1" onRenamed={vi.fn()} t={t} />);
    expect(screen.getByTestId('guest-name-default-nudge')).toBeInTheDocument();
  });
});

describe('GuestNameEditor — first finish', () => {
  it('opens on the guest\'s rank and shows a live preview of their leaderboard row', () => {
    render(<GuestNameEditor name={GENERATED} guestFingerprint="fp-1" rank={4} totalPlayers={120} onRenamed={vi.fn()} t={t} />);

    expect(screen.getByRole('dialog')).toHaveTextContent("You're #4 of 120 today!");
    const preview = screen.getByTestId('guest-name-preview');
    expect(preview).toHaveTextContent('#4');
    expect(preview).toHaveTextContent('Your name');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ohad' } });
    expect(preview).toHaveTextContent('Ohad');
  });

  it.each([
    [1, 50, "You're #1 today!"],
    [7, null, "You're #7 today!"],
    [40, 50, "You made today's leaderboard!"],
    [null, null, "You made today's leaderboard!"],
  ])('rank %s of %s opens with "%s"', (rank, total, headline) => {
    render(<GuestNameEditor name={GENERATED} guestFingerprint="fp-1" rank={rank} totalPlayers={total} onRenamed={vi.fn()} t={t} />);
    expect(screen.getByRole('dialog')).toHaveTextContent(headline);
  });

  it('tells a guest on a generated name that it is random, with an empty field', () => {
    render(<GuestNameEditor name={GENERATED} guestFingerprint="fp-1" onRenamed={vi.fn()} t={t} />);

    expect(screen.getByTestId('guest-name-default-hint')).toHaveTextContent(
      'Right now you show up as "Sneaky Potato", a random name lots of players get.',
    );
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Your name');
    expect(trackGrowthEvent).toHaveBeenCalledWith('daily_guest_name_prompt_shown', { is_default: true, rank: null });
  });

  it('prefills a name the guest typed elsewhere so one tap confirms it', async () => {
    render(<GuestNameEditor name={CHOSEN} guestFingerprint="fp-1" onRenamed={vi.fn()} t={t} />);

    expect(screen.queryByTestId('guest-name-default-hint')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue(CHOSEN);

    fireEvent.click(screen.getByRole('button', { name: 'Show my name' }));

    await waitFor(() => expect(screen.queryByTestId('guest-name-prompt')).not.toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(hasChosenGuestName()).toBe(true);
  });

  it('saves the typed name and stops asking', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { displayName: 'Ohad' }));
    const onRenamed = vi.fn();
    render(<GuestNameEditor name={GENERATED} guestFingerprint="fp-1" onRenamed={onRenamed} t={t} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ohad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show my name' }));

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('Ohad'));
    expect(hasChosenGuestName()).toBe(true);
    expect(screen.queryByTestId('guest-name-prompt')).not.toBeInTheDocument();
    expect(trackGrowthEvent).toHaveBeenCalledWith('daily_guest_name_saved', { source: 'prompt', was_default: true });
  });

  it('stays open with an error when the server rejects the name', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: 'profane' }));
    render(<GuestNameEditor name={GENERATED} guestFingerprint="fp-1" onRenamed={vi.fn()} t={t} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'badword' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show my name' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByTestId('guest-name-prompt')).toBeInTheDocument();
    expect(hasChosenGuestName()).toBe(false);
  });

  it('is a blocking dialog with no way to skip it in the control arm', () => {
    render(<GuestNameEditor name={GENERATED} guestFingerprint="fp-1" onRenamed={vi.fn()} t={t} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Keep this name' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(screen.getByTestId('guest-name-prompt')).toBeInTheDocument();
    expect(hasChosenGuestName()).toBe(false);
  });

  it('offers "Keep this name" only to the keep_name arm, then nudges on the results screen', async () => {
    // Given Growth Radar serves the treatment arm
    const getFlag = vi.fn(() => 'keep_name');
    (window as unknown as { grq: unknown }).grq = { push: (cb: (gr: unknown) => void) => cb({ getFlag }) };
    try {
      render(<GuestNameEditor name={GENERATED} guestFingerprint="fp-1" onRenamed={vi.fn()} t={t} />);
      // When the guest keeps the generated name
      fireEvent.click(await screen.findByRole('button', { name: 'Keep this name' }));
      // Then the prompt closes without a server call and does not come back
      expect(getFlag).toHaveBeenCalledWith('daily-guest-name-skip');
      expect(screen.queryByTestId('guest-name-prompt')).not.toBeInTheDocument();
      expect(hasChosenGuestName()).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(trackGrowthEvent).toHaveBeenCalledWith('daily_guest_name_kept', { is_default: true });
      // And the softer in-page nudge takes its place
      expect(screen.getByTestId('guest-name-default-nudge')).toBeInTheDocument();
    } finally {
      delete (window as unknown as { grq?: unknown }).grq;
    }
  });

  it('will not submit a blank name', () => {
    render(<GuestNameEditor name={GENERATED} guestFingerprint="fp-1" onRenamed={vi.fn()} t={t} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });

    expect(screen.getByRole('button', { name: 'Show my name' })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
