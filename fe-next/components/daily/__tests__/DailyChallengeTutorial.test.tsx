import React from 'react';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { drag, release, stubBoardLayout } from '@/components/board/__tests__/boardTestUtils';

vi.mock('framer-motion', () => {
  const strip = (props: Record<string, unknown>) => {
    const { initial: _i, animate: _a, exit: _e, transition: _t, variants: _v, whileTap: _wt, layout: _l, ...dom } = props;
    return dom;
  };
  return {
    m: {
      div: ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) => <div {...strip(p)}>{children}</div>,
      span: ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) => <span {...strip(p)}>{children}</span>,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

const lang = vi.hoisted(() => ({ language: 'en', dir: 'ltr' }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: lang.language, dir: lang.dir, setLanguage: vi.fn() }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => new Proxy({}, { get: () => vi.fn() }),
}));

vi.mock('@/utils/hapticFeedback', () => ({ triggerHaptic: vi.fn() }));

import { DailyChallengeTutorial } from '../DailyChallengeTutorial';

let restoreLayout: () => void;
beforeEach(() => {
  restoreLayout = stubBoardLayout();
  lang.language = 'en';
  lang.dir = 'ltr';
});
afterEach(() => restoreLayout());

const setup = () => {
  const onComplete = vi.fn();
  const onSkip = vi.fn();
  const utils = render(<DailyChallengeTutorial onComplete={onComplete} onSkip={onSkip} />);
  return { onComplete, onSkip, ...utils };
};

// en demo: C(0,0) → A(0,1) → T(1,1) against hidden CRAB.
const traceCat = (container: HTMLElement) => {
  act(() => {
    drag(container, [[0, 0], [0, 1], [1, 1]], 'touch');
    release(container, 'touch');
  });
};

const tiles = () => within(screen.getByTestId('howto-feedback-word')).getAllByTestId('howto-tile');

describe('DailyChallengeTutorial (learn by doing)', () => {
  it('given a first open, then step 1 shows a real board and the word to trace', () => {
    setup();
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell')).toHaveLength(9);
    expect(screen.getByText('tutorial.wordHunt.howto.boardTitle')).toBeInTheDocument();
    expect(screen.getByTestId('howto-trace-word').textContent).toBe('CAT');
  });

  it('given step 1, when the player drags the word by touch, then the feedback step shows coloured letters', () => {
    const { container } = setup();
    traceCat(container);
    expect(screen.getByText('tutorial.wordHunt.howto.feedbackTitle')).toBeInTheDocument();
    expect(tiles().map((el) => [el.textContent, el.dataset.feedback])).toEqual([
      ['C', 'green'],
      ['A', 'yellow'],
      ['T', 'gray'],
    ]);
  });

  it('given the feedback step, then the hidden word reveals the green clue in place', () => {
    const { container } = setup();
    traceCat(container);
    const boxes = within(screen.getByTestId('howto-hidden-word')).getAllByTestId('howto-hidden-box');
    expect(boxes).toHaveLength(4);
    expect(boxes.map((b) => b.textContent)).toEqual(['C', '?', '?', '?']);
  });

  it('given step 1, when the player traces a different word, then it stays on the board with a nudge', () => {
    const { container } = setup();
    act(() => {
      drag(container, [[1, 0], [1, 1], [1, 2]], 'touch');
      release(container, 'touch');
    });
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toContain('tutorial.wordHunt.howto.tryAgain');
  });

  it('given the feedback step, when Next then Let’s play are pressed, then the goal shows and onComplete fires', () => {
    const { container, onComplete } = setup();
    traceCat(container);
    fireEvent.click(screen.getByRole('button', { name: 'tutorial.wordHunt.howto.next' }));
    expect(screen.getByText('tutorial.wordHunt.howto.goalTitle')).toBeInTheDocument();
    expect(screen.getByText('tutorial.wordHunt.howto.goalLife')).toBeInTheDocument();
    expect(screen.getByText('tutorial.wordHunt.howto.goalClues')).toBeInTheDocument();
    expect(screen.getByText('tutorial.wordHunt.triesRule.keyInsight')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'tutorial.wordHunt.howto.play' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it.each([0, 1, 2])('given step index %i, when Skip is pressed, then onSkip fires', (stepsAhead) => {
    const { container, onSkip } = setup();
    if (stepsAhead >= 1) traceCat(container);
    if (stepsAhead >= 2) fireEvent.click(screen.getByRole('button', { name: 'tutorial.wordHunt.howto.next' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.skip' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('given Hebrew, then the feedback word reads right-to-left', () => {
    lang.language = 'he';
    lang.dir = 'rtl';
    const { container } = setup();
    act(() => {
      drag(container, [[0, 2], [0, 1], [1, 1]], 'touch');
      release(container, 'touch');
    });
    expect(screen.getByTestId('howto-feedback-word').getAttribute('dir')).toBe('rtl');
    expect(tiles().map((el) => el.dataset.feedback)).toEqual(['green', 'yellow', 'gray']);
  });

  it('renders a dark fullscreen overlay above the ready screen’s portaled play CTA', () => {
    const { container } = setup();
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.className).toContain('z-[120]');
    expect(overlay.className).toContain('bg-neo-navy');
    expect(overlay.className).not.toContain('bg-neo-cream');
    expect(overlay.getAttribute('role')).toBe('dialog');
  });
});
