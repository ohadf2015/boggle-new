import React from 'react';
import { render, screen } from '@testing-library/react';

const mockT = (key: string, params?: Record<string, unknown>) => {
  if (key === 'adventure.chapterComplete' && params?.chapter) {
    return `Chapter ${params.chapter} Complete`;
  }
  return key;
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));

import MilestoneDivider from '../MilestoneDivider';

describe('MilestoneDivider', () => {
  it('renders trophy icon', () => {
    render(<MilestoneDivider chapter={1} />);
    expect(screen.getByTestId('milestone-trophy')).toBeInTheDocument();
  });

  it('renders chapter complete text', () => {
    render(<MilestoneDivider chapter={1} />);
    expect(screen.getByText('Chapter 1 Complete')).toBeInTheDocument();
  });

  it('renders correct chapter number', () => {
    render(<MilestoneDivider chapter={2} />);
    expect(screen.getByText('Chapter 2 Complete')).toBeInTheDocument();
  });

  it('has col-span-full class', () => {
    const { container } = render(<MilestoneDivider chapter={1} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('col-span-full');
  });
});
