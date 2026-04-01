import { render, screen } from '@testing-library/react';
import { WordHuntDeathRecap, getDeathLesson, type DeathRecapStats } from '../WordHuntDeathRecap';

// Mock AdaptiveMotion to render plain divs
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, ...rest } = props;
      return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const mockT = (key: string, params?: Record<string, string | number>) => {
  if (params) {
    let result = key;
    for (const [k, v] of Object.entries(params)) {
      result += ` ${k}=${v}`;
    }
    return result;
  }
  return key;
};

const baseStats: DeathRecapStats = {
  cause: 'lifeDrain',
  wordsFound: 8,
  wrongGuesses: 1,
  survivalSeconds: 45,
  totalPlayers: 4,
  eliminationOrder: 2,
  avgWordLength: 4.5,
};

describe('WordHuntDeathRecap', () => {
  it('renders the death recap card', () => {
    render(<WordHuntDeathRecap stats={baseStats} t={mockT} />);
    expect(screen.getByTestId('death-recap')).toBeInTheDocument();
  });

  it('shows cause of death for life drain', () => {
    render(<WordHuntDeathRecap stats={baseStats} t={mockT} />);
    expect(screen.getByText('wordHuntDeathRecap.causeLifeDrain')).toBeInTheDocument();
  });

  it('shows cause of death for wrong guess', () => {
    render(<WordHuntDeathRecap stats={{ ...baseStats, cause: 'wrongGuess' }} t={mockT} />);
    expect(screen.getByText('wordHuntDeathRecap.causeWrongGuess')).toBeInTheDocument();
  });

  it('displays words found stat', () => {
    render(<WordHuntDeathRecap stats={baseStats} t={mockT} />);
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('displays wrong guesses stat', () => {
    render(<WordHuntDeathRecap stats={{ ...baseStats, wrongGuesses: 3 }} t={mockT} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('formats survival time as seconds when under 60', () => {
    render(<WordHuntDeathRecap stats={baseStats} t={mockT} />);
    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('formats survival time as MM:SS when over 60', () => {
    render(<WordHuntDeathRecap stats={{ ...baseStats, survivalSeconds: 95 }} t={mockT} />);
    expect(screen.getByText('1:35')).toBeInTheDocument();
  });

  it('shows elimination order', () => {
    render(<WordHuntDeathRecap stats={baseStats} t={mockT} />);
    expect(screen.getByText(/eliminatedOrder.*order=2.*total=4/)).toBeInTheDocument();
  });

  it('shows a lesson tip', () => {
    render(<WordHuntDeathRecap stats={baseStats} t={mockT} />);
    // Should show some lesson key
    const lessonEl = screen.getByText(/wordHuntDeathRecap\.lesson/);
    expect(lessonEl).toBeInTheDocument();
  });
});

describe('getDeathLesson', () => {
  it('returns wrongGuess lesson when cause is wrongGuess', () => {
    const result = getDeathLesson({ ...baseStats, cause: 'wrongGuess', wrongGuesses: 2 });
    expect(result.key).toBe('wordHuntDeathRecap.lessonWrongGuess');
    expect(result.params?.penalty).toBe(15);
  });

  it('returns noWords lesson when fewer than 3 words found', () => {
    const result = getDeathLesson({ ...baseStats, wordsFound: 1 });
    expect(result.key).toBe('wordHuntDeathRecap.lessonNoWords');
  });

  it('returns shortWords lesson when avg word length < 4', () => {
    const result = getDeathLesson({ ...baseStats, wordsFound: 6, avgWordLength: 3.2 });
    expect(result.key).toBe('wordHuntDeathRecap.lessonShortWords');
  });

  it('returns tooManyGuesses when 3+ wrong guesses with life drain', () => {
    const result = getDeathLesson({ ...baseStats, wrongGuesses: 4 });
    expect(result.key).toBe('wordHuntDeathRecap.lessonTooManyGuesses');
    expect(result.params?.cost).toBe(60);
  });

  it('returns pacing lesson as default fallback', () => {
    const result = getDeathLesson(baseStats);
    expect(result.key).toBe('wordHuntDeathRecap.lessonPacing');
  });
});
