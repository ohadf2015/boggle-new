import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConnectionsReviewPanel from '../ConnectionsReviewPanel';

vi.mock('@/lib/connections/puzzles', () => {
  const pools: Record<string, Array<{ id: string; word1: string; word2: string; bridge: string; difficulty: string }>> = {
    he: [{ id: 'he-o-006', word1: 'כלב', word2: 'תיכון', bridge: 'ים', difficulty: 'medium' }],
    en: [{ id: 'en-o-001', word1: 'SUN', word2: 'HOUSE', bridge: 'LIGHT', difficulty: 'easy' }],
    es: [{ id: 'es-o-001', word1: 'SOL', word2: 'CASA', bridge: 'LUZ', difficulty: 'easy' }],
    sv: [{ id: 'sv-o-001', word1: 'SOL', word2: 'HUS', bridge: 'LJUS', difficulty: 'easy' }],
    ja: [{ id: 'ja-o-001', word1: '太陽', word2: '家', bridge: '光', difficulty: 'easy' }],
  };
  return { getPuzzlesForLocale: (loc: string) => pools[loc] ?? pools.en };
});

const fetchReviews = vi.fn();
const saveReviews = vi.fn();
vi.mock('@/lib/connections/reviewClient', () => ({
  fetchReviews: () => fetchReviews(),
  saveReviews: (...a: unknown[]) => saveReviews(...a),
}));

beforeEach(() => {
  fetchReviews.mockResolvedValue({
    reviews: [],
    feedback: [{ puzzle_id: 'he-o-006', likes: 1, dislikes: 3, gaveups: 1, total: 5 }],
  });
  saveReviews.mockResolvedValue({ ok: true, saved: 1 });
});

describe('ConnectionsReviewPanel', () => {
  it('renders pool rows with the player-feedback flag', async () => {
    render(<ConnectionsReviewPanel />);
    expect(await screen.findByTestId('row-he-o-006')).toBeTruthy();
    expect(screen.getByTestId('row-en-o-001')).toBeTruthy();
    // player feedback (3 dislikes) surfaced for he-o-006
    expect(await screen.findByTestId('fb-he-o-006')).toBeTruthy();
  });

  it('marks a verdict and enables save', async () => {
    render(<ConnectionsReviewPanel />);
    await screen.findByTestId('row-he-o-006');
    expect((screen.getByTestId('save-btn') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId('bad-he-o-006'));
    expect((screen.getByTestId('save-btn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('bulk-marks selected rows then saves', async () => {
    render(<ConnectionsReviewPanel />);
    await screen.findByTestId('row-he-o-006');
    fireEvent.click(screen.getByLabelText('select he-o-006'));
    fireEvent.click(screen.getByLabelText('select en-o-001'));
    expect(screen.getByTestId('bulk-bar')).toBeTruthy();
    fireEvent.click(screen.getByTestId('bulk-good'));
    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() => expect(saveReviews).toHaveBeenCalled());
    const batch = saveReviews.mock.calls[0][0] as Array<{ puzzleId: string; verdict: string }>;
    expect(batch).toHaveLength(2);
    expect(batch.every((b) => b.verdict === 'good')).toBe(true);
  });
});
