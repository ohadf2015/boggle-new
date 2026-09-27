/**
 * The rebuilt avatar editor (AvatarBuilderModal shell + components/avatar/editor/*).
 *
 * Replaces components/avatar/__tests__/AvatarBuilderPartGrid.premium.test.tsx,
 * which tested the old per-cell purchase-confirmation grid. The behaviors that
 * still apply are ported here (legendary price + tier, locked parts at full
 * color, legendary foil at the decision moment, set progress, data-tier +
 * hover title); the rest is new behavior (try-on never saved, Lv chips,
 * unlock panel, collection progress, undo).
 */
import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { isPartUsable, getCollectionProgress } from '@/lib/avatar/unlocks';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: track }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, a?: unknown, b?: unknown) => {
      const params = (typeof a === 'object' && a) || (typeof b === 'object' && b) || null;
      return params ? `${key}|${Object.entries(params as Record<string, unknown>).map(([k, v]) => `${k}=${v}`).join(',')}` : key;
    },
    language: 'en',
    dir: 'ltr',
  }),
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
vi.mock('../../AvatarRenderer', () => ({
  __esModule: true,
  default: ({ config }: { config: CustomAvatarConfig }) => (
    <div data-testid="avatar-renderer" data-accessory={config.accessory} data-base={config.base} />
  ),
}));
vi.mock('../../PartPreview', () => ({ __esModule: true, default: () => <div data-testid="part-preview" /> }));
vi.mock('../../LobbyAvatarRewardButton', () => ({ LobbyAvatarRewardButton: () => <div data-testid="avatar-daily-reward" /> }));
vi.mock('react-hot-toast', () => ({ __esModule: true, default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import AvatarBuilderModal, { type AvatarPremium } from '../../AvatarBuilderModal';

function premiumAt(level: number, coins = 1500, owned: string[] = []): AvatarPremium {
  return {
    isPartUnlocked: (c, v) => isPartUsable(c, v, { ownedKeys: owned, level }),
    unlockTemporarily: vi.fn(),
    purchaseWithGold: vi.fn(async () => true),
    isPurchasing: false,
    permanentUnlocks: owned,
    coins,
    level,
  };
}

const start: CustomAvatarConfig = { ...DEFAULT_AVATAR_CONFIG, accessory: 'none' as CustomAvatarConfig['accessory'] };

function open(premium: AvatarPremium | null, extra: Partial<React.ComponentProps<typeof AvatarBuilderModal>> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <AvatarBuilderModal isOpen onClose={onClose} onSave={onSave} initialConfig={start} premium={premium} {...extra} />,
  );
  return { ...utils, onSave, onClose };
}

const cell = (id: string) => screen.getByRole('button', { name: id });
const goTab = (id: string) => fireEvent.click(screen.getByTestId(`editor-tab-${id}`));
const preview = () => screen.getAllByTestId('avatar-renderer')[0];

describe('Avatar editor — try-on is never saved (ownership is client-side only)', () => {
  beforeEach(() => track.mockClear());

  it('tapping a locked part previews it on the avatar, but DONE saves the original', () => {
    const { onSave } = open(premiumAt(1, 0));
    goTab('accessory');
    fireEvent.click(cell('crystalCrown'));
    expect(preview()).toHaveAttribute('data-accessory', 'crystalCrown');
    fireEvent.click(screen.getByText('avatarBuilder.save'));
    expect(onSave).toHaveBeenCalledWith(start);
    // Try-on is not a part change
    expect(track.mock.calls.filter(([e]) => e === 'avatar_part_changed')).toHaveLength(0);
  });

  it('take-off restores the committed look', () => {
    open(premiumAt(1, 0));
    goTab('accessory');
    fireEvent.click(cell('crystalCrown'));
    fireEvent.click(screen.getByTestId('editor-unlock-takeoff'));
    expect(preview()).toHaveAttribute('data-accessory', 'none');
    expect(screen.queryByTestId('editor-unlock-panel')).not.toBeInTheDocument();
  });
});

describe('Avatar editor — locked parts are covetable, with a clear unlock path', () => {
  it('a level-ladder part shows an "Lv N" chip; a gold-only part shows its price', () => {
    open(premiumAt(1));
    goTab('accessory');
    expect(within(cell('headphones')).getByText('avatarBuilder.editor.levelChip|level=2')).toBeInTheDocument();
    expect(within(cell('crystalCrown')).getByText('12,000')).toBeInTheDocument();
  });

  it('the unlock panel names the rarity and the level path with how far the player is', () => {
    open(premiumAt(3));
    goTab('accessory');
    fireEvent.click(cell('cowboyHat')); // ladder L5
    const panel = screen.getByTestId('editor-unlock-panel');
    expect(within(panel).getByText('avatarBuilder.editor.unlocksAtLevel|level=5')).toBeInTheDocument();
    expect(within(panel).getByText('avatarBuilder.editor.youAreLevel|level=3')).toBeInTheDocument();
    expect(panel.getAttribute('data-rarity')).toBe('rare');
  });

  it('legendary: tier label, price, foil at the decision moment, set progress (ported)', () => {
    open(premiumAt(1, 0));
    goTab('accessory');
    fireEvent.click(cell('crystalCrown'));
    const panel = screen.getByTestId('editor-unlock-panel');
    expect(within(panel).getByText('avatarBuilder.tiers.legendary')).toBeInTheDocument();
    expect(panel.querySelector('.avatar-editor-foil')).toBeTruthy();
    const set = within(panel).getByTestId('set-progress');
    expect(set.textContent).toContain('avatarBuilder.sets.royal');
    expect(set.textContent).toContain('1/4');
    // cannot afford → shows the shortfall, buy disabled
    expect(within(panel).getByText('avatarBuilder.editor.needMoreGold|amount=12,000')).toBeInTheDocument();
  });

  it('set progress counts set parts the player already has from the level ladder, not only bought ones', () => {
    // mouth:neonSmile unlocks at Lv 28 and belongs to the galaxy set with eyes:galaxy.
    open(premiumAt(28, 0));
    goTab('eyes');
    fireEvent.click(cell('galaxy'));
    const set = within(screen.getByTestId('editor-unlock-panel')).getByTestId('set-progress');
    expect(set.textContent).toContain('2/5');
  });

  it('buying from the panel spends gold and equips the part for real', async () => {
    const p = premiumAt(1, 20000);
    const { onSave } = open(p);
    goTab('accessory');
    fireEvent.click(cell('crystalCrown'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('editor-unlock-buy'));
    });
    expect(p.purchaseWithGold).toHaveBeenCalledWith('accessory', 'crystalCrown');
    fireEvent.click(screen.getByText('avatarBuilder.save'));
    expect(onSave).toHaveBeenCalledWith({ ...start, accessory: 'crystalCrown' });
  });

  it('locked parts render at full color, carry data-tier and a hover title with the tier (ported)', () => {
    open(premiumAt(1));
    goTab('accessory');
    const wings = cell('crystalCrown');
    expect(wings.getAttribute('data-tier')).toBe('legendary');
    expect(wings.getAttribute('data-locked')).toBe('true');
    expect(wings.getAttribute('title')).toMatch(/avatarBuilder\.tiers\.legendary/);
    expect(wings.className).not.toMatch(/grayscale|opacity-40/);
  });

  it('usable parts come first; the nearest level unlock before gold-only parts', () => {
    open(premiumAt(1));
    goTab('accessory');
    const ids = screen.getAllByTestId('editor-part').map(el => el.getAttribute('aria-label'));
    expect(ids[0]).toBe('none');
    expect(ids.indexOf('glasses')).toBeLessThan(ids.indexOf('headphones'));
    expect(ids.indexOf('headphones')).toBeLessThan(ids.indexOf('crystalCrown'));
  });

  it('collection count agrees with the grid lock state even when premium carries no level', () => {
    const p = premiumAt(7);
    delete (p as { level?: number }).level;
    open(p);
    const expected = getCollectionProgress([], 7);
    expect(expected.owned).toBeGreaterThan(0);
    expect(screen.getByTestId('editor-collection').textContent).toContain(`${expected.owned}/${expected.total}`);
  });

  it('marks freshly added parts with a NEW ribbon (ported)', () => {
    open(premiumAt(1));
    goTab('accessory');
    expect(within(cell('crystalCrown')).getByText('avatarBuilder.new')).toBeInTheDocument();
  });

  it('shows collection progress subtly in the preview', () => {
    open(premiumAt(7));
    expect(screen.getByTestId('editor-collection').textContent).toMatch(/\d+\/\d+/);
  });

  it('onboarding (premium=null) never offers premium parts', () => {
    open(null);
    goTab('accessory');
    expect(screen.queryByRole('button', { name: 'crystalCrown' })).not.toBeInTheDocument();
    expect(cell('glasses')).toBeInTheDocument();
  });
});

describe('Avatar editor — core loop', () => {
  it('lands on the face tab; picking a part updates the preview and enables undo', () => {
    open(null);
    const undo = screen.getByTestId('editor-undo');
    expect(undo).toBeDisabled();
    fireEvent.click(cell('square'));
    expect(preview()).toHaveAttribute('data-base', 'square');
    expect(undo).not.toBeDisabled();
    fireEvent.click(undo);
    expect(preview()).toHaveAttribute('data-base', start.base);
  });

  it('tabs are an accessible tablist with icon tabs', () => {
    open(null);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThanOrEqual(7);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    goTab('hair');
    expect(screen.getByTestId('editor-tab-hair')).toHaveAttribute('aria-selected', 'true');
  });

  it('grid cells draw cheap single-part thumbnails, never a full avatar per cell', () => {
    open(premiumAt(6));
    // The stage is the only full renderer, whatever the tab.
    expect(screen.getAllByTestId('avatar-renderer')).toHaveLength(1);
    const thumbs = within(cell('square')).getAllByTestId('part-thumb');
    expect(thumbs).toHaveLength(1);
    goTab('hair');
    expect(screen.getAllByTestId('avatar-renderer')).toHaveLength(1);
    expect(screen.getAllByTestId('part-thumb').length).toBeGreaterThan(8);
  });

  it('locks page scroll on both <html> and <body> while open, and restores it on close', () => {
    const { rerender } = open(null);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<AvatarBuilderModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} initialConfig={start} premium={null} />);
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');
  });

  it('randomize replaces the look and is undoable', () => {
    open(null);
    fireEvent.click(screen.getByTestId('editor-randomize'));
    expect(screen.getByTestId('editor-undo')).not.toBeDisabled();
  });

  it('a locked background color is tried on, not applied', () => {
    const { onSave } = open(premiumAt(1, 0));
    goTab('background');
    fireEvent.click(screen.getByRole('button', { name: '#FFD700' }));
    expect(screen.getByTestId('editor-unlock-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByText('avatarBuilder.save'));
    expect(onSave).toHaveBeenCalledWith(start);
  });
});

describe('Avatar editor — layout never fights itself (critic r1: cropped rows, FAB over tiles, shrunken preview, badge stacks)', () => {
  it('undo, randomize and the ONE save button live in the bottom action bar, not on the stage', () => {
    open(premiumAt(6));
    const bar = screen.getByTestId('editor-actionbar');
    const stage = screen.getByTestId('editor-stage');
    for (const id of ['editor-undo', 'editor-randomize']) {
      expect(within(bar).getByTestId(id)).toBeInTheDocument();
      expect(within(stage).queryByTestId(id)).not.toBeInTheDocument();
    }
    expect(within(bar).getByText('avatarBuilder.save')).toBeInTheDocument();
    expect(screen.getAllByText('avatarBuilder.save')).toHaveLength(1);
  });

  it('trying on a locked part never shrinks the preview: the unlock panel sits outside the stage', () => {
    open(premiumAt(3));
    goTab('accessory');
    fireEvent.click(cell('cowboyHat'));
    const panel = screen.getByTestId('editor-unlock-panel');
    const stage = screen.getByTestId('editor-stage');
    expect(stage.contains(panel)).toBe(false);
    for (const el of Array.from(stage.querySelectorAll<HTMLElement>('*'))) {
      expect(el.style.transform).toBe('');
    }
  });

  it('every tile carries at most ONE badge (check, NEW, Lv chip or price), locked+new included', () => {
    open(premiumAt(1));
    goTab('accessory');
    fireEvent.click(cell('glasses'));
    for (const el of screen.getAllByTestId('editor-part')) {
      expect(el.querySelectorAll('[data-cell-badge]').length).toBeLessThanOrEqual(1);
    }
    // the locked+new crown still says NEW (inside its single price chip)
    const crown = cell('crystalCrown');
    expect(crown.querySelectorAll('[data-cell-badge]')).toHaveLength(1);
    expect(within(crown).getByText('avatarBuilder.new')).toBeInTheDocument();
  });
});
