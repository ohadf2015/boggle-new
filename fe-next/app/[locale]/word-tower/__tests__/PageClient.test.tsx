import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const replace = vi.fn();
const useAuth = vi.fn();
const useExperiment = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuth() }));
vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => useExperiment() }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }) }));
vi.mock('@/components/wordTower/WordTowerGame', () => ({
  WordTowerGame: () => <div data-testid="word-tower-game" />,
}));

import { WordTowerPageClient } from '../PageClient';

beforeEach(() => {
  replace.mockClear();
  useExperiment.mockReturnValue({ variant: 'on', trackExposure: vi.fn() });
});

describe('WordTowerPageClient gate', () => {
  it('renders the game for a user with in-work access (admin or beta)', () => {
    useAuth.mockReturnValue({ canSeeInWorkModes: true, loading: false });
    render(<WordTowerPageClient />);
    expect(screen.getByTestId('word-tower-game')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('renders the game for an ORDINARY player — the mode is public now, no redirect', () => {
    useAuth.mockReturnValue({ canSeeInWorkModes: false, loading: false });
    render(<WordTowerPageClient />);
    expect(screen.getByTestId('word-tower-game')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('renders for in-work access even when the experiment flag is off (gate is access-based)', () => {
    useAuth.mockReturnValue({ canSeeInWorkModes: true, loading: false });
    useExperiment.mockReturnValue({ variant: 'off', trackExposure: vi.fn() });
    render(<WordTowerPageClient />);
    expect(screen.getByTestId('word-tower-game')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('renders immediately while auth is still loading — nothing is gated on it', () => {
    useAuth.mockReturnValue({ canSeeInWorkModes: false, loading: true });
    render(<WordTowerPageClient />);
    expect(screen.getByTestId('word-tower-game')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
