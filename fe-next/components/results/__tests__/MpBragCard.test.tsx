/**
 * MpBragCard — fight-poster share artifact.
 * Locks the redesign: every outcome frames a NAMED rival face-off, the hero box
 * only shows for a distinctive flex (combo/longest, not plain points), and the
 * "+N others" chip appears only when the match had more than the two shown.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MpBragCard, { type BragPlayer } from '../MpBragCard';
import { deriveBragCardData, type BragCardInput } from '@/lib/results/bragCard';

// Avatar pulls cosmetics/context we don't need here — stub it to its userId.
vi.mock('@/components/Avatar', () => ({
  default: ({ userId }: { userId: string }) => <div data-testid="avatar">{userId}</div>,
}));

// t returns the key so we can assert which headline/label rendered.
const t = (key: string) => key;

const you: BragPlayer = { name: 'You', score: 312 };
const rival: BragPlayer = { name: 'Alice', score: 187 };

const baseInput: BragCardInput = {
  gameMode: 'classic',
  isWinner: true,
  rank: 1,
  playerCount: 2,
  score: 312,
  wordsFound: 14,
  opponentName: 'Alice',
  opponentScore: 187,
  locale: 'en',
};

function renderCard(input: BragCardInput, opponent: BragPlayer | undefined = rival) {
  const data = deriveBragCardData(input);
  return render(
    <MpBragCard
      data={data}
      current={{ ...you, score: input.score }}
      opponent={opponent}
      modeLabel="CLASSIC"
      shareUrl="https://lexiclash.live"
      t={t}
    />
  );
}

describe('MpBragCard — fight-poster face-off', () => {
  it('names BOTH fighters in a head-to-head win', () => {
    renderCard(baseInput);
    const avatars = screen.getAllByTestId('avatar').map(a => a.textContent);
    expect(avatars).toContain('You');
    expect(avatars).toContain('Alice');
  });

  it('still shows a named rival when you LOST (the winner is the rival)', () => {
    renderCard({ ...baseInput, isWinner: false, rank: 3, playerCount: 4 });
    const avatars = screen.getAllByTestId('avatar').map(a => a.textContent);
    expect(avatars).toContain('Alice'); // the winner, framed as revenge target
    expect(screen.getByText('brag.headline.revenge')).toBeTruthy();
  });

  it('shows the "+N others" chip only when the match had more players', () => {
    const { rerender } = renderCard({ ...baseInput, playerCount: 2 });
    expect(screen.queryByText('brag.others')).toBeNull();

    rerender(
      <MpBragCard
        data={deriveBragCardData({ ...baseInput, playerCount: 5 })}
        current={you}
        opponent={rival}
        modeLabel="CLASSIC"
        shareUrl="https://lexiclash.live"
        t={t}
      />
    );
    expect(screen.getByText('brag.others')).toBeTruthy();
  });
});

describe('MpBragCard — one number, no duplication', () => {
  it('HIDES the hero box for a plain points game (scoreline already carries the number)', () => {
    renderCard(baseInput);
    expect(screen.queryByText('brag.hero.points')).toBeNull();
  });

  it('SHOWS the hero box for a distinctive flex (blast combo)', () => {
    renderCard({ ...baseInput, gameMode: 'blast', maxCombo: 7 });
    expect(screen.getByText('brag.hero.combo')).toBeTruthy();
    expect(screen.getByText('7×')).toBeTruthy();
  });
});

describe('MpBragCard — share action', () => {
  it('fires onCopyLink when the printed link is tapped', async () => {
    const onCopyLink = vi.fn();
    const data = deriveBragCardData(baseInput);
    render(
      <MpBragCard
        data={data}
        current={you}
        opponent={rival}
        modeLabel="CLASSIC"
        shareUrl="https://lexiclash.live"
        onCopyLink={onCopyLink}
        t={t}
      />
    );
    fireEvent.click(screen.getByTestId('brag-copy-link'));
    await waitFor(() => expect(onCopyLink).toHaveBeenCalledOnce());
  });
});
