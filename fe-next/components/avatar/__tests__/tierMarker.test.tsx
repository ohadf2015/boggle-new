import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvatarRenderer from '../AvatarRenderer';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';

const epic: CustomAvatarConfig = { ...DEFAULT_AVATAR_CONFIG, eyes: 'galaxy' };
const legendary: CustomAvatarConfig = { ...DEFAULT_AVATAR_CONFIG, eyes: 'infinity' };

const gem = (c: HTMLElement) => c.querySelector('[data-tier-gem]');

describe('AvatarRenderer tierMarker (static rarity gem)', () => {
  it('is off by default — no gem even on legendary', () => {
    const { container } = render(<AvatarRenderer config={legendary} disableEffects />);
    expect(gem(container)).toBeNull();
  });

  it('shows a gold gem for legendary when opted in', () => {
    const { container } = render(<AvatarRenderer config={legendary} disableEffects tierMarker />);
    expect(gem(container)?.getAttribute('data-tier-gem')).toBe('legendary');
  });

  it('shows a purple gem for epic when opted in', () => {
    const { container } = render(<AvatarRenderer config={epic} disableEffects tierMarker />);
    expect(gem(container)?.getAttribute('data-tier-gem')).toBe('epic');
  });

  it('no gem for a free avatar even when opted in', () => {
    const { container } = render(<AvatarRenderer config={DEFAULT_AVATAR_CONFIG} disableEffects tierMarker />);
    expect(gem(container)).toBeNull();
  });

  it('survives disableEffects (baked into the SVG, not the CSS wrapper)', () => {
    const { container } = render(<AvatarRenderer config={legendary} disableEffects tierMarker />);
    expect(container.querySelector('[data-testid="custom-avatar"]')).toBeTruthy();
    expect(gem(container)).toBeTruthy();
  });

  it('suppresses the gem when a mode frame owns the border', () => {
    const { container } = render(<AvatarRenderer config={legendary} disableEffects tierMarker mode="multiplayer" />);
    expect(gem(container)).toBeNull();
  });

  it('suppresses the gem when a reaction overlay owns the corner', () => {
    const { container } = render(<AvatarRenderer config={legendary} disableEffects tierMarker overlay="flame" />);
    expect(gem(container)).toBeNull();
  });
});
