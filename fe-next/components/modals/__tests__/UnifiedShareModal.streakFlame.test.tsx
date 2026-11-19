import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import UnifiedShareModal from '../UnifiedShareModal';

vi.mock('@/hooks/useNativeShare', () => ({ useNativeShare: () => ({ canNativeShare: false, nativeShare: vi.fn() }) }));
vi.mock('react-hot-toast', () => ({ __esModule: true, default: { success: vi.fn(), error: vi.fn() } }));

const result = { score: 100, wordCount: 12, isWinner: true };
const t = (k: string) => k;

describe('UnifiedShareModal streak flame', () => {
  it('shows the tiered flame in the share stats for a multi-day streak', () => {
    render(<UnifiedShareModal isOpen onClose={() => {}} gameCode="ABCD" t={t} context="post-game" gameResult={{ ...result, streakDays: 5 }} />);
    expect(screen.getByTestId('streak-flame')).toHaveAttribute('data-tier', 'flame');
  });

  it('shows no flame without a streak', () => {
    render(<UnifiedShareModal isOpen onClose={() => {}} gameCode="ABCD" t={t} context="post-game" gameResult={result} />);
    expect(screen.queryByTestId('streak-flame')).toBeNull();
  });
});
