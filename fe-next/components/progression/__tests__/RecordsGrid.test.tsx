import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { publishRunRecord, __resetRunRecordsForTests } from '@/lib/records/runRecord';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${JSON.stringify(p)}` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));

const db = vi.hoisted(() => ({ row: null as Record<string, unknown> | null, error: null as { message: string } | null }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.row, error: db.error }) }) }),
    }),
  },
}));

import { RecordsGrid } from '../RecordsGrid';

describe('RecordsGrid', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetRunRecordsForTests();
  });

  it('shows one tile per record with the beaten value when known', async () => {
    // Given a longest word and a blast best that beat 250
    localStorage.setItem('blast:best:v1:hard', '300');
    publishRunRecord({ mode: 'blast', value: 300, previous: 250 });
    render(<RecordsGrid profile={{ longest_word: 'quixotic' }} />);
    // Then both tiles render, the blast one naming the old best
    expect(await screen.findByTestId('record-longestWord')).toHaveTextContent('quixotic');
    expect(screen.getByTestId('record-blastBest')).toHaveTextContent('"previous":"250"');
  });

  it('reads the multiplayer win streak columns for a signed-in player', async () => {
    db.row = { mp_best_streak_classic: 4, mp_best_streak_wordhunt: 7 };
    render(<RecordsGrid profile={{}} userId="u1" />);
    expect(await screen.findByTestId('record-mpBestStreak')).toHaveTextContent('7');
  });

  it('a failed streak read still shows the other records', async () => {
    db.row = null;
    db.error = { message: 'boom' };
    render(<RecordsGrid profile={{ longest_word: 'zest' }} userId="u1" />);
    expect(await screen.findByTestId('record-longestWord')).toBeInTheDocument();
    db.error = null;
  });

  it('shows an inviting empty state when there are no records yet', async () => {
    render(<RecordsGrid profile={{}} />);
    expect(await screen.findByText('progression.records.empty')).toBeInTheDocument();
  });
});
