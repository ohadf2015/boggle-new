import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomBossOutcome } from '../ClassroomBossOutcome';
import type { VocabQuizBoss } from '@/shared/types/vocabQuiz';

const t = (key: string) => key;
const won = { defeated: true, hp: 0 } as unknown as VocabQuizBoss;

describe('ClassroomBossOutcome tone', () => {
  it('given the teacher wall, then a defeated boss reads on navy-light, not a lime block', () => {
    render(<ClassroomBossOutcome boss={won} tone="calm" t={t} />);
    const card = screen.getByTestId('boss-outcome');
    expect(card.className).not.toMatch(/(^|\s)bg-neo-lime(\s|$)/);
    expect(card.className).toMatch(/(^|\s)bg-neo-navy-light(\s|$)/);
    expect(card.innerHTML).not.toMatch(/\buppercase\b/);
  });

  it('given a student phone, then the defeated boss keeps its lime win card', () => {
    render(<ClassroomBossOutcome boss={won} compact t={t} />);
    expect(screen.getByTestId('boss-outcome').className).toMatch(/(^|\s)bg-neo-lime(\s|$)/);
  });
});
