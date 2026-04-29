import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvatarRenderer from '../AvatarRenderer';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

// Mock SVG part modules
vi.mock('../parts/BaseParts', () => ({
  BASE_PARTS: { round: ({ fill }: any) => <circle data-testid="base" fill={fill} /> },
}));
vi.mock('../parts/EyeParts', () => ({
  EYE_PARTS: { round: () => <g data-testid="eyes" /> },
}));
vi.mock('../parts/MouthParts', () => ({
  MOUTH_PARTS: { smile: () => <g data-testid="mouth" /> },
}));
vi.mock('../parts/HairParts', () => ({
  HAIR_PARTS: { none: ({ fill }: any) => <g data-testid="hair" fill={fill} />, spiky: ({ fill }: any) => <g data-testid="hair" fill={fill} /> },
  HAIR_FRONT_PARTS: {},
}));
vi.mock('../parts/AccessoryParts', () => ({
  ACCESSORY_PARTS: { none: ({ fill }: any) => <g data-testid="accessory" fill={fill} /> },
}));

describe('AvatarRenderer', () => {
  it('renders without crashing with default config', () => {
    render(<AvatarRenderer config={DEFAULT_AVATAR_CONFIG} />);
    expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
  });

  it('renders an SVG element', () => {
    render(<AvatarRenderer config={DEFAULT_AVATAR_CONFIG} />);
    const svg = screen.getByTestId('custom-avatar');
    expect(svg.tagName).toBe('svg');
  });

  it('applies correct size', () => {
    render(<AvatarRenderer config={DEFAULT_AVATAR_CONFIG} size={128} />);
    const svg = screen.getByTestId('custom-avatar');
    expect(svg).toHaveAttribute('width', '128');
    expect(svg).toHaveAttribute('height', '128');
  });

  it('applies className', () => {
    render(<AvatarRenderer config={DEFAULT_AVATAR_CONFIG} className="my-class" />);
    const svg = screen.getByTestId('custom-avatar');
    expect(svg).toHaveClass('my-class');
  });

  describe('neo-brutalist v2', () => {
    it('uses hard offset shadow (no Gaussian blur)', () => {
      render(<AvatarRenderer config={DEFAULT_AVATAR_CONFIG} />);
      const svg = screen.getByTestId('custom-avatar');
      // Brand: hard shadow only, no blur
      expect(svg.querySelector('feDropShadow')).toBeNull();
      expect(svg.querySelector('feGaussianBlur')).toBeNull();
      // Hard-shadow filter must use offset
      const feOffset = svg.querySelector('feOffset');
      expect(feOffset).not.toBeNull();
      expect(feOffset?.getAttribute('dx')).toBe('2');
      expect(feOffset?.getAttribute('dy')).toBe('2');
    });

    it('renders halftone dot pattern overlay on background', () => {
      render(<AvatarRenderer config={DEFAULT_AVATAR_CONFIG} />);
      const svg = screen.getByTestId('custom-avatar');
      const pattern = svg.querySelector('pattern[data-halftone]');
      expect(pattern).not.toBeNull();
      // Pattern must contain at least one circle (the dot)
      expect(pattern?.querySelector('circle')).not.toBeNull();
    });

    it('hard-shadow filter floods solid black (no opacity blur)', () => {
      render(<AvatarRenderer config={DEFAULT_AVATAR_CONFIG} />);
      const svg = screen.getByTestId('custom-avatar');
      const flood = svg.querySelector('feFlood');
      expect(flood).not.toBeNull();
      expect(flood?.getAttribute('flood-color')).toBe('#000');
    });
  });

  describe('mode-color frame', () => {
    it('renders no frame when mode prop omitted (backwards compat)', () => {
      render(<AvatarRenderer config={DEFAULT_AVATAR_CONFIG} />);
      const svg = screen.getByTestId('custom-avatar');
      expect(svg.querySelector('[data-mode-frame]')).toBeNull();
    });

    it('renders pink frame for multiplayer mode', () => {
      render(<AvatarRenderer config={DEFAULT_AVATAR_CONFIG} mode="multiplayer" />);
      const frame = screen.getByTestId('custom-avatar').querySelector('[data-mode-frame]');
      expect(frame).not.toBeNull();
      expect(frame?.getAttribute('stroke')).toBe('#FF1493');
    });

    it('renders cyan frame for singleplayer mode', () => {
      render(<AvatarRenderer config={DEFAULT_AVATAR_CONFIG} mode="singleplayer" />);
      const frame = screen.getByTestId('custom-avatar').querySelector('[data-mode-frame]');
      expect(frame?.getAttribute('stroke')).toBe('#00FFFF');
    });

    it('renders purple frame for brain mode', () => {
      render(<AvatarRenderer config={DEFAULT_AVATAR_CONFIG} mode="brain" />);
      const frame = screen.getByTestId('custom-avatar').querySelector('[data-mode-frame]');
      expect(frame?.getAttribute('stroke')).toBe('#8B5CF6');
    });

    it('renders lime frame for default/practice mode', () => {
      render(<AvatarRenderer config={DEFAULT_AVATAR_CONFIG} mode="practice" />);
      const frame = screen.getByTestId('custom-avatar').querySelector('[data-mode-frame]');
      expect(frame?.getAttribute('stroke')).toBe('#BFFF00');
    });
  });
});
