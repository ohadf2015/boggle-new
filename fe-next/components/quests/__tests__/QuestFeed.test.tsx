import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QuestFeed } from '../QuestFeed';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === 'quests.feed.title') return 'Recent Wins';
      if (key === 'quests.feed.pvp') return `${params?.name} beat a human rival`;
      if (key === 'quests.feed.grandSlam') return `${params?.name} cleared all 3 daily quests`;
      return key;
    },
  }),
}));

const auth = vi.hoisted(() => ({ isAuthenticated: true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

const { getWithAuth } = vi.hoisted(() => ({ getWithAuth: vi.fn() }));
vi.mock('@/utils/authFetch', () => ({ getWithAuth }));

function mockFetch(entries: unknown[]) {
  getWithAuth.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, entries }),
  });
}

describe('QuestFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.isAuthenticated = true;
  });

  it('Given a signed-out guest, Then the feed is not requested (no 401)', () => {
    auth.isAuthenticated = false;
    mockFetch([]);
    render(<QuestFeed />);
    expect(getWithAuth).not.toHaveBeenCalled();
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders nothing when the feed is empty', async () => {
    mockFetch([]);
    const { container } = render(<QuestFeed />);
    await waitFor(() => expect(getWithAuth).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('renders a PvP win line', async () => {
    mockFetch([
      { displayName: 'Ann', questId: 'beat_human', family: 'pvp', createdAt: '2026-06-27T10:00:00Z' },
    ]);
    render(<QuestFeed />);
    expect(await screen.findByText('Ann beat a human rival')).toBeTruthy();
    expect(screen.getByText('Recent Wins')).toBeTruthy();
  });

  it('renders a Grand Slam line', async () => {
    mockFetch([
      { displayName: 'Bo', questId: 'grand_slam', family: 'grand_slam', createdAt: '2026-06-27T11:00:00Z' },
    ]);
    render(<QuestFeed />);
    expect(await screen.findByText('Bo cleared all 3 daily quests')).toBeTruthy();
  });

  it('renders nothing on fetch failure', async () => {
    getWithAuth.mockRejectedValue(new Error('network'));
    const { container } = render(<QuestFeed />);
    await waitFor(() => expect(getWithAuth).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });
});
