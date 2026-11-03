import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DailyGuestNameSlot } from '../DailyGuestNameSlot';
import { getGuestFingerprint, markGuestNameChosen } from '@/utils/guestManager';
import { GUEST_DAILY_PLAYER_KEY, GUEST_FINGERPRINT_KEY } from '@/utils/dailyChallenge/constants';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
const auth = vi.hoisted(() => ({ isAuthenticated: false, loading: false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

const t = (key: string, fallbackOrParams?: string | Record<string, string | number>) =>
  typeof fallbackOrParams === 'string' ? fallbackOrParams : key;

const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(GUEST_DAILY_PLAYER_KEY, JSON.stringify({ displayName: 'Zigzag', avatarEmoji: '🎯', avatarColor: '#000' }));
  localStorage.setItem(GUEST_FINGERPRINT_KEY, 'fp-daily');
  markGuestNameChosen();
  auth.isAuthenticated = false;
  auth.loading = false;
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('DailyGuestNameSlot', () => {
  it('Given a guest, Then it shows their board name, and a rename reaches every daily board identity', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ displayName: 'Ohad' }), { status: 200 }));
    const onRenamed = vi.fn();
    render(<DailyGuestNameSlot t={t} onRenamed={onRenamed} />);

    expect(await screen.findByText('Zigzag')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change name' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ohad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('Ohad'));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      guestFingerprint: 'fp-daily',
      towerFingerprint: getGuestFingerprint(),
      displayName: 'Ohad',
    });
    expect(await screen.findByText('Ohad')).toBeInTheDocument();
  });

  it('Given a signed-in player, Then nothing renders', async () => {
    auth.isAuthenticated = true;
    const { container } = render(<DailyGuestNameSlot t={t} onRenamed={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
  });

  it('Given auth still resolving, Then nothing renders', async () => {
    auth.loading = true;
    const { container } = render(<DailyGuestNameSlot t={t} onRenamed={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
  });
});
