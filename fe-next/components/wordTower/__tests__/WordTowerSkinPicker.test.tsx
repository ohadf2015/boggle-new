import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordTowerSkinPicker } from '../WordTowerSkinPicker';
import type { UseTowerSkin } from '../useTowerSkin';
import { skinPalette } from '@/lib/wordTower/skins';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

function makeSkin(over: Partial<UseTowerSkin> = {}): UseTowerSkin {
  return {
    skinId: 'classic',
    palette: skinPalette('classic'),
    setSkinId: vi.fn(),
    isUnlocked: (id) => id === 'classic' || id === 'copper',
    ...over,
  };
}

describe('WordTowerSkinPicker', () => {
  it('is collapsed to a single trigger button until opened', () => {
    render(<WordTowerSkinPicker skin={makeSkin()} bestHeightM={150} t={t} dir="ltr" />);
    expect(screen.getByLabelText('wordTower.skin.open')).toBeInTheDocument();
    expect(screen.queryByText('wordTower.skin.pickerTitle')).not.toBeInTheDocument();
  });

  it('opens the sheet and lists every skin', () => {
    render(<WordTowerSkinPicker skin={makeSkin()} bestHeightM={150} t={t} dir="ltr" />);
    fireEvent.click(screen.getByLabelText('wordTower.skin.open'));
    expect(screen.getByText('wordTower.skin.pickerTitle')).toBeInTheDocument();
    expect(screen.getByText('wordTower.skin.classic.name')).toBeInTheDocument();
    expect(screen.getByText('wordTower.skin.gold.name')).toBeInTheDocument();
  });

  it('equips an unlocked skin on tap', () => {
    const setSkinId = vi.fn();
    render(<WordTowerSkinPicker skin={makeSkin({ setSkinId })} bestHeightM={150} t={t} dir="ltr" />);
    fireEvent.click(screen.getByLabelText('wordTower.skin.open'));
    // copper is unlocked in makeSkin → its equip control fires setSkinId
    fireEvent.click(screen.getByRole('button', { name: /wordTower\.skin\.copper\.name/ }));
    expect(setSkinId).toHaveBeenCalledWith('copper');
  });

  it('shows the unlock threshold on a locked skin and never equips it', () => {
    const setSkinId = vi.fn();
    render(<WordTowerSkinPicker skin={makeSkin({ setSkinId })} bestHeightM={150} t={t} dir="ltr" />);
    fireEvent.click(screen.getByLabelText('wordTower.skin.open'));
    // gold unlocks at 650m → locked label present
    expect(screen.getByText('wordTower.skin.locked:650')).toBeInTheDocument();
    const goldRow = screen.getByRole('button', { name: /wordTower\.skin\.gold\.name/ });
    expect(goldRow).toBeDisabled();
    fireEvent.click(goldRow);
    expect(setSkinId).not.toHaveBeenCalled();
  });
});
