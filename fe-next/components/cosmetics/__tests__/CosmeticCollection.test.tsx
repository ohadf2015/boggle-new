import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CosmeticCollection } from '../CosmeticCollection';

// Mock useCosmetics
const mockEquip = vi.fn();
const mockPurchase = vi.fn(() => true);
const mockGetByCategory = vi.fn((category: string) => {
  if (category === 'tileSkin') {
    return [
      {
        id: 'tile-default',
        category: 'tileSkin',
        name: 'cosmetics.items.tileDefault',
        description: 'cosmetics.items.tileDefaultDesc',
        rarity: 'common',
        unlockCondition: { type: 'default' },
        preview: 'tile-skin-default',
        isUnlocked: true,
        isEquipped: true,
      },
      {
        id: 'tile-neon',
        category: 'tileSkin',
        name: 'cosmetics.items.tileNeon',
        description: 'cosmetics.items.tileNeonDesc',
        rarity: 'rare',
        unlockCondition: { type: 'rank', tier: 'Silver' },
        preview: 'tile-skin-neon',
        isUnlocked: false,
        isEquipped: false,
      },
    ];
  }
  return [];
});

vi.mock('@/hooks/useCosmetics', () => ({
  useCosmetics: () => ({
    unlockedCosmetics: [],
    equippedCosmetics: {},
    equipCosmetic: mockEquip,
    purchaseCosmetic: mockPurchase,
    getCosmeticsByCategory: mockGetByCategory,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

describe('CosmeticCollection', () => {
  it('renders category tabs', () => {
    render(<CosmeticCollection rankTier="Unranked" streakDays={0} coins={0} />);
    expect(screen.getByText('cosmetics.tileSkins')).toBeDefined();
    expect(screen.getByText('cosmetics.boardThemes')).toBeDefined();
    expect(screen.getByText('cosmetics.victoryEffects')).toBeDefined();
    expect(screen.getByText('cosmetics.profileFrames')).toBeDefined();
  });

  it('shows cosmetic cards for selected category', () => {
    render(<CosmeticCollection rankTier="Unranked" streakDays={0} coins={0} />);
    // Default tab is tileSkin, should show items
    expect(screen.getByText('cosmetics.items.tileDefault')).toBeDefined();
    expect(screen.getByText('cosmetics.items.tileNeon')).toBeDefined();
  });

  it('shows equipped badge on equipped item', () => {
    render(<CosmeticCollection rankTier="Unranked" streakDays={0} coins={0} />);
    expect(screen.getByText('cosmetics.equipped')).toBeDefined();
  });

  it('shows unlock-condition hint on locked items (rank cosmetic shows tier requirement)', () => {
    render(<CosmeticCollection rankTier="Unranked" streakDays={0} coins={0} />);
    // tile-neon is rank-Silver locked → should display the rank-unlock translation key
    expect(screen.getAllByText('cosmetics.unlock.rank').length).toBeGreaterThan(0);
  });

  it('opens preview modal when clicking a cosmetic card', () => {
    render(<CosmeticCollection rankTier="Unranked" streakDays={0} coins={0} />);
    fireEvent.click(screen.getByText('cosmetics.items.tileDefault'));
    // Preview modal should appear with dialog role
    expect(screen.getByRole('dialog')).toBeDefined();
  });
});
