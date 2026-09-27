import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlayGamesCard } from '../PlayGamesCard';

// --- Controllable mocks -----------------------------------------------------
const hookState: {
  available: boolean;
  signIn: ReturnType<typeof vi.fn>;
  showAchievements: ReturnType<typeof vi.fn>;
  showLeaderboard: ReturnType<typeof vi.fn>;
} = {
  available: true,
  signIn: vi.fn(),
  showAchievements: vi.fn(),
  showLeaderboard: vi.fn(),
};

let cachedSignIn: { success: boolean; playerName?: string } | null = null;

vi.mock('@/hooks/usePlayGamesServices', () => ({
  usePlayGamesServices: () => hookState,
}));

vi.mock('@/utils/nativePGS', () => ({
  getCachedPlayGamesSignIn: () => cachedSignIn,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        'playGames.title': 'Play Games',
        'playGames.connectPrompt': 'Sync your wins to Google Play Games.',
        'playGames.connect': 'Connect',
        'playGames.connecting': 'Connecting…',
        'playGames.signedIn': 'Connected',
        'playGames.achievements': 'Achievements',
        'playGames.leaderboards': 'Leaderboards',
      };
      let out = map[key] ?? key;
      if (params) for (const [k, v] of Object.entries(params)) out = out.replace(`{${k}}`, String(v));
      return out;
    },
  }),
}));

// framer-motion → plain div so jsdom stays quiet
vi.mock('framer-motion', () => ({
  m: { div: (props: Record<string, unknown>) => <div {...props} /> },
}));

describe('PlayGamesCard', () => {
  beforeEach(() => {
    hookState.available = true;
    hookState.signIn = vi.fn().mockResolvedValue({ success: false });
    hookState.showAchievements = vi.fn().mockResolvedValue({ success: true });
    hookState.showLeaderboard = vi.fn().mockResolvedValue({ success: true });
    cachedSignIn = null;
  });
  afterEach(() => vi.clearAllMocks());

  it('renders nothing when Play Games is unavailable (web / iOS)', () => {
    hookState.available = false;
    const { container } = render(<PlayGamesCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the Connect CTA when not signed in', () => {
    render(<PlayGamesCard />);
    expect(screen.getByText('Play Games')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Achievements' })).not.toBeInTheDocument();
  });

  it('signs in when Connect is tapped, then reveals the native overlay buttons', async () => {
    hookState.signIn = vi.fn().mockResolvedValue({ success: true, playerName: 'WordWizard' });
    render(<PlayGamesCard />);

    fireEvent.click(screen.getByRole('button', { name: /Connect/i }));
    expect(hookState.signIn).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(screen.getByText('WordWizard')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Achievements' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leaderboards' })).toBeInTheDocument();
  });

  it('starts connected when a cached sign-in already exists (app-start silent sign-in)', () => {
    cachedSignIn = { success: true, playerName: 'Lex' };
    render(<PlayGamesCard />);
    expect(screen.getByText('Lex')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Achievements' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Connect/i })).not.toBeInTheDocument();
  });

  it('opens the native achievements + leaderboard overlays', () => {
    cachedSignIn = { success: true, playerName: 'Lex' };
    render(<PlayGamesCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Achievements' }));
    expect(hookState.showAchievements).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Leaderboards' }));
    expect(hookState.showLeaderboard).toHaveBeenCalledTimes(1);
  });
});
