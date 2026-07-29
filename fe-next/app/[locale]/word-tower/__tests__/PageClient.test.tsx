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
  it('renders the game for an admin', () => {
    useAuth.mockReturnValue({ isAdmin: true, loading: false });
    render(<WordTowerPageClient />);
    expect(screen.getByTestId('word-tower-game')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects a non-admin home', () => {
    useAuth.mockReturnValue({ isAdmin: false, loading: false });
    render(<WordTowerPageClient />);
    expect(screen.queryByTestId('word-tower-game')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/en');
  });

  it('renders for an admin even when the experiment flag is off (gate is admin-only)', () => {
    useAuth.mockReturnValue({ isAdmin: true, loading: false });
    useExperiment.mockReturnValue({ variant: 'off', trackExposure: vi.fn() });
    render(<WordTowerPageClient />);
    expect(screen.getByTestId('word-tower-game')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not redirect while auth is still loading', () => {
    useAuth.mockReturnValue({ isAdmin: false, loading: true });
    render(<WordTowerPageClient />);
    expect(screen.queryByTestId('word-tower-game')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
