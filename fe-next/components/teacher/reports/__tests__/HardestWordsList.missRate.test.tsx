import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));

import { HardestWordsList } from '../HardestWordsList';

describe('<HardestWordsList> percent', () => {
  it('labels the big number as the share of answers missed, so it cannot read as a score', () => {
    render(
      <HardestWordsList
        words={[{ word: 'travel', display: 'travel', attempts: 15, missed: 10, missRate: 67, studentsMissing: 5, studentsAsked: 5 }]}
      />,
    );
    expect(screen.getByTestId('report-word-missrate')).toHaveTextContent('eg2Polish.words.missRate:67');
  });

  it('Given one student was asked, When the row renders, Then the count uses the singular form', () => {
    render(
      <HardestWordsList
        words={[{ word: 'earth', display: 'earth', attempts: 1, missed: 1, missRate: 100, studentsMissing: 1, studentsAsked: 1 }]}
      />,
    );
    expect(document.body.textContent).toContain('eduPro.mastery.studentsMissing_one:1,1');
  });
});
