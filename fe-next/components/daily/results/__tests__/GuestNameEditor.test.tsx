import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GuestNameEditor } from '../GuestNameEditor';
import { getStoredUsername } from '@/utils/profileStorage';
import { getGuestName, hasChosenGuestName, markGuestNameChosen } from '@/utils/guestManager';
import { GUEST_DAILY_PLAYER_KEY } from '@/utils/dailyChallenge/constants';

const t = (key: string, fallback?: string) => fallback ?? key;

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function rename(to: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Change name' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: to } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
}

describe('GuestNameEditor', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    // These cover the compact "change name" row a guest sees once they own their name.
    markGuestNameChosen();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renames on the server, persists every local guest-name store, and notifies the parent', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { displayName: 'Zigzag' }));
    const onRenamed = vi.fn();
    render(<GuestNameEditor name="WordNinja" guestFingerprint="fp-1" onRenamed={onRenamed} t={t} />);

    expect(screen.getByText('WordNinja')).toBeInTheDocument();
    rename('  Zigzag ');

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('Zigzag'));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/daily-challenge/guest-name');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ guestFingerprint: 'fp-1', displayName: 'Zigzag' });
    expect(getStoredUsername()).toBe('Zigzag');
    expect(getGuestName()).toBe('Zigzag');
    expect(JSON.parse(localStorage.getItem(GUEST_DAILY_PLAYER_KEY) ?? '{}').displayName).toBe('Zigzag');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('keeps the old name and shows an error when the server rejects it', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: 'profane' }));
    const onRenamed = vi.fn();
    render(<GuestNameEditor name="WordNinja" guestFingerprint="fp-1" onRenamed={onRenamed} t={t} />);

    rename('badword');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onRenamed).not.toHaveBeenCalled();
    expect(getStoredUsername()).not.toBe('badword');
  });

  it('does not call the server for a blank or unchanged name', () => {
    render(<GuestNameEditor name="WordNinja" guestFingerprint="fp-1" onRenamed={vi.fn()} t={t} />);
    rename('   ');
    rename('WordNinja');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('GuestNameEditor — first finish with an auto-generated name', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('asks for the name to save the score under instead of silently using the random one', () => {
    // Given a guest who never picked a name
    // When their results render
    render(<GuestNameEditor name="WordNinja" guestFingerprint="fp-1" onRenamed={vi.fn()} t={t} />);
    // Then a prompt with an empty name field is open
    expect(screen.getByTestId('guest-name-prompt')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'WordNinja');
  });

  it('saves the typed name and stops asking', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { displayName: 'Ohad' }));
    const onRenamed = vi.fn();
    render(<GuestNameEditor name="WordNinja" guestFingerprint="fp-1" onRenamed={onRenamed} t={t} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ohad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('Ohad'));
    expect(hasChosenGuestName()).toBe(true);
    expect(screen.queryByTestId('guest-name-prompt')).not.toBeInTheDocument();
  });

  it('is a blocking dialog with no way to skip it', () => {
    render(<GuestNameEditor name="WordNinja" guestFingerprint="fp-1" onRenamed={vi.fn()} t={t} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Keep this name' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(screen.getByTestId('guest-name-prompt')).toBeInTheDocument();
    expect(hasChosenGuestName()).toBe(false);
  });

  it('offers "Keep this name" only to the keep_name arm of the daily-guest-name-skip test', async () => {
    // Given Growth Radar serves the treatment arm
    const getFlag = vi.fn(() => 'keep_name');
    (window as unknown as { grq: unknown }).grq = { push: (cb: (gr: unknown) => void) => cb({ getFlag }) };
    try {
      render(<GuestNameEditor name="WordNinja" guestFingerprint="fp-1" onRenamed={vi.fn()} t={t} />);
      // When the guest keeps the generated name
      fireEvent.click(await screen.findByRole('button', { name: 'Keep this name' }));
      // Then the prompt closes without a server call and does not come back
      expect(getFlag).toHaveBeenCalledWith('daily-guest-name-skip');
      expect(screen.queryByTestId('guest-name-prompt')).not.toBeInTheDocument();
      expect(hasChosenGuestName()).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      delete (window as unknown as { grq?: unknown }).grq;
    }
  });

  it('will not submit a blank name', () => {
    render(<GuestNameEditor name="WordNinja" guestFingerprint="fp-1" onRenamed={vi.fn()} t={t} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
