import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { publishRunRecord, evaluateAgainstLedger, __resetRunRecordsForTests } from '@/lib/records/runRecord';
import { NewRecordBanner } from '../NewRecordBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${JSON.stringify(p)}` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));

describe('NewRecordBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetRunRecordsForTests();
  });

  it('shows NEW RECORD with the beaten best when the mode published one', () => {
    // Given quick play published a run that beat 64
    publishRunRecord({ mode: 'quickPlay', value: 80, previous: 64 });
    render(<NewRecordBanner mode="quickPlay" score={80} />);
    // Then the banner is loud and names the old best
    expect(screen.getByTestId('new-record-banner')).toBeInTheDocument();
    expect(screen.getByText('progression.records.newRecord')).toBeInTheDocument();
    expect(screen.getByTestId('new-record-banner')).toHaveTextContent('"previous":"64"');
  });

  it('renders when the record is published after mount', () => {
    render(<NewRecordBanner mode="blast" score={300} />);
    expect(screen.queryByTestId('new-record-banner')).toBeNull();
    act(() => {
      publishRunRecord({ mode: 'blast', value: 300, previous: 250 });
    });
    expect(screen.getByTestId('new-record-banner')).toBeInTheDocument();
  });

  it('falls back to the device ledger for modes with no stored best', () => {
    // Given an earlier multiplayer game of 100
    evaluateAgainstLedger('multiplayer', 100);
    render(<NewRecordBanner mode="multiplayer" score={140} />);
    expect(screen.getByTestId('new-record-banner')).toHaveTextContent('"previous":"100"');
  });

  it('a record published by an earlier run never shows on a later run', () => {
    // Given run A set a blast record of 300
    publishRunRecord({ mode: 'blast', value: 300, previous: 250 });
    // When run B (lower score) shows its results before its own publish lands
    render(<NewRecordBanner mode="blast" score={120} />);
    // Then run A's banner is not shown
    expect(screen.queryByTestId('new-record-banner')).toBeNull();
  });

  it('first-ever run shows nothing', () => {
    render(<NewRecordBanner mode="multiplayer" score={140} />);
    expect(screen.queryByTestId('new-record-banner')).toBeNull();
  });

  it('modes that publish their own best never use the ledger', () => {
    evaluateAgainstLedger('tower', 10);
    render(<NewRecordBanner mode="tower" score={40} />);
    expect(screen.queryByTestId('new-record-banner')).toBeNull();
  });
});
