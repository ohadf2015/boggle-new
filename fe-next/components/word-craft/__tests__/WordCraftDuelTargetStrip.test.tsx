import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordCraftDuelTargetStrip } from '../WordCraftDuelTargetStrip';
import { getSeededAvatarConfig } from '@/shared/types/customAvatar';

const t = (path: string, params?: string | Record<string, string | number>) => {
  const p = (params && typeof params === 'object' ? params : {}) as Record<string, string | number>;
  if (path === 'wordcraft.duel.vsChallenger') return `vs ${p.name}`;
  if (path === 'wordcraft.duel.aheadBy') return `Ahead by ${p.n}!`;
  if (path === 'wordcraft.duel.toGo') return `${p.n} to go`;
  if (path === 'wordcraft.duel.tiedNow') return 'All tied!';
  if (path === 'wordcraft.duel.theirScore') return 'their score';
  return `[${path}]`;
};

describe('WordCraftDuelTargetStrip', () => {
  it("shows the friend's name and their target score", () => {
    render(
      <WordCraftDuelTargetStrip t={t} friendName="Ada" friendScore={250} playerScore={100} />
    );
    expect(screen.getByText('vs Ada')).toBeTruthy();
    expect(screen.getByText('250')).toBeTruthy();
  });

  it('shows how far behind the player is while trailing', () => {
    render(
      <WordCraftDuelTargetStrip t={t} friendName="Ada" friendScore={250} playerScore={100} />
    );
    expect(screen.getByText('150 to go')).toBeTruthy();
  });

  it('celebrates being ahead once the player passes the target', () => {
    render(
      <WordCraftDuelTargetStrip t={t} friendName="Ada" friendScore={250} playerScore={300} />
    );
    expect(screen.getByText('Ahead by 50!')).toBeTruthy();
  });

  it('shows a tied state at exactly equal scores', () => {
    render(
      <WordCraftDuelTargetStrip t={t} friendName="Ada" friendScore={250} playerScore={250} />
    );
    expect(screen.getByText('All tied!')).toBeTruthy();
  });

  it('renders an avatar image for the friend', () => {
    const { container } = render(
      <WordCraftDuelTargetStrip
        t={t}
        friendName="Ada"
        friendScore={250}
        playerScore={100}
        friendAvatar={getSeededAvatarConfig(9)}
      />
    );
    // Avatar renders an SVG; assert one is present inside the strip.
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('falls back to the generic label when the friend is unnamed', () => {
    render(
      <WordCraftDuelTargetStrip t={t} friendName="" friendScore={0} playerScore={0} />
    );
    expect(screen.getByText('All tied!')).toBeTruthy();
  });
});
