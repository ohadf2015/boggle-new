/**
 * Premium grid UI — the locked-builder surface that the guest (premium=null)
 * avatar-test page can't show. Verifies the NEW ribbon, lock/price/tier badges,
 * and NEW-first sort actually render when a premium context is present.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PartPreviewGrid from '../AvatarBuilderPartGrid';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';
import type { AvatarPremium } from '../AvatarBuilderModal';

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const motionComponent = React.forwardRef(({ children, ...props }: any, ref: any) => {
    const safe = { ...props };
    for (const k of ['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'whileInView', 'viewport']) delete safe[k];
    return React.createElement('div', { ...safe, ref }, children);
  });
  motionComponent.displayName = 'AdaptiveMotionMock';
  const proxy = new Proxy({}, { get: () => motionComponent });
  const AnimatePresence = ({ children }: any) => children;
  return { AdaptiveMotion: proxy, AdaptiveAnimatePresence: AnimatePresence };
});
vi.mock('../PartPreview', () => ({ __esModule: true, default: () => <div data-testid="part-preview" /> }));
vi.mock('react-hot-toast', () => ({ __esModule: true, default: Object.assign(vi.fn(), { success: vi.fn() }) }));

const mockPremium: AvatarPremium = {
  isPartUnlocked: () => false, // everything locked → show lock/price/tier
  unlockTemporarily: vi.fn(),
  purchaseWithGold: vi.fn(async () => true),
  isPurchasing: false,
  permanentUnlocks: [],
  coins: 999999,
};

function renderAccessories(options: string[]) {
  return render(
    <PartPreviewGrid
      label="Accessories"
      partType="accessory"
      premiumCategory="accessory"
      options={options as never}
      selected={'none' as never}
      onSelect={vi.fn()}
      config={DEFAULT_AVATAR_CONFIG}
      premium={mockPremium}
    />,
  );
}

describe('AvatarBuilderPartGrid — premium/locked UI', () => {
  it('renders a NEW ribbon on freshly-added parts', () => {
    renderAccessories(['none', 'crystalCrown', 'crown']);
    // crystalCrown is NEW; crown (existing premium) is not.
    expect(screen.getAllByText('NEW').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the full 5-digit price for the legendary crystalCrown', () => {
    renderAccessories(['none', 'crystalCrown']);
    expect(screen.getByText('12000')).toBeInTheDocument();
    expect(screen.getByText('LEGENDARY')).toBeInTheDocument();
  });

  it('shows an EPIC badge + price for new epic parts', () => {
    renderAccessories(['none', 'angelWings']);
    expect(screen.getByText('EPIC')).toBeInTheDocument();
    expect(screen.getByText('2200')).toBeInTheDocument();
  });

  it('shows locked premium parts at full color (no grayscale/dim) — show the goods', () => {
    const { container } = renderAccessories(['none', 'crystalCrown']);
    const preview = screen.getAllByTestId('part-preview')[0];
    const wrapper = preview.parentElement as HTMLElement;
    // The expensive part must be fully visible so players want it.
    expect(wrapper.className).not.toMatch(/grayscale/);
    expect(wrapper.className).not.toMatch(/opacity-40/);
  });

  it('shows a holographic foil on the legendary buy-confirmation preview', () => {
    const { container } = renderAccessories(['none', 'crystalCrown']);
    // Open the purchase confirmation for the legendary part (click bubbles to the
    // cell's onClick — motion.button is mocked to a div, so no button role).
    fireEvent.click(screen.getByText('12000'));
    // The decision-moment preview gets a premium foil sweep (legendary variant).
    expect(container.querySelector('.avatar-foil-legendary')).toBeTruthy();
  });

  it('sorts NEW parts ahead of older premium and free parts (after none)', () => {
    const { container } = renderAccessories(['none', 'glasses', 'crown', 'crystalCrown']);
    const grid = container.querySelector('.grid');
    const items = Array.from(grid?.children ?? []) as HTMLElement[];
    const order = items.map((el) => {
      const t = el.textContent || '';
      if (t.includes('NEW') || t.includes('12000')) return 'crystalCrown'; // NEW legendary
      if (/\b800\b/.test(t)) return 'crown'; // older premium (price 800)
      if (/glasses/i.test(t)) return 'glasses'; // free
      return 'none';
    });
    const idx = (k: string) => order.indexOf(k);
    expect(idx('none')).toBe(0);
    expect(idx('crystalCrown')).toBeGreaterThan(0);
    expect(idx('crystalCrown')).toBeLessThan(idx('crown'));
    expect(idx('crystalCrown')).toBeLessThan(idx('glasses'));
  });
});
