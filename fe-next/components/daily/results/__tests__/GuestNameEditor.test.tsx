import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GuestNameEditor } from '../GuestNameEditor';
import { getStoredUsername } from '@/utils/profileStorage';
import { getGuestFingerprint, getGuestName, hasChosenGuestName, markGuestNameChosen } from '@/utils/guestManager';
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
const FP = 'fp-2';

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
    render(<GuestNameEditor name={CHOSEN} guestFingerprint={FP} onRenamed={onRenamed} t={t} />);

    expect(screen.getByText(CHOSEN)).toBeInTheDocument();
    rename('  Ohad ');

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('Ohad'));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/daily-challenge/guest-name');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ guestFingerprint: FP, towerFingerprint: getGuestFingerprint(), displayName: 'Ohad' });
    expect(getGuestFingerprint()).toBeTruthy();
    expect(getStoredUsername()).toBe('Ohad');
    expect(getGuestName()).toBe('Ohad');
    expect(JSON.parse(localStorage.getItem(GUEST_DAILY_PLAYER_KEY) ?? '{}').displayName).toBe('Ohad');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(trackGrowthEvent).toHaveBeenCalledWith('daily_guest_name_saved', { source: 'edit', was_default: false });
  });

  it('keeps the old name and shows an error when the server rejects it', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: 'profane' }));
    const onRenamed = vi.fn();
    render(<GuestNameEditor name={CHOSEN} guestFingerprint={FP} onRenamed={onRenamed} t={t} />);

    rename('badword');

    expect(await screen.findByRole('alert')).toHaveTextContent('Pick a different name');
    expect(onRenamed).not.toHaveBeenCalled();
    expect(getStoredUsername()).not.toBe('badword');
  });

  it('does not call the server for a blank or unchanged name', () => {
    render(<GuestNameEditor name={CHOSEN} guestFingerprint={FP} onRenamed={vi.fn()} t={t} />);
    rename('   ');
    rename(CHOSEN);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows no random-name nudge for a chosen name', () => {
    render(<GuestNameEditor name={CHOSEN} guestFingerprint={FP} onRenamed={vi.fn()} t={t} />);
    expect(screen.queryByTestId('guest-name-default-nudge')).not.toBeInTheDocument();
  });
});

describe('GuestNameEditor — kept a generated name on an earlier finish', () => {
  beforeEach(() => markGuestNameChosen());

  it('asks again until they type a real name', async () => {
    // Given a guest who kept "Sneaky Potato" before the prompt became mandatory
    fetchMock.mockResolvedValue(jsonResponse(200, { displayName: 'Ohad' }));
    const onRenamed = vi.fn();
    render(<GuestNameEditor name={GENERATED} guestFingerprint={FP} onRenamed={onRenamed} t={t} />);

    // Then the name card shows with an empty field
    expect(screen.getByTestId('guest-name-prompt')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ohad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show my name' }));

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('Ohad'));
  });

  it('spots a generated name from another language too', () => {
    render(<GuestNameEditor name="דונאט שובב" guestFingerprint={FP} onRenamed={vi.fn()} t={t} />);
    expect(screen.getByTestId('guest-name-prompt')).toBeInTheDocument();
  });

  it('even when they dismissed the old closable prompt earlier today', () => {
    localStorage.setItem('lexiclash_guest_name_prompt_dismissed_on', new Date().toISOString().slice(0, 10));
    render(<GuestNameEditor name={GENERATED} guestFingerprint={FP} onRenamed={vi.fn()} t={t} />);
    expect(screen.getByTestId('guest-name-prompt')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Not now' })).not.toBeInTheDocument();
  });
});

describe('GuestNameEditor — first finish', () => {
  it('sits inline in the results, not as a dialog, and does not grab focus on arrival', () => {
    render(<GuestNameEditor name={GENERATED} guestFingerprint={FP} rank={4} totalPlayers={120} onRenamed={vi.fn()} t={t} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('guest-name-prompt')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).not.toHaveFocus();
  });

  it('has one field, styled as the guest\'s leaderboard row, with their rank beside it', () => {
    render(<GuestNameEditor name={GENERATED} guestFingerprint={FP} rank={4} totalPlayers={120} onRenamed={vi.fn()} t={t} />);

    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.queryByTestId('guest-name-preview')).not.toBeInTheDocument();
    const row = screen.getByTestId('guest-name-row');
    expect(row).toHaveTextContent('#4');
    expect(row).toContainElement(screen.getByRole('textbox'));
  });

  it('keeps one headline while the rank loads, and adds the rank line once it is known', () => {
    const { rerender } = render(<GuestNameEditor name={GENERATED} guestFingerprint={FP} onRenamed={vi.fn()} t={t} />);
    const headline = screen.getByTestId('guest-name-headline').textContent;
    expect(screen.queryByTestId('guest-name-rank-line')).toBeEmptyDOMElement();

    rerender(<GuestNameEditor name={GENERATED} guestFingerprint={FP} rank={2} totalPlayers={3} onRenamed={vi.fn()} t={t} />);

    expect(screen.getByTestId('guest-name-headline').textContent).toBe(headline);
    expect(screen.getByTestId('guest-name-rank-line')).toHaveTextContent("You're #2 of 3 today!");
  });

  it.each([
    [1, 50, "You're #1 today!"],
    [7, null, "You're #7 today!"],
  ])('rank %s of %s adds "%s"', (rank, total, line) => {
    render(<GuestNameEditor name={GENERATED} guestFingerprint={FP} rank={rank} totalPlayers={total} onRenamed={vi.fn()} t={t} />);
    expect(screen.getByTestId('guest-name-rank-line')).toHaveTextContent(line);
  });

  it('adds no rank line for a rank that is nothing to brag about', () => {
    render(<GuestNameEditor name={GENERATED} guestFingerprint={FP} rank={40} totalPlayers={50} onRenamed={vi.fn()} t={t} />);
    expect(screen.getByTestId('guest-name-rank-line')).toBeEmptyDOMElement();
  });

  it('uses brand colours: no yellow warning text, and the random-name fact is a quiet line', () => {
    const { container } = render(<GuestNameEditor name={GENERATED} guestFingerprint={FP} onRenamed={vi.fn()} t={t} />);
    expect(container.innerHTML).not.toMatch(/neo-yellow/);
    expect(screen.getByTestId('guest-name-default-hint').className).toMatch(/text-neo-white\/\d+/);
  });

  it('tells a guest on a generated name that it is random, with an empty field', () => {
    render(<GuestNameEditor name={GENERATED} guestFingerprint={FP} onRenamed={vi.fn()} t={t} />);

    expect(screen.getByTestId('guest-name-default-hint')).toHaveTextContent(
      'Right now you show up as "Sneaky Potato", a random name lots of players get.',
    );
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Your name');
    expect(trackGrowthEvent).toHaveBeenCalledWith('daily_guest_name_prompt_shown', { is_default: true, rank: null });
  });

  it('prefills a name the guest typed elsewhere so one tap confirms it', async () => {
    render(<GuestNameEditor name={CHOSEN} guestFingerprint={FP} onRenamed={vi.fn()} t={t} />);

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
    render(<GuestNameEditor name={GENERATED} guestFingerprint={FP} onRenamed={onRenamed} t={t} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ohad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show my name' }));

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('Ohad'));
    expect(hasChosenGuestName()).toBe(true);
    expect(screen.queryByTestId('guest-name-prompt')).not.toBeInTheDocument();
    expect(trackGrowthEvent).toHaveBeenCalledWith('daily_guest_name_saved', { source: 'prompt', was_default: true });
  });

  it('stays open with an error when the server rejects the name', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: 'profane' }));
    render(<GuestNameEditor name={GENERATED} guestFingerprint={FP} onRenamed={vi.fn()} t={t} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'badword' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show my name' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByTestId('guest-name-prompt')).toBeInTheDocument();
    expect(hasChosenGuestName()).toBe(false);
  });

  it('refuses to save a generated name as the chosen one', async () => {
    render(<GuestNameEditor name={CHOSEN} guestFingerprint={FP} onRenamed={vi.fn()} t={t} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'sneaky potato' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show my name' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(hasChosenGuestName()).toBe(false);
    expect(screen.getByTestId('guest-name-prompt')).toBeInTheDocument();
  });

  it('will not submit a blank name', () => {
    render(<GuestNameEditor name={GENERATED} guestFingerprint={FP} onRenamed={vi.fn()} t={t} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show my name' }));

    expect(screen.getByRole('button', { name: 'Show my name' })).not.toBeDisabled();
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('guest-name-prompt')).toBeInTheDocument();
  });
});

describe('GuestNameEditor — generated-name nudge', () => {
  it('uses brand colours, not a yellow warning banner', () => {
    render(<GuestNameEditor name={GENERATED} guestFingerprint={null} onRenamed={vi.fn()} t={t} />);
    const nudge = screen.getByTestId('guest-name-default-nudge');
    expect(nudge.outerHTML).not.toMatch(/neo-yellow/);
  });
});
