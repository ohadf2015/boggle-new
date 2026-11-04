import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useGameStore } from '@/hooks/gameState';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));

import { StudentWordBank } from '../StudentWordBank';

const GRID = [
  ['S', 'T', 'O', 'R', 'M'],
  ['H', 'A', 'D', 'E', 'W'],
  ['I', 'N', 'L', 'S', 'A'],
  ['V', 'E', 'R', 'T', 'Y'],
  ['O', 'C', 'K', 'B', 'U'],
];

function seed(patch: Record<string, unknown> = {}) {
  act(() => {
    useGameStore.setState({
      letterGrid: GRID,
      gameMode: 'classic',
      gameModeConfirmed: true,
      gameLanguage: 'en',
      foundWords: [],
      ...patch,
    } as never);
  });
}

describe('StudentWordBank — core students see the lesson words to hunt', () => {
  beforeEach(() => seed());

  it('core in a confirmed Classic classroom round: shows the hunt strip with every placed word hidden', () => {
    render(<StudentWordBank level="core" words={['storm', 'shad']} />);
    expect(screen.getByTestId('lesson-target-strip')).toHaveTextContent('education.wordBank.huntTitle:{"found":0,"total":2}');
    expect(screen.queryByText('storm')).not.toBeInTheDocument();
  });

  it('reveals a word the moment the server validates it', () => {
    render(<StudentWordBank level="core" words={['storm', 'shad']} />);
    seed({ foundWords: [{ word: 'storm', isValid: true, score: 5, timestamp: 1 }] });
    expect(screen.getByText('storm')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-target-strip')).toHaveTextContent('education.wordBank.huntTitle:{"found":1,"total":2}');
  });

  it('a new round starts with every chip hidden again', () => {
    seed({ foundWords: [{ word: 'storm', isValid: true, score: 5, timestamp: 1 }] });
    render(<StudentWordBank level="core" words={['storm']} />);
    seed({ foundWords: [] });
    expect(screen.queryByText('storm')).not.toBeInTheDocument();
  });

  it('ARCADE: an empty word bank renders nothing at any level', () => {
    for (const level of ['core', 'support', 'challenge'] as const) {
      const { container, unmount } = render(<StudentWordBank level={level} words={[]} />);
      if (level === 'challenge') expect(screen.queryByTestId('lesson-target-strip')).not.toBeInTheDocument();
      else expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it('a random rematch that resolved to Blast hides the strip', () => {
    seed({ gameMode: 'blast' });
    const { container } = render(<StudentWordBank level="core" words={['storm']} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('support keeps its full word bank and challenge keeps its badge', () => {
    const { unmount } = render(<StudentWordBank level="support" words={['storm']} />);
    expect(screen.getByTestId('student-word-bank')).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-target-strip')).not.toBeInTheDocument();
    unmount();
    render(<StudentWordBank level="challenge" words={['storm']} />);
    expect(screen.getByText('education.wordBank.challengeBadge:{"min":5}')).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-target-strip')).not.toBeInTheDocument();
  });
});
