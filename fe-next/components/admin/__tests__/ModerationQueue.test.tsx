/**
 * Tests for ModerationQueue component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { ModerationQueue } from '../moderation/ModerationQueue';

const mockItems = [
  { id: '1', word: 'flurb', language: 'en', status: 'pending', submission_count: 5, created_at: '2026-03-14T12:00:00Z' },
  { id: '2', word: 'zxqwk', language: 'he', status: 'flagged', submission_count: 3, created_at: '2026-03-14T10:00:00Z' },
];

describe('ModerationQueue', () => {
  it('should render queue items', () => {
    render(<ModerationQueue items={mockItems} total={2} onAction={vi.fn()} />);
    expect(screen.getByText('flurb')).toBeInTheDocument();
    expect(screen.getByText('zxqwk')).toBeInTheDocument();
  });

  it('should show total count', () => {
    render(<ModerationQueue items={mockItems} total={42} onAction={vi.fn()} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should show empty state when no items', () => {
    render(<ModerationQueue items={[]} total={0} onAction={vi.fn()} />);
    expect(screen.getByText('admin.moderation.empty')).toBeInTheDocument();
  });

  it('should show loading when items is null', () => {
    render(<ModerationQueue items={null} total={0} onAction={vi.fn()} />);
    expect(screen.getByTestId('queue-loading')).toBeInTheDocument();
  });
});
