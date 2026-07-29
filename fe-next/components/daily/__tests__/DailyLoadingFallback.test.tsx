/**
 * Tests for DailyLoadingFallback — localized loader for Word Hunt / Word Wheel
 * dynamic imports. Regression: hardcoded English strings like "Loading Word Hunt..."
 * rendered for all locales. Must resolve via t() from LanguageContext.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DailyLoadingFallback } from '../DailyLoadingFallback';

const translations: Record<string, Record<string, string>> = {
  en: { 'daily.loadingWordHunt': 'Loading Word Hunt...', 'daily.loadingWordWheel': 'Loading Word Wheel...' },
  he: { 'daily.loadingWordHunt': 'טוען ציד מילים...', 'daily.loadingWordWheel': 'טוען גלגל מילים...' },
};

let currentLang: 'en' | 'he' = 'en';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => translations[currentLang]?.[key] ?? key,
    language: currentLang,
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ prefersReducedMotion: true, enableComplexAnimations: false }),
}));

describe('DailyLoadingFallback', () => {
  beforeEach(() => { currentLang = 'en'; });

  it('renders localized Word Hunt loading text in English', () => {
    render(<DailyLoadingFallback mode="wordHunt" />);
    expect(screen.getByText('Loading Word Hunt...')).toBeInTheDocument();
  });

  it('renders localized Word Wheel loading text in English', () => {
    render(<DailyLoadingFallback mode="wordWheel" />);
    expect(screen.getByText('Loading Word Wheel...')).toBeInTheDocument();
  });

  it('renders localized Word Hunt loading text in Hebrew', () => {
    currentLang = 'he';
    render(<DailyLoadingFallback mode="wordHunt" />);
    expect(screen.getByText('טוען ציד מילים...')).toBeInTheDocument();
  });

  it('renders localized Word Wheel loading text in Hebrew', () => {
    currentLang = 'he';
    render(<DailyLoadingFallback mode="wordWheel" />);
    expect(screen.getByText('טוען גלגל מילים...')).toBeInTheDocument();
  });
});
