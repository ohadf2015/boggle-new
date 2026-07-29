/**
 * GhostRivalWidget Component Tests
 * Tests rendering of the ghost rival engagement widget
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { GhostRivalWidget } from '../GhostRivalWidget';
import { useGhostRival } from '@/hooks/useGhostRival';
import { useLanguage } from '@/contexts/LanguageContext';

// Mock dependencies
vi.mock('@/hooks/useGhostRival');
vi.mock('@/contexts/LanguageContext');
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

const mockT = (key: string, params?: Record<string, string>) => {
  const translations: Record<string, string> = {
    'ghostRival.title': 'Ghost Rival',
    'ghostRival.you': 'You',
    'ghostRival.ahead': `${params?.pts ?? ''} pts ahead`,
    'ghostRival.behind': `${params?.pts ?? ''} pts behind`,
    'ghostRival.cta': 'Play to close the gap!',
    'ghostRival.endsIn': `Ends in ${params?.time ?? ''}`,
    'ghostRival.ended': 'Week ended',
  };
  return translations[key] ?? key;
};

describe('GhostRivalWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useLanguage as jest.Mock).mockReturnValue({ t: mockT });
  });

  it('should not render when loading', () => {
    // GIVEN
    (useGhostRival as jest.Mock).mockReturnValue({
      rival: null,
      player: { score: 0 },
      gap: 0,
      isAhead: true,
      loading: true,
      error: null,
      weekEnd: null,
      refresh: vi.fn(),
    });

    // WHEN
    const { container } = render(<GhostRivalWidget />);

    // THEN
    expect(container.firstChild).toBeNull();
  });

  it('should not render when no rival matched', () => {
    // GIVEN
    (useGhostRival as jest.Mock).mockReturnValue({
      rival: null,
      player: { score: 0 },
      gap: 0,
      isAhead: true,
      loading: false,
      error: null,
      weekEnd: null,
      refresh: vi.fn(),
    });

    // WHEN
    const { container } = render(<GhostRivalWidget />);

    // THEN
    expect(container.firstChild).toBeNull();
  });

  it('should render rival widget with scores when rival exists', () => {
    // GIVEN
    (useGhostRival as jest.Mock).mockReturnValue({
      rival: { id: 'r1', username: 'GhostPlayer', avatar: '', score: 150 },
      player: { score: 200 },
      gap: 50,
      isAhead: true,
      loading: false,
      error: null,
      weekEnd: '2026-03-29',
      refresh: vi.fn(),
    });

    // WHEN
    render(<GhostRivalWidget />);

    // THEN
    expect(screen.getByTestId('ghost-rival-widget')).toBeInTheDocument();
    expect(screen.getByTestId('ghost-rival-player-score')).toHaveTextContent('200');
    expect(screen.getByTestId('ghost-rival-rival-score')).toHaveTextContent('150');
    expect(screen.getByText('GhostPlayer')).toBeInTheDocument();
  });

  it('should show ahead indicator when player is leading', () => {
    // GIVEN
    (useGhostRival as jest.Mock).mockReturnValue({
      rival: { id: 'r1', username: 'Rival', avatar: '', score: 100 },
      player: { score: 200 },
      gap: 100,
      isAhead: true,
      loading: false,
      error: null,
      weekEnd: '2026-03-29',
      refresh: vi.fn(),
    });

    // WHEN
    render(<GhostRivalWidget />);

    // THEN
    const gapEl = screen.getByTestId('ghost-rival-gap');
    expect(gapEl).toHaveTextContent('100 pts ahead');
  });

  it('should show behind indicator and CTA when rival is leading', () => {
    // GIVEN
    (useGhostRival as jest.Mock).mockReturnValue({
      rival: { id: 'r1', username: 'Rival', avatar: '', score: 300 },
      player: { score: 100 },
      gap: 200,
      isAhead: false,
      loading: false,
      error: null,
      weekEnd: '2026-03-29',
      refresh: vi.fn(),
    });

    // WHEN
    render(<GhostRivalWidget />);

    // THEN
    const gapEl = screen.getByTestId('ghost-rival-gap');
    expect(gapEl).toHaveTextContent('200 pts behind');
    expect(screen.getByText('Play to close the gap!')).toBeInTheDocument();
  });

  it('should not show CTA when player is ahead', () => {
    // GIVEN
    (useGhostRival as jest.Mock).mockReturnValue({
      rival: { id: 'r1', username: 'Rival', avatar: '', score: 50 },
      player: { score: 200 },
      gap: 150,
      isAhead: true,
      loading: false,
      error: null,
      weekEnd: '2026-03-29',
      refresh: vi.fn(),
    });

    // WHEN
    render(<GhostRivalWidget />);

    // THEN
    expect(screen.queryByText('Play to close the gap!')).not.toBeInTheDocument();
  });

  it('should have accessible region role and label', () => {
    // GIVEN
    (useGhostRival as jest.Mock).mockReturnValue({
      rival: { id: 'r1', username: 'Rival', avatar: '', score: 50 },
      player: { score: 100 },
      gap: 50,
      isAhead: true,
      loading: false,
      error: null,
      weekEnd: '2026-03-29',
      refresh: vi.fn(),
    });

    // WHEN
    render(<GhostRivalWidget />);

    // THEN
    const widget = screen.getByTestId('ghost-rival-widget');
    expect(widget).toHaveAttribute('role', 'region');
    expect(widget).toHaveAttribute('aria-label', 'Ghost Rival');
  });
});
