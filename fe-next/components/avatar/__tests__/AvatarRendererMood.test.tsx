import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import { getSeededAvatarConfig, hashString, type CustomAvatarConfig } from '@/shared/types/customAvatar';

// A deterministic, fully-valid config; pin eyes so we can assert the swap.
const cfg: CustomAvatarConfig = {
  ...getSeededAvatarConfig(hashString('mood-test')),
  eyes: 'round',
  mouth: 'smile',
  eyebrows: 'natural',
};

describe('AvatarRenderer — mood wiring', () => {
  it('renders idle (no swap, no animation class) when mood is undefined', () => {
    const { getByTestId } = render(<AvatarRenderer config={cfg} disableEffects />);
    const svg = getByTestId('custom-avatar');
    expect(svg.getAttribute('data-mood')).toBe('idle');
    expect(svg.getAttribute('class') ?? '').not.toContain('avatar-mood-');
    expect(svg.getAttribute('aria-label')).toContain('round eyes');
  });

  it('swaps expression + adds shake class for wrong (and reflects in aria-label)', () => {
    const { getByTestId } = render(<AvatarRenderer config={cfg} mood="wrong" disableEffects />);
    const svg = getByTestId('custom-avatar');
    expect(svg.getAttribute('data-mood')).toBe('wrong');
    expect(svg.getAttribute('class') ?? '').toContain('avatar-mood-shake');
    // 'wrong' maps eyes -> 'dizzy'; aria-label is derived from the effective config
    expect(svg.getAttribute('aria-label')).toContain('dizzy eyes');
  });

  it('mood fires even with disableEffects (it is decoupled from the tier wrapper)', () => {
    const { getByTestId } = render(<AvatarRenderer config={cfg} mood="correct" disableEffects />);
    const svg = getByTestId('custom-avatar');
    expect(svg.getAttribute('class') ?? '').toContain('avatar-mood-pop');
  });

  it('idle mood explicitly = no animation class', () => {
    const { getByTestId } = render(<AvatarRenderer config={cfg} mood="idle" disableEffects />);
    const svg = getByTestId('custom-avatar');
    expect(svg.getAttribute('class') ?? '').not.toContain('avatar-mood-');
  });
});
