/**
 * Premium grid UI — the locked-builder surface that the guest (premium=null)
 * avatar-test page can't show. Verifies the NEW ribbon, lock/price/tier badges,
 * NEW-first sort, premium filter, hover title, and cell shimmer when a premium
 * context is present.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PartPreviewGrid from '../AvatarBuilderPartGrid';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';
import type { AvatarPremium } from '../AvatarBuilderModal';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

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

function renderAccessories(options: string[], premium: AvatarPremium | undefined = mockPremium) {
  return render(
    <PartPreviewGrid
      label="Accessories"
      partType="accessory"
      premiumCategory="accessory"
      options={options as never}
      selected={'none' as never}
      onSelect={vi.fn()}
      config={DEFAULT_AVATAR_CONFIG}
      premium={premium}
      t={(key) => key}
    />,
  );
}

describe('AvatarBuilderPartGrid — premium/locked UI', () => {
  it('renders a NEW ribbon on freshly-added parts', () => {
    renderAccessories(['none', 'crystalCrown', 'crown']);
    // crystalCrown is NEW; crown (existing premium) is not.
    expect(screen.getAllByText('avatarBuilder.new').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the full 5-digit price for the legendary crystalCrown', () => {
    renderAccessories(['none', 'crystalCrown']);
    expect(screen.getByText('12000')).toBeInTheDocument();
    expect(screen.getByText('avatarBuilder.tiers.legendary')).toBeInTheDocument();
  });

  it('shows an EPIC badge + price for new epic parts', () => {
    renderAccessories(['none', 'angelWings']);
    expect(screen.getByText('avatarBuilder.tiers.epic')).toBeInTheDocument();
    expect(screen.getByText('2200')).toBeInTheDocument();
  });

  it('shows locked premium parts at full color (no grayscale/dim) — show the goods', () => {
    renderAccessories(['none', 'crystalCrown']);
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

  it('shows a set-completion pip row when buying a part that belongs to a set', () => {
    const { container } = renderAccessories(['none', 'crystalCrown']);
    fireEvent.click(screen.getByText('12000'));
    // crystalCrown is in the "Royal" set (4 parts); buying it = 1/4 owned.
    const row = container.querySelector('[data-testid="set-progress"]');
    expect(row).toBeTruthy();
    expect(row?.textContent).toContain('Royal');
    expect(row?.textContent).toContain('1/4');
  });

  it('sorts NEW parts ahead of older premium and free parts (after none)', () => {
    const { container } = renderAccessories(['none', 'glasses', 'crown', 'crystalCrown']);
    const grid = container.querySelector('.grid');
    const items = Array.from(grid?.children ?? []) as HTMLElement[];
    const order = items.map((el) => {
      const t = el.textContent || '';
      if (t.includes('avatarBuilder.new') || t.includes('avatarBuilder.tiers.legendary') || t.includes('12000')) return 'crystalCrown';
      if (t.includes('avatarBuilder.tiers.rare') || /\b800\b/.test(t)) return 'crown';
      if (/glasses/i.test(t)) return 'glasses';
      return 'none';
    });
    const idx = (k: string) => order.indexOf(k);
    expect(idx('none')).toBe(0);
    expect(idx('crystalCrown')).toBeGreaterThan(0);
    expect(idx('crystalCrown')).toBeLessThan(idx('crown'));
    expect(idx('crystalCrown')).toBeLessThan(idx('glasses'));
  });

  it('exposes All / VIP filter tabs when premium context is present', () => {
    renderAccessories(['none', 'glasses', 'crown', 'crystalCrown']);
    expect(screen.getByRole('tab', { name: 'avatar.premium.filterAll' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'avatar.premium.filterVip' })).toBeInTheDocument();
  });

  it('VIP filter shows only premium parts (plus none)', () => {
    renderAccessories(['none', 'glasses', 'crown', 'wings']);
    fireEvent.click(screen.getByRole('tab', { name: 'avatar.premium.filterVip' }));
    // Free glasses must disappear; premium crown/wings stay.
    expect(screen.queryByText('glasses')).not.toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument(); // crown price
    expect(screen.getByText('1800')).toBeInTheDocument(); // wings price
  });

  it('attaches hover title with part name + tier for premium parts', () => {
    renderAccessories(['none', 'wings']);
    const wingsBtn = screen.getByRole('button', { name: /wings/i });
    expect(wingsBtn.getAttribute('title')).toMatch(/wings/i);
    expect(wingsBtn.getAttribute('title')).toMatch(/avatarBuilder\.tiers\.(epic|legendary|rare)/);
    expect(wingsBtn.getAttribute('data-tier')).toBe('epic');
  });

  it('applies a shimmer class on premium part cells', () => {
    const { container } = renderAccessories(['none', 'wings', 'crystalCrown']);
    const shimmerCells = container.querySelectorAll('.avatar-part-cell-premium');
    expect(shimmerCells.length).toBeGreaterThanOrEqual(2);
  });
});
