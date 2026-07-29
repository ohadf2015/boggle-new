import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlastChestPreviewModal } from '../BlastChestPreviewModal';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

describe('BlastChestPreviewModal', () => {
  it('returns null when not open', () => {
    const contents = {
      tier: 'wood' as const,
      coins: 250,
      boosts: [],
      avatarPart: null,
      frameSkin: 'wood',
    };
    const { container } = render(
      <BlastChestPreviewModal
        chestNumber={1}
        contents={contents}
        isOpen={false}
        onClose={() => {}}
      />
    );
    expect(container.querySelector('[data-testid="preview-modal"]')).toBeNull();
  });

  it('renders full preview when open', () => {
    const contents = {
      tier: 'gold' as const,
      coins: 800,
      boosts: [{ type: 'shield', count: 1 }],
      avatarPart: 'head_1',
      frameSkin: 'gold',
    };
    render(
      <BlastChestPreviewModal chestNumber={5} contents={contents} isOpen={true} onClose={() => {}} />
    );
    expect(screen.getByTestId('preview-modal')).toBeDefined();
    expect(screen.getByText(/Chest #5/i)).toBeDefined();
  });

  it('displays tier, coins, boosts, avatar part', () => {
    const contents = {
      tier: 'legendary' as const,
      coins: 2500,
      boosts: [{ type: 'speed', count: 1 }, { type: 'xray', count: 1 }],
      avatarPart: 'eyes_1',
      frameSkin: 'legendary',
    };
    render(
      <BlastChestPreviewModal
        chestNumber={10}
        contents={contents}
        isOpen={true}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/legendary/i)).toBeDefined();
    expect(screen.getByText((content) => content.includes('2500'))).toBeDefined();
    expect(screen.getByText(/speed/i)).toBeDefined();
    expect(screen.getByText(/eyes_1/i)).toBeDefined();
  });

  it('calls onClose when background or close button clicked', async () => {
    const onClose = vi.fn();
    const contents = {
      tier: 'silver' as const,
      coins: 450,
      boosts: [],
      avatarPart: null,
      frameSkin: 'silver',
    };
    render(
      <BlastChestPreviewModal
        chestNumber={2}
        contents={contents}
        isOpen={true}
        onClose={onClose}
      />
    );
    const closeBtn = screen.getByText(/Close/i);
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
