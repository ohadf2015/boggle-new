import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GuestNameEditor } from '../GuestNameEditor';
import { getStoredUsername } from '@/utils/profileStorage';
import { getGuestName } from '@/utils/guestManager';
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
