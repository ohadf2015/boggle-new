import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvatarRenderer from '../AvatarRenderer';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

// Mock SVG part modules
jest.mock('../parts/BaseParts', () => ({
  BASE_PARTS: { round: ({ fill }: any) => <circle data-testid="base" fill={fill} /> },
}));
jest.mock('../parts/EyeParts', () => ({
  EYE_PARTS: { round: () => <g data-testid="eyes" /> },
}));
jest.mock('../parts/MouthParts', () => ({
  MOUTH_PARTS: { smile: () => <g data-testid="mouth" /> },
}));
jest.mock('../parts/HairParts', () => ({
  HAIR_PARTS: { none: ({ fill }: any) => <g data-testid="hair" fill={fill} />, spiky: ({ fill }: any) => <g data-testid="hair" fill={fill} /> },
}));
jest.mock('../parts/AccessoryParts', () => ({
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
});
