import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const mockLanguage = vi.fn(() => 'he');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: mockLanguage(), t: (k: string) => k }),
}));

import PracticeMiniDemo from '../PracticeMiniDemo';

describe('PracticeMiniDemo locale-aware letters', () => {
  it('renders Hebrew letters in HE locale (wheelRush)', () => {
    mockLanguage.mockReturnValue('he');
    render(<PracticeMiniDemo mode="wheelRush" />);
    expect(screen.getByText('י')).toBeInTheDocument();
    expect(screen.getByText('ש')).toBeInTheDocument();
    expect(screen.getByText('ל')).toBeInTheDocument();
    expect(screen.getByText('ו')).toBeInTheDocument();
    // Demo uses non-final mem (matches main letter pool, gridConstants.ts)
    expect(screen.getByText('מ')).toBeInTheDocument();
    expect(screen.queryByText('ם')).toBeNull();
    expect(screen.queryByText('E')).toBeNull();
    expect(screen.queryByText('C')).toBeNull();
  });

  it('does NOT include Hebrew final letters anywhere (classic)', () => {
    mockLanguage.mockReturnValue('he');
    render(<PracticeMiniDemo mode="classic" />);
    ['ם', 'ץ', 'ך', 'ן', 'ף'].forEach((sofit) => {
      expect(screen.queryByText(sofit)).toBeNull();
    });
  });

  it('renders Japanese hiragana in JA locale (wheelRush)', () => {
    mockLanguage.mockReturnValue('ja');
    render(<PracticeMiniDemo mode="wheelRush" />);
    expect(screen.getByText('い')).toBeInTheDocument();
    expect(screen.getByText('ね')).toBeInTheDocument();
  });

  it('renders English letters in EN locale (wheelRush)', () => {
    mockLanguage.mockReturnValue('en');
    render(<PracticeMiniDemo mode="wheelRush" />);
    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('classic/wordHunt demo letters are also locale-aware (HE)', () => {
    mockLanguage.mockReturnValue('he');
    render(<PracticeMiniDemo mode="classic" />);
    expect(screen.queryByText('C')).toBeNull();
    expect(screen.queryByText('A')).toBeNull();
  });
});
