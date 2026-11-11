import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const pro = vi.hoisted(() => ({ value: { hasPro: false, loading: false } as Record<string, unknown> }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro.value }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/components/teacher/pro/ProInsightLink', () => ({
  ProInsightLink: ({ placement, label }: { placement: string; label: string }) => <a data-testid={`pro-insight-link-${placement}`} href="#">{label}</a>,
}));

import { ResultsPrimaryActions } from '../ResultsPrimaryActions';

const words = [{ word: 'pear', found: 0, of: 3 }, { word: 'plum', found: 1, of: 3 }, { word: 'fig', found: 1, of: 3 }];
const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

beforeEach(() => {
  pro.value = { hasPro: false, loading: false };
});

describe('ResultsPrimaryActions free round insight', () => {
  it('given a free teacher, when the round ends, then the 3 hardest words show with one quiet Pro link and no Unlock button', () => {
    render(<ResultsPrimaryActions language="en" onRematch={vi.fn()} t={t} hardestWords={words} />);
    expect(screen.getAllByTestId('round-hardest-word').map((n) => n.textContent)).toEqual([
      expect.stringContaining('pear'), expect.stringContaining('plum'), expect.stringContaining('fig'),
    ]);
    expect(screen.getAllByTestId(/pro-insight-link-/)).toHaveLength(1);
    expect(screen.getByTestId('pro-insight-link-results_hardest_words')).toBeInTheDocument();
    expect(screen.queryByTestId('unlock-report-upgrade-cta')).toBeNull();
  });

  it('given a free teacher, when the round ends, then Rematch is still the only loud button and comes first', () => {
    render(<ResultsPrimaryActions language="en" onRematch={vi.fn()} t={t} hardestWords={words} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute('data-testid', 'rematch-same-list');
    const insight = screen.getByTestId('round-hardest-words');
    expect(buttons[0].compareDocumentPosition(insight) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('given a free teacher whose class found every word, when the round ends, then only the quiet Pro link shows', () => {
    render(<ResultsPrimaryActions language="en" onRematch={vi.fn()} t={t} hardestWords={[]} />);
    expect(screen.queryByTestId('round-hardest-words')).toBeNull();
    expect(screen.getByTestId('pro-insight-link-results_hardest_words')).toBeInTheDocument();
  });

  it('given a Pro teacher, when the round ends, then the full report link shows and no free insight', () => {
    pro.value = { hasPro: true, loading: false };
    render(<ResultsPrimaryActions language="en" onRematch={vi.fn()} t={t} hardestWords={words} />);
    expect(screen.getByTestId('full-report-link')).toBeInTheDocument();
    expect(screen.queryByTestId('round-hardest-words')).toBeNull();
    expect(screen.queryByTestId(/pro-insight-link-/)).toBeNull();
  });

  it('given the entitlement is loading, when the round ends, then neither the insight nor the link paints', () => {
    pro.value = { hasPro: false, loading: true };
    render(<ResultsPrimaryActions language="en" onRematch={vi.fn()} t={t} hardestWords={words} />);
    expect(screen.queryByTestId('round-hardest-words')).toBeNull();
    expect(screen.queryByTestId(/pro-insight-link-/)).toBeNull();
  });
});
