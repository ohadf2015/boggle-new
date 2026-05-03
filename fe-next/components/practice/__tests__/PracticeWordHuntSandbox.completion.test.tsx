/**
 * Integration test: solving the wordHunt target writes to practice progress
 * AND mounts the completion banner. Verifies the seam between sandbox state,
 * progress storage, and banner visibility.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

import PracticeWordHuntSandbox from '../PracticeWordHuntSandbox';
import { isPracticeModeComplete } from '@/lib/practice/practiceProgress';

beforeEach(() => {
  window.localStorage.clear();
});

describe('PracticeWordHuntSandbox completion integration', () => {
  it('renders the complete banner + writes progress when target is solved', async () => {
    render(<PracticeWordHuntSandbox />);

    expect(screen.queryByTestId('practice-complete-banner')).toBeNull();
    expect(isPracticeModeComplete('wordHunt', 'en')).toBe(false);

    // Curated EN target = "STAR", pool = ['S','T','A','R','O','E'] in that order.
    const tap = (testId: string) => fireEvent.click(screen.getByTestId(testId));
    tap('practice-letter-0'); // S
    tap('practice-letter-1'); // T
    tap('practice-letter-2'); // A
    tap('practice-letter-3'); // R
    fireEvent.click(screen.getByRole('button', { name: 'practice.wordHunt.submit' }));

    await waitFor(() => {
      expect(screen.getByTestId('practice-complete-banner')).toBeInTheDocument();
    });
    expect(isPracticeModeComplete('wordHunt', 'en')).toBe(true);
  });
});
