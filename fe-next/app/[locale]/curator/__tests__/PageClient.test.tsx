import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const status = {
  isCurator: false,
  isAdmin: false,
  languages: [] as string[],
  assignments: [] as Array<{ language: string; trust_tier: number; active: boolean; curator_points: number }>,
  isLoading: false,
};
vi.mock('@/lib/curator/useCuratorStatus', () => ({ useCuratorStatus: () => status }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/Header', () => ({ default: () => <div data-testid="header" /> }));
vi.mock('@/components/curator/CuratorRankCard', () => ({
  CuratorRankCard: ({ points }: { points: number }) => <div data-testid="rank-card">pts:{points}</div>,
}));
vi.mock('@/components/curator/CuratorInvalidWords', () => ({
  CuratorInvalidWords: ({ language }: { language: string }) => <div data-testid="invalid-words">lang:{language}</div>,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

import CuratorPageClient from '../PageClient';

beforeEach(() => {
  status.isCurator = false;
  status.isAdmin = false;
  status.languages = [];
  status.assignments = [];
  status.isLoading = false;
});

describe('CuratorPageClient', () => {
  it('shows a loading state while status resolves', () => {
    status.isLoading = true;
    render(<CuratorPageClient />);
    expect(screen.getByText('curator.loading')).toBeTruthy();
  });

  it('shows an access-required message for a non-curator', () => {
    status.isCurator = false;
    render(<CuratorPageClient />);
    expect(screen.getByText('curator.accessRequired')).toBeTruthy();
    expect(screen.queryByTestId('rank-card')).toBeNull();
  });

  it('renders the dashboard for a curator with their points + scoped word list', () => {
    status.isCurator = true;
    status.languages = ['he'];
    status.assignments = [{ language: 'he', trust_tier: 1, active: true, curator_points: 75 }];
    render(<CuratorPageClient />);
    expect(screen.getByTestId('rank-card').textContent).toContain('75');
    expect(screen.getByTestId('invalid-words').textContent).toContain('he');
  });

  it('shows a language switcher only when the curator has multiple languages', () => {
    status.isCurator = true;
    status.languages = ['en', 'he'];
    status.assignments = [
      { language: 'en', trust_tier: 1, active: true, curator_points: 10 },
      { language: 'he', trust_tier: 1, active: true, curator_points: 20 },
    ];
    render(<CuratorPageClient />);
    expect(screen.getByRole('tablist')).toBeTruthy();
  });
});
