import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CosmeticPreview } from '../CosmeticPreview';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, params?: Record<string, unknown>) =>
    params ? `${key} ${JSON.stringify(params)}` : key
  }),
}));

const mockCosmetic = {
  id: 'tile-neon',
  category: 'tileSkin' as const,
  name: 'cosmetics.items.tileNeon',
  description: 'cosmetics.items.tileNeonDesc',
  rarity: 'rare' as const,
  unlockCondition: { type: 'rank' as const, tier: 'Silver' },
  preview: 'tile-skin-neon',
};

describe('CosmeticPreview', () => {
  it('renders cosmetic name and description', () => {
    render(<CosmeticPreview cosmetic={mockCosmetic} isUnlocked={false} onClose={() => {}} />);
    expect(screen.getByText('cosmetics.items.tileNeon')).toBeDefined();
    expect(screen.getByText('cosmetics.items.tileNeonDesc')).toBeDefined();
  });

  it('shows equip button when unlocked', () => {
    const onEquip = vi.fn();
    render(
      <CosmeticPreview cosmetic={mockCosmetic} isUnlocked={true} onClose={() => {}} onEquip={onEquip} />
    );
    const btn = screen.getByText('cosmetics.equip');
    fireEvent.click(btn);
    expect(onEquip).toHaveBeenCalledWith('tile-neon');
  });

  it('shows unlock condition when locked (rank cosmetic shows tier requirement)', () => {
    render(<CosmeticPreview cosmetic={mockCosmetic} isUnlocked={false} onClose={() => {}} />);
    // mock cosmetic is rank-Silver → renders the rank-unlock translation key
    expect(screen.getByText(/cosmetics\.unlock\.rank/)).toBeDefined();
  });

  it('shows purchase button for purchasable locked items', () => {
    const purchasable = {
      ...mockCosmetic,
      id: 'tile-wooden',
      unlockCondition: { type: 'purchase' as const, cost: 100 },
    };
    const onPurchase = vi.fn();
    render(
      <CosmeticPreview cosmetic={purchasable} isUnlocked={false} onClose={() => {}} onPurchase={onPurchase} />
    );
    const btn = screen.getByRole('button', { name: /cosmetics\.purchase/i });
    fireEvent.click(btn);
    expect(onPurchase).toHaveBeenCalledWith('tile-wooden');
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<CosmeticPreview cosmetic={mockCosmetic} isUnlocked={false} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('cosmetics.close'));
    expect(onClose).toHaveBeenCalled();
  });
});
