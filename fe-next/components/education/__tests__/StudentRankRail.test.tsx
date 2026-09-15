import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { StudentRankRail } from '../StudentRankRail';
import type { WordFeedback } from '@/components/game/WordFormingArea';

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
vi.mock('next/image', () => ({
  // Forward every prop: `data-testid` and `alt` are what the assertions read.
  default: ({ src, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} src={typeof src === 'string' ? src : ''} />
  ),
}));

const t = (key: string, _fallback?: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const board = [
  { username: 'Maya', score: 50 },
  { username: 'Me', score: 38 },
  { username: 'Sam', score: 20 },
  { username: 'Ana', score: 4 },
];

const RAIL_SRC = readFileSync(
  join(process.cwd(), 'components/education/StudentRankRail.tsx'),
  'utf8',
);

describe('StudentRankRail — what a classroom student sees while the round runs', () => {
  it('shows my own score', () => {
    render(<StudentRankRail leaderboard={board} currentUsername="Me" wordsFound={6} t={t} />);
    expect(screen.getByTestId('student-own-progress')).toHaveTextContent('38');
  });

  it('shows how many words I have found — progress that is mine alone', () => {
    render(<StudentRankRail leaderboard={board} currentUsername="Me" wordsFound={6} t={t} />);
    expect(screen.getByTestId('student-own-progress')).toHaveTextContent('6');
  });

  it('shows one nearby classmate and the gap, not the class standings', () => {
    render(<StudentRankRail leaderboard={board} currentUsername="Me" wordsFound={6} t={t} />);
    const chip = screen.getByTestId('student-rival-chip');
    expect(chip).toHaveTextContent('Maya');
    expect(chip).toHaveTextContent('12');
    // Nobody else on the board is named.
    expect(screen.queryByText(/Sam|Ana/)).toBeNull();
  });

  it('NEVER prints an absolute position — no "#4", no "/ 28"', () => {
    const { container } = render(
      <StudentRankRail leaderboard={board} currentUsername="Me" wordsFound={6} t={t} />,
    );
    expect(container.textContent).not.toMatch(/#\s*\d/);
    expect(container.textContent).not.toMatch(/\/\s*4\b/);
    expect(container.textContent).not.toMatch(/multiplayer\.rank\./);
  });

  it('carries no "someone passed you" alert — the live demotion cue is gone', () => {
    // useOvertakeAlert is the component MobileRankIndicator uses for the red
    // `role="alert"` overtake toast. A classroom rail must not import it.
    expect(RAIL_SRC).not.toMatch(/useOvertakeAlert/);
    render(<StudentRankRail leaderboard={board} currentUsername="Me" wordsFound={6} t={t} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders nothing rather than a lonely score when I am not on the board', () => {
    const { container } = render(
      <StudentRankRail leaderboard={board} currentUsername="Ghost" wordsFound={0} t={t} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('still shows my progress in a class of one, with no rival chip', () => {
    render(
      <StudentRankRail
        leaderboard={[{ username: 'Me', score: 9 }]}
        currentUsername="Me"
        wordsFound={2}
        t={t}
      />,
    );
    expect(screen.getByTestId('student-own-progress')).toHaveTextContent('9');
    expect(screen.queryByTestId('student-rival-chip')).toBeNull();
  });

  describe('the mascot reaction', () => {
    const withFeedback = (fb: WordFeedback | null) =>
      render(
        <StudentRankRail
          leaderboard={board}
          currentUsername="Me"
          wordsFound={6}
          feedback={fb}
          t={t}
        />,
      );

    it('celebrates an accepted word', () => {
      withFeedback({ id: 'a', type: 'accepted', word: 'HOUSE', score: 5, timestamp: 1 });
      expect(screen.getByTestId('student-mascot').getAttribute('src')).toContain('celebration');
      expect(screen.getByTestId('student-mascot-message')).toHaveTextContent(
        'education.student.feel.correct',
      );
    });

    it('marks a lesson word as the teacher’s word, with the server’s bonus', () => {
      withFeedback({
        id: 'b',
        type: 'accepted',
        word: 'RIVER',
        score: 9,
        fromLesson: true,
        lessonBonus: 5,
        timestamp: 2,
      });
      expect(screen.getByTestId('student-mascot-message')).toHaveTextContent(
        'education.student.feel.lessonWord',
      );
    });

    it('answers a rejected word without shaming and without a number', () => {
      withFeedback({ id: 'c', type: 'rejected', word: 'XQZ', timestamp: 3 });
      expect(screen.getByTestId('student-mascot').getAttribute('src')).toContain('oops');
      expect(screen.getByTestId('student-mascot-message')).toHaveTextContent(
        'education.student.feel.tryAgain',
      );
    });

    it('is idle, not blank, with no feedback yet', () => {
      withFeedback(null);
      expect(screen.getByTestId('student-mascot')).toBeInTheDocument();
      expect(screen.queryByTestId('student-mascot-message')).toBeNull();
    });
  });

  describe('surface rules this repo has shipped bugs against', () => {
    it('hardcodes the dark ground instead of the cream/dark pair that flashes', () => {
      // Comments are stripped first — this file NAMES the bad pair in its own
      // doc block to explain why it avoids it, and that must not read as a hit.
      const code = RAIL_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(code).not.toMatch(/bg-neo-cream\s+dark:bg-neo-navy/);
      expect(code).not.toMatch(/dark:bg-neo/);
    });

    it('puts no black border on a navy fill (1.23:1 — below the 3:1 floor)', () => {
      expect(RAIL_SRC).not.toMatch(/bg-neo-navy[^"'`]*border-neo-black/);
    });

    it('animates through AdaptiveMotion so prefers-reduced-motion is honoured', () => {
      expect(RAIL_SRC).toMatch(/AdaptiveMotion/);
      expect(RAIL_SRC).not.toMatch(/\bm\.div\b/);
    });

    it('never starts a full-width surface at opacity 0 (mobile entrance flash)', () => {
      expect(RAIL_SRC).not.toMatch(/initial=\{\{\s*opacity:\s*0\s*\}\}/);
    });

    it('routes every user-facing string through t()', () => {
      // Any bare double-quoted sentence in JSX text position would be a raw string.
      expect(RAIL_SRC).not.toMatch(/>\s*[A-Z][a-z]+ [a-z]+[.!]?\s*</);
    });
  });
});
