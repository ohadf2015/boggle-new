
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const roster = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown, p?: Record<string, unknown>) => {
      const params = (typeof a === 'object' ? a : p) as Record<string, unknown> | undefined;
      return params ? `${k}:${JSON.stringify(params)}` : k;
    },
    language: 'en',
  }),
}));
vi.mock('../useClassRoster', () => ({ useClassRoster: () => roster() }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { GetStudentsInCard } from '../GetStudentsInCard';

const CLASS = { id: 'c1', name: 'Period 3', join_code: 'AB12CD', member_count: 2 };

describe('<GetStudentsInCard> — roster-row action slot', () => {
  beforeEach(() => {
    roster.mockReturnValue({ students: [{ id: 's1', name: 'Ava', avatar: null }], loading: false, arrivals: [] });
  });

  it('Given students and a roster action, Then the action sits in the roster row and the count steps aside on phones', () => {
    render(<GetStudentsInCard classroom={CLASS} onOpenProjector={vi.fn()} rosterAction={<button data-testid="inline-cta" />} />);
    const row = screen.getByTestId('hq-roster-row');
    expect(row).toContainElement(screen.getByTestId('inline-cta'));
    expect(row).toContainElement(screen.getByTestId('hq-joined-count'));
    expect(screen.getByTestId('hq-joined-count').parentElement?.className).toMatch(/max-sm:hidden/);
  });

  it('Given no roster action, Then the count shows on every width', () => {
    render(<GetStudentsInCard classroom={CLASS} onOpenProjector={vi.fn()} />);
    expect(screen.getByTestId('hq-joined-count').parentElement?.className ?? '').not.toMatch(/max-sm:hidden/);
  });
});
