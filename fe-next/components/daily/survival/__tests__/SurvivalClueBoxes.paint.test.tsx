import React from 'react';
import { render } from '@testing-library/react';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { AccumulatedClue } from '../types';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, ...dom } = props;
      void initial; void animate; void exit; void transition; void whileHover; void whileTap;
      return <div {...dom}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const props = {
  currentHint: { level: 0, hint: '_ _ _ _ _', revealed: 0, unlockCost: 0 },
  targetWord: 'APPLE',
  attempts: [] as { word: string; feedback: LetterFeedback[]; timestamp: number }[],
  accumulatedClues: new Map<number, AccumulatedClue>(),
  revealedLetters: new Set<number>(),
  knownLetters: new Set<string>(),
  latestAttemptFeedback: null as LetterFeedback[] | null,
  isClueGaining: false,
  skipAnimations: true,
  gameDir: 'ltr' as const,
  t: (key: string) => key,
};

describe('SurvivalClueBoxes paint cost', () => {
  it.each([false, true])('Given the pulsing clue container (overlay %s), Then it only eases its border and shadow, never layout or the entrance motion', (showFeedbackOverlay) => {
    const { container } = render(<SurvivalClueBoxes {...props} showFeedbackOverlay={showFeedbackOverlay} />);
    const box = container.firstElementChild as HTMLElement;
    expect(box.className).not.toMatch(/\btransition-all\b/);
    expect(box.className).toContain('transition-[border-color,box-shadow]');
  });
});
