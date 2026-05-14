import React from 'react';
import { render, screen } from '@testing-library/react';
import MobileCompactLeaderboard from '../MobileCompactLeaderboard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const makeMotion = (_target: Record<string, unknown>, prop: string) => {
    // eslint-disable-next-line react/display-name
    const Comp = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
      const { initial, animate, exit, variants, whileHover, whileTap, transition, ...rest } = props;
      return React.createElement(prop, { ...rest, ref });
    });
    return Comp;
  };
  return {
    ...vi.importActual('framer-motion'),
    useReducedMotion: () => true,
    m: new Proxy({}, { get: makeMotion }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

describe('MobileCompactLeaderboard', () => {
  const mockParticipants = [
    { name: 'Player1', score: 247, isCurrentPlayer: true },
    { name: 'Bot1', score: 198, isBot: true },
    { name: 'Bot2', score: 156, isBot: true },
  ];

  it('renders top 3 participants as text rows', () => {
    render(<MobileCompactLeaderboard participants={mockParticipants} />);

    expect(screen.getByText('Player1')).toBeInTheDocument();
    expect(screen.getByText('Bot1')).toBeInTheDocument();
    expect(screen.getByText('Bot2')).toBeInTheDocument();
  });

  it('displays scores for each participant', () => {
    render(<MobileCompactLeaderboard participants={mockParticipants} />);

    expect(screen.getByText('247')).toBeInTheDocument();
    expect(screen.getByText('198')).toBeInTheDocument();
    expect(screen.getByText('156')).toBeInTheDocument();
  });

  it('highlights current player', () => {
    const { container } = render(<MobileCompactLeaderboard participants={mockParticipants} />);

    // Find the row containing Player1 - it should have the highlight class
    const rows = container.querySelectorAll('.flex.items-center.justify-between');
    const currentPlayerRow = Array.from(rows).find(row =>
      row.textContent?.includes('Player1')
    );
    expect(currentPlayerRow).toHaveClass('bg-neo-cyan/10');
  });

  it('shows rank badges with numbers', () => {
    render(<MobileCompactLeaderboard participants={mockParticipants} />);

    // Neo-brutalist rank badges show numbers 1, 2, 3 instead of emoji medals
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows all participants (full ranked leaderboard)', () => {
    const manyParticipants = [
      ...mockParticipants,
      { name: 'Bot3', score: 100 },
      { name: 'Bot4', score: 50 },
    ];
    render(<MobileCompactLeaderboard participants={manyParticipants} />);

    expect(screen.getByText('Bot3')).toBeInTheDocument();
    expect(screen.getByText('Bot4')).toBeInTheDocument();
  });
});
