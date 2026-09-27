import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConnectionsCommunity from '../ConnectionsCommunity';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'he', t: (k: string) => k }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: null }) }));

const fetchUgcList = vi.fn();
const submitUgc = vi.fn();
const voteUgc = vi.fn();
vi.mock('@/lib/connections/ugcClient', () => ({
  fetchUgcList: (...a: unknown[]) => fetchUgcList(...a),
  submitUgc: (...a: unknown[]) => submitUgc(...a),
  voteUgc: (...a: unknown[]) => voteUgc(...a),
  readVotedIds: () => new Set<string>(),
  markVoted: vi.fn(),
}));

const riddle = {
  id: 'r1',
  word1: 'מיץ',
  word2: 'אדומים',
  bridge: 'תפוחים',
  language: 'he',
  upvotes: 3,
  creator_display_name: 'Dana',
  created_at: '2026-05-30',
};

beforeEach(() => {
  fetchUgcList.mockResolvedValue([riddle]);
  submitUgc.mockResolvedValue({ ok: true });
  voteUgc.mockResolvedValue(4);
});

describe('ConnectionsCommunity', () => {
  it('renders the ranked approved riddles with an upvote control', async () => {
    render(<ConnectionsCommunity />);
    const row = await screen.findByTestId('ugc-riddle-r1');
    expect(row.textContent).toContain('מיץ');
    expect(row.textContent).toContain('תפוחים');
    expect(row.textContent).toContain('אדומים');
    expect(screen.getByTestId('ugc-upvote-r1')).toBeTruthy();
  });

  it('votes when the upvote control is tapped', async () => {
    render(<ConnectionsCommunity />);
    const btn = await screen.findByTestId('ugc-upvote-r1');
    fireEvent.click(btn);
    await waitFor(() => expect(voteUgc).toHaveBeenCalledWith('r1'));
  });

  it('submits a new suggestion from the form', async () => {
    render(<ConnectionsCommunity />);
    await screen.findByTestId('ugc-riddle-r1');
    fireEvent.change(screen.getByTestId('ugc-input-word1'), { target: { value: 'בית' } });
    fireEvent.change(screen.getByTestId('ugc-input-word2'), { target: { value: 'חולים' } });
    fireEvent.change(screen.getByTestId('ugc-input-bridge'), { target: { value: 'ספר' } });
    fireEvent.click(screen.getByTestId('ugc-submit'));
    await waitFor(() => expect(submitUgc).toHaveBeenCalled());
    expect(submitUgc.mock.calls[0][0]).toMatchObject({ word1: 'בית', word2: 'חולים', bridge: 'ספר', language: 'he' });
  });
});
