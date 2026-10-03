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
});
