/**
 * WordPactCard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordPactCard } from '../WordPactCard';
import { useWordPact } from '@/hooks/useWordPact';
import { useLanguage } from '@/contexts/LanguageContext';

vi.mock('@/hooks/useWordPact');
vi.mock('@/contexts/LanguageContext');
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));
vi.mock('../PactFriendSelector', () => ({
  PactFriendSelector: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="pact-friend-selector">
      <button onClick={onClose}>close</button>
    </div>
  ),
}));

const mockT = (key: string, params?: Record<string, string>) => {
  const translations: Record<string, string> = {
    'wordPact.title': 'Word Pact',
    'wordPact.formPact': 'Form a Word Pact',
    'wordPact.formDesc': 'Play daily with a friend for bonus XP',
    'wordPact.withFriend': `Pact with ${params?.name ?? ''}`,
    'wordPact.bothPlayed': 'Both played! 1.5x XP tomorrow',
    'wordPact.youPlayed': `You played! ${params?.name ?? ''} hasn't yet`,
    'wordPact.partnerPlayed': `${params?.name ?? ''} played! Your turn`,
    'wordPact.neitherPlayed': 'Neither played yet today',
    'wordPact.dissolve': 'End Pact',
    'wordPact.streak': `${params?.count ?? ''}-day pact streak`,
    'wordPact.you': 'You',
  };
  return translations[key] ?? key;
};

const basePactReturn = {
  pact: null,
  partnerName: '',
  partnerAvatar: null,
  bothPlayed: false,
  youPlayed: false,
  partnerPlayed: false,
  multiplier: 1.0,
  streak: 0,
  loading: false,
  createPact: vi.fn(),
  dissolvePact: vi.fn(),
};

describe('WordPactCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useLanguage as jest.Mock).mockReturnValue({ t: mockT });
  });

  it('returns null when loading', () => {
    (useWordPact as jest.Mock).mockReturnValue({ ...basePactReturn, loading: true });
    const { container } = render(<WordPactCard />);
    expect(container.firstChild).toBeNull();
  });

  it('shows CTA when no active pact', () => {
    (useWordPact as jest.Mock).mockReturnValue(basePactReturn);
    render(<WordPactCard />);

    expect(screen.getByText('Word Pact')).toBeInTheDocument();
    expect(screen.getByTestId('form-pact-btn')).toBeInTheDocument();
  });

  it('opens friend selector when CTA clicked', () => {
    (useWordPact as jest.Mock).mockReturnValue(basePactReturn);
    render(<WordPactCard />);

    fireEvent.click(screen.getByTestId('form-pact-btn'));
    expect(screen.getByTestId('pact-friend-selector')).toBeInTheDocument();
  });

  it('shows active pact with partner name', () => {
    (useWordPact as jest.Mock).mockReturnValue({
      ...basePactReturn,
      pact: { id: 'p1', player1_id: 'a', player2_id: 'b', active: true },
      partnerName: 'Alice',
      youPlayed: true,
      partnerPlayed: false,
      multiplier: 2.0,
      streak: 0,
    });

    render(<WordPactCard />);
    expect(screen.getByText('Pact with Alice')).toBeInTheDocument();
    expect(screen.getByTestId('pact-status')).toHaveTextContent("You played! Alice hasn't yet");
    expect(screen.getByTestId('pact-multiplier')).toHaveTextContent('2x');
  });

  it('shows both-played message and 1.5x multiplier', () => {
    (useWordPact as jest.Mock).mockReturnValue({
      ...basePactReturn,
      pact: { id: 'p1', active: true },
      partnerName: 'Bob',
      bothPlayed: true,
      youPlayed: true,
      partnerPlayed: true,
      multiplier: 1.5,
    });

    render(<WordPactCard />);
    expect(screen.getByTestId('pact-status')).toHaveTextContent('Both played! 1.5x XP tomorrow');
    expect(screen.getByTestId('pact-multiplier')).toHaveTextContent('1.5x');
  });

  it('shows streak when > 0', () => {
    (useWordPact as jest.Mock).mockReturnValue({
      ...basePactReturn,
      pact: { id: 'p1', active: true },
      partnerName: 'Carol',
      streak: 5,
    });

    render(<WordPactCard />);
    expect(screen.getByTestId('pact-streak')).toHaveTextContent('5-day pact streak');
  });

  it('does not show streak when 0', () => {
    (useWordPact as jest.Mock).mockReturnValue({
      ...basePactReturn,
      pact: { id: 'p1', active: true },
      partnerName: 'Dave',
      streak: 0,
    });

    render(<WordPactCard />);
    expect(screen.queryByTestId('pact-streak')).toBeNull();
  });

  it('calls dissolvePact when dissolve button clicked', () => {
    const mockDissolve = vi.fn();
    (useWordPact as jest.Mock).mockReturnValue({
      ...basePactReturn,
      pact: { id: 'p1', active: true },
      partnerName: 'Eve',
      dissolvePact: mockDissolve,
    });

    render(<WordPactCard />);
    fireEvent.click(screen.getByTestId('dissolve-pact-btn'));
    expect(mockDissolve).toHaveBeenCalled();
  });

  it('shows neither-played message', () => {
    (useWordPact as jest.Mock).mockReturnValue({
      ...basePactReturn,
      pact: { id: 'p1', active: true },
      partnerName: 'Frank',
    });

    render(<WordPactCard />);
    expect(screen.getByTestId('pact-status')).toHaveTextContent('Neither played yet today');
  });

  it('shows partner-played message', () => {
    (useWordPact as jest.Mock).mockReturnValue({
      ...basePactReturn,
      pact: { id: 'p1', active: true },
      partnerName: 'Grace',
      partnerPlayed: true,
    });

    render(<WordPactCard />);
    expect(screen.getByTestId('pact-status')).toHaveTextContent('Grace played! Your turn');
  });
});
