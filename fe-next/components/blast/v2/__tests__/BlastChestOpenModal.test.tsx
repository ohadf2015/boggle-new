import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlastChestOpenModal } from '../BlastChestOpenModal';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('BlastChestOpenModal', () => {
  it('returns null when not open', () => {
    const contents = {
      tier: 'wood' as const,
      coins: 250,
      boosts: [],
      avatarPart: null,
      frameSkin: 'wood',
    };
    const { container } = render(
      <BlastChestOpenModal contents={contents} isOpen={false} onClose={() => {}} />
    );
    expect(container.querySelector('[data-testid="chest-modal"]')).toBeNull();
  });

  it('renders modal when open with wood tier', () => {
    const contents = {
      tier: 'wood' as const,
      coins: 250,
      boosts: [],
      avatarPart: null,
      frameSkin: 'wood',
    };
    render(
      <BlastChestOpenModal contents={contents} isOpen={true} onClose={() => {}} />
    );
    expect(screen.getByTestId('chest-modal')).toBeDefined();
  });

  it('displays coins reward', () => {
    const contents = {
      tier: 'silver' as const,
      coins: 400,
      boosts: [{ type: 'shield', count: 1 }],
      avatarPart: null,
      frameSkin: 'silver',
    };
    render(
      <BlastChestOpenModal contents={contents} isOpen={true} onClose={() => {}} />
    );
    expect(screen.getByText('400')).toBeDefined();
  });

  it('displays boosts if present', () => {
    const contents = {
      tier: 'gold' as const,
      coins: 800,
      boosts: [{ type: 'speed', count: 1 }, { type: 'xray', count: 1 }],
      avatarPart: null,
      frameSkin: 'gold',
    };
    render(
      <BlastChestOpenModal contents={contents} isOpen={true} onClose={() => {}} />
    );
    expect(screen.getByText(/speed/i)).toBeDefined();
  });

  it('displays avatar part if present', () => {
    const contents = {
      tier: 'legendary' as const,
      coins: 2000,
      boosts: [{ type: 'shield', count: 1 }],
      avatarPart: 'head_1',
      frameSkin: 'legendary',
    };
    render(
      <BlastChestOpenModal contents={contents} isOpen={true} onClose={() => {}} />
    );
    expect(screen.getByText(/head_1/i)).toBeDefined();
  });

  it('calls onClose when button clicked', async () => {
    const onClose = vi.fn();
    const contents = {
      tier: 'wood' as const,
      coins: 250,
      boosts: [],
      avatarPart: null,
      frameSkin: 'wood',
    };
    render(
      <BlastChestOpenModal contents={contents} isOpen={true} onClose={onClose} />
    );
    const closeBtn = screen.getByTestId('chest-close-btn');
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
