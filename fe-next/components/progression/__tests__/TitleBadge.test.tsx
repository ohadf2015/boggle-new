import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TitleBadge } from '../TitleBadge';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

describe('TitleBadge', () => {
  it('renders nothing without a title', () => {
    const { container } = render(<TitleBadge title={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a level title through the landing.home.titles table', () => {
    render(<TitleBadge title="WORD_SEEKER" />);
    expect(screen.getByTestId('title-badge')).toHaveTextContent('landing.home.titles.WORD_SEEKER');
  });

  it('shows achievement titles from the progression namespace', () => {
    render(<TitleBadge title="NEMESIS" />);
    expect(screen.getByTestId('title-badge')).toHaveTextContent('progression.titles.NEMESIS');
  });

  it('announce mode adds the "new title" kicker', () => {
    render(<TitleBadge title="NEMESIS" announce />);
    expect(screen.getByText('progression.titles.newTitle')).toBeInTheDocument();
  });
});
