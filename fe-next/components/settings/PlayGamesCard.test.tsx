import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayGamesCard } from './PlayGamesCard';
import * as hook from '@/hooks/usePlayGamesServices';

vi.mock('@/hooks/usePlayGamesServices', () => ({
  usePlayGamesServices: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => (k === 'settings.playGames.signedInAs' ? 'Signed in as {name}' : k),
    language: 'en',
  }),
}));

const baseHook = {
  available: true,
  signIn: vi.fn().mockResolvedValue({ success: true, playerName: 'Ada' }),
  submitScore: vi.fn(),
  unlockAchievement: vi.fn(),
  incrementAchievement: vi.fn(),
  showLeaderboard: vi.fn().mockResolvedValue({ success: true }),
  showAchievements: vi.fn().mockResolvedValue({ success: true }),
};

describe('PlayGamesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (hook.usePlayGamesServices as jest.Mock).mockReturnValue({ ...baseHook });
  });

  it('renders nothing when Play Games is unavailable (web/iOS)', () => {
    (hook.usePlayGamesServices as jest.Mock).mockReturnValue({ ...baseHook, available: false });
    const { container } = render(<PlayGamesCard isDarkMode={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the card with a sign-in action when available', () => {
    render(<PlayGamesCard isDarkMode={false} />);
    expect(screen.getByText('settings.playGames.title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /signIn/i })).toBeInTheDocument();
  });

  it('signs in and then shows the signed-in name', async () => {
    render(<PlayGamesCard isDarkMode={false} />);
    fireEvent.click(screen.getByRole('button', { name: /signIn/i }));
    expect(baseHook.signIn).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText(/Ada/)).toBeInTheDocument());
  });

  it('opens native achievements and leaderboard UIs', () => {
    render(<PlayGamesCard isDarkMode={false} />);
    fireEvent.click(screen.getByRole('button', { name: /achievements/i }));
    fireEvent.click(screen.getByRole('button', { name: /leaderboards/i }));
    expect(baseHook.showAchievements).toHaveBeenCalledTimes(1);
    expect(baseHook.showLeaderboard).toHaveBeenCalledTimes(1);
  });
});
