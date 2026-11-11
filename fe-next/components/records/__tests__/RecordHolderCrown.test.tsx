import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/lib/records/useWorldRecords', () => ({
  useWorldRecords: () => ({
    status: 'ready',
    retry: vi.fn(),
    records: [
      { recordKey: 'blast', holderId: 'u2' },
      { recordKey: 'tower', holderId: 'u2' },
      { recordKey: 'single', holderId: 'u3' },
    ],
  }),
}));

import { RecordHolderCrown } from '../RecordHolderCrown';

describe('RecordHolderCrown', () => {
  it('shows a crown labelled with how many world records the player holds', () => {
    render(<RecordHolderCrown userId="u2" />);
    expect(screen.getByLabelText('worldRecords.crown.label {"count":2}')).toBeTruthy();
  });

  it('shows nothing for a player without a record or without an id', () => {
    const { container, rerender } = render(<RecordHolderCrown userId="u9" />);
    expect(container.innerHTML).toBe('');
    rerender(<RecordHolderCrown userId={null} />);
    expect(container.innerHTML).toBe('');
  });
});
