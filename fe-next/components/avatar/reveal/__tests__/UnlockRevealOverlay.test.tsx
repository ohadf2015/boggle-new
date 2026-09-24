import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';
import { buildUnlockReveal, __resetRevealSessionForTests } from '@/lib/avatar/revealTrigger';
import { LEVEL_UNLOCK_LADDER } from '@/lib/avatar/unlocks';
import { revealAttitude } from '../revealAttitude';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, a?: unknown, b?: unknown) => {
      const p = (a && typeof a === 'object' ? a : b) as Record<string, unknown> | undefined;
      return p ? `${key}:${JSON.stringify(p)}` : key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));
const rendered = vi.hoisted(() => ({ configs: [] as Array<Record<string, unknown>>, props: [] as Array<Record<string, unknown>> }));
vi.mock('@/components/avatar/AvatarRenderer', () => ({
  __esModule: true,
  // the stage nests the renderer's <svg> inside its own SVG, so the stub is an <svg> too
  default: (props: { config: Record<string, unknown> } & Record<string, unknown>) => {
    const { config } = props;
    rendered.configs.push(config);
    rendered.props.push(props);
    return (
      <svg
        data-testid="avatar-renderer"
        data-accessory={String(config.accessory)}
        data-bg={String(config.bgColor)}
        data-eyes={String(config.eyes)}
        data-mouth={String(config.mouth)}
      />
    );
  },
}));

const share = vi.hoisted(() => ({ fn: vi.fn(async (_o: unknown) => 'shared' as string) }));
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: share.fn }));

import UnlockRevealOverlay from '../UnlockRevealOverlay';

const multi = () => buildUnlockReveal({ oldLevel: 4, newLevel: 6 })!; // cowboyHat, #4B0082, heartEye
const single = () => buildUnlockReveal({ oldLevel: 1, newLevel: 2 })!; // headphones

function setup(over: Partial<React.ComponentProps<typeof UnlockRevealOverlay>> = {}) {
  const props = {
    reveal: multi(),
    config: DEFAULT_AVATAR_CONFIG,
    isGuest: false,
    onEquip: vi.fn(async () => true),
    onSignUp: vi.fn(),
    onClose: vi.fn(),
    onShown: vi.fn(),
    portal: false,
    ...over,
  };
  const utils = render(<UnlockRevealOverlay {...props} />);
  return { props, ...utils };
}

beforeEach(() => {
  __resetRevealSessionForTests();
  rendered.configs = [];
  rendered.props = [];
  share.fn.mockReset();
  share.fn.mockResolvedValue('shared');
});

describe('UnlockRevealOverlay', () => {
  it('is a modal dialog on a hardcoded navy full layer with no fade-in on the layer', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const layer = screen.getByTestId('unlock-reveal');
    expect(layer.className).toContain('bg-neo-navy');
    expect(layer.className).not.toMatch(/opacity-0|dark:bg-|bg-neo-cream/);
  });

  it('shows the rarity label, part name and the avatar wearing the new part', () => {
    setup({ reveal: single() });
    expect(screen.getByTestId('unlock-reveal')).toHaveAttribute('data-rarity', 'rare');
    expect(screen.getByText('avatarBuilder.tiers.rare')).toBeInTheDocument();
    expect(screen.getByText('revealUnlock.parts.headphones')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-renderer')).toHaveAttribute('data-accessory', 'headphones');
  });

  it('hides the counter for a single unlock', () => {
    setup({ reveal: single() });
    expect(screen.queryByTestId('unlock-reveal-counter')).not.toBeInTheDocument();
  });

  it('shows "x of N" and advances on a stage tap', () => {
    setup();
    expect(screen.getByTestId('unlock-reveal-counter')).toHaveTextContent('revealUnlock.counter:{"current":1,"total":3}');
    fireEvent.click(screen.getByTestId('unlock-reveal-stage'));
    expect(screen.getByTestId('unlock-reveal-counter')).toHaveTextContent('revealUnlock.counter:{"current":2,"total":3}');
    expect(screen.getByText('revealUnlock.parts.bg4B0082')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-renderer')).toHaveAttribute('data-bg', '#4B0082');
    fireEvent.click(screen.getByTestId('unlock-reveal-stage'));
    expect(screen.getByTestId('unlock-reveal')).toHaveAttribute('data-rarity', 'epic');
    // last one: a stage tap does not wrap or close
    fireEvent.click(screen.getByTestId('unlock-reveal-stage'));
    expect(screen.getByTestId('unlock-reveal-counter')).toHaveTextContent('"current":3');
  });

  it('Equip now applies the CURRENT part, then advances', async () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: /revealUnlock.equip/ }));
    await waitFor(() => expect(props.onEquip).toHaveBeenCalledWith(expect.objectContaining({ partId: 'cowboyHat' })));
    await waitFor(() => expect(screen.getByTestId('unlock-reveal-counter')).toHaveTextContent('"current":2'), { timeout: 2000 });
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('Equip on the last unlock closes the reveal', async () => {
    const { props } = setup({ reveal: single() });
    fireEvent.click(screen.getByRole('button', { name: /revealUnlock.equip/ }));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });

  it('keeps the reveal open with an error when equipping fails', async () => {
    const onEquip = vi.fn(async () => false);
    const { props } = setup({ reveal: single(), onEquip });
    fireEvent.click(screen.getByRole('button', { name: /revealUnlock.equip/ }));
    expect(await screen.findByText('revealUnlock.equipError')).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('Later closes without equipping; Escape does the same', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'revealUnlock.later' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(2);
    expect(props.onEquip).not.toHaveBeenCalled();
  });

  it('guests get the sign-up tease instead of Equip', () => {
    const { props } = setup({ isGuest: true });
    expect(screen.queryByRole('button', { name: /revealUnlock.equip/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /revealUnlock.guestTitle/ }));
    expect(props.onSignUp).toHaveBeenCalledTimes(1);
    expect(screen.getByText('revealUnlock.guestBody')).toBeInTheDocument();
  });

  it('calls onShown exactly once, not per advance', () => {
    const { props } = setup();
    fireEvent.click(screen.getByTestId('unlock-reveal-stage'));
    expect(props.onShown).toHaveBeenCalledTimes(1);
  });

  it('reduced motion renders a static burst', () => {
    setup({ reducedMotion: true });
    expect(screen.getByTestId('unlock-reveal')).toHaveAttribute('data-motion', 'static');
  });

  it('the avatar wears the part and pulls THAT item\'s face (not one stock grin)', () => {
    setup({ reveal: single() });
    const face = revealAttitude(LEVEL_UNLOCK_LADDER.find(u => u.partId === 'headphones')!).face;
    const avatar = screen.getByTestId('avatar-renderer');
    expect(avatar).toHaveAttribute('data-accessory', 'headphones');
    expect(avatar).toHaveAttribute('data-mouth', String(face.mouth));
    expect(avatar).toHaveAttribute('data-eyes', String(face.eyes));
  });

  it('eyes reward: the avatar shows the NEW eyes, not the cheer eyes', () => {
    setup({ reveal: buildUnlockReveal({ oldLevel: 5, newLevel: 6 })! }); // heartEye
    expect(screen.getByTestId('avatar-renderer')).toHaveAttribute('data-eyes', 'heartEye');
  });

  it('stages the avatar popping out of a reward box, with the item\'s own effect and pose', () => {
    setup(); // cowboyHat first
    const hat = revealAttitude(LEVEL_UNLOCK_LADDER.find(u => u.partId === 'cowboyHat')!);
    const scene = screen.getByTestId('unlock-reveal-scene');
    expect(scene).toHaveAttribute('data-fx', hat.fx);
    expect(scene).toHaveAttribute('data-pose', hat.pose);
    expect(screen.getByTestId('unlock-reveal-box')).toBeInTheDocument();
    expect(scene.querySelectorAll('[data-fx-glyph]').length).toBeGreaterThanOrEqual(4);
    // the avatar stands free in the cutout scope, rendered bare (no tier frame, nestable svg)
    expect(scene.querySelector('.lcr-cutout [data-testid="avatar-renderer"]')).not.toBeNull();
    expect(rendered.props[rendered.props.length - 1]).toEqual(expect.objectContaining({ forceTier: 'free', disableEffects: true }));
    // a part unlock has no color backdrop
    expect(screen.queryByTestId('unlock-reveal-backdrop')).not.toBeInTheDocument();
    // still exactly ONE full avatar on screen (no second copy of the face)
    expect(screen.getAllByTestId('avatar-renderer')).toHaveLength(1);
  });

  it('a background unlock shows the new color as a big backdrop behind the avatar', () => {
    setup();
    fireEvent.click(screen.getByTestId('unlock-reveal-stage')); // #4B0082
    const backdrop = screen.getByTestId('unlock-reveal-backdrop');
    expect((backdrop.getAttribute('fill') ?? '').toUpperCase()).toBe('#4B0082');
    expect(screen.getAllByTestId('avatar-renderer')).toHaveLength(1);
  });

  it('shows the item\'s one-liner under the name', () => {
    setup({ reveal: single() });
    expect(screen.getByText('revealUnlock.voice.headphones')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
  });

  it('has a confetti burst that is still there with reduced motion (settled pose, not hidden)', () => {
    setup({ reducedMotion: true });
    const confetti = screen.getByTestId('unlock-reveal-confetti');
    expect(confetti.children.length).toBeGreaterThanOrEqual(16);
  });

  it('Share hands the part name + a link to the share helper (emoji-stripped choke point)', async () => {
    setup({ reveal: single(), shareUrl: 'https://example.test/en/u/ada?from=share' });
    fireEvent.click(screen.getByRole('button', { name: 'revealUnlock.share' }));
    await waitFor(() => expect(share.fn).toHaveBeenCalledTimes(1));
    const arg = share.fn.mock.calls[0][0] as { text: string; url: string };
    expect(arg.url).toBe('https://example.test/en/u/ada?from=share');
    expect(arg.text).toContain('revealUnlock.shareText');
    expect(arg.text).toContain('revealUnlock.parts.headphones');
  });

  it('Share falls back to "copied" feedback when there is no share sheet', async () => {
    share.fn.mockResolvedValue('copied');
    setup({ reveal: single() });
    fireEvent.click(screen.getByRole('button', { name: 'revealUnlock.share' }));
    expect(await screen.findByText('revealUnlock.copied')).toBeInTheDocument();
  });

  it('guests can share too (bragging is how friends find the game)', () => {
    setup({ isGuest: true });
    expect(screen.getByRole('button', { name: 'revealUnlock.share' })).toBeInTheDocument();
  });

  it('renders through a portal on document.body by default', async () => {
    await act(async () => {
      render(
        <div data-testid="host">
          <UnlockRevealOverlay reveal={single()} config={DEFAULT_AVATAR_CONFIG} isGuest={false} onEquip={async () => true} onSignUp={() => {}} onClose={() => {}} />
        </div>,
      );
    });
    const layer = screen.getByTestId('unlock-reveal');
    expect(screen.getByTestId('host')).not.toContainElement(layer);
    expect(layer.parentElement).toBe(document.body);
  });
});
