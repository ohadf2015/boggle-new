import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import UnlockPanel from '../UnlockPanel';
import type { PartLockInfo } from '../partLock';

/**
 * A tried-on part is never saved (by design), but nothing said so: players
 * pressed Save, the part vanished, and it read as "save is broken".
 */
const t = (k: string) => k;
const premium = { isPartUnlocked: () => false, coins: 5000, level: 3 };
const base: PartLockInfo = {
  locked: true, path: 'gold', rarity: 'epic', price: 300, unlockLevel: null,
  levelsToGo: null, affordable: true, goldShort: 0,
};

function renderPanel(info: Partial<PartLockInfo>) {
  render(
    <UnlockPanel rarityCategory="eyes" partId="laserEye" categoryLabel="Eyes" info={{ ...base, ...info }}
      premium={premium} ownedKeys={[]} onBuy={vi.fn()} onTakeOff={vi.fn()} t={t} language="en" />,
  );
}

describe('UnlockPanel save hint', () => {
  it('Given an affordable gold part, When tried on, Then it says Save keeps the current look', () => {
    renderPanel({});
    expect(screen.getByText('avatarBuilder.editor.doneSkipsTryOn')).toBeInTheDocument();
  });

  it('Given a part the player cannot afford, When tried on, Then the gold-short hint wins', () => {
    renderPanel({ affordable: false, goldShort: 120 });
    expect(screen.getByText('avatarBuilder.editor.needMoreGold')).toBeInTheDocument();
    expect(screen.queryByText('avatarBuilder.editor.doneSkipsTryOn')).not.toBeInTheDocument();
  });
});
