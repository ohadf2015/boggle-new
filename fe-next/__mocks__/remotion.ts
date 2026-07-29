// Vitest mock for the 'remotion' package
// remotion's CJS bundle uses internal state that fails in jsdom
// Exports use vi.fn() so tests can override via mockReturnValue/mockImplementation
import React from 'react';
import { vi } from 'vitest';

export const AbsoluteFill = React.forwardRef(
  ({ children, style, ...props }: any, ref: any) =>
    React.createElement('div', { 'data-testid': 'absolute-fill', style, ref, ...props }, children)
);
AbsoluteFill.displayName = 'AbsoluteFill';

export const Sequence = ({ children, from, durationInFrames, ...props }: any) =>
  React.createElement('div', { 'data-testid': 'sequence', 'data-from': from, 'data-duration': durationInFrames, ...props }, children);

export const Img = React.forwardRef(
  (props: any, ref: any) => React.createElement('img', { 'data-testid': 'remotion-img', ref, ...props })
);
Img.displayName = 'Img';

export const useCurrentFrame = vi.fn(() => 0);
export const useVideoConfig = vi.fn(() => ({ fps: 30, durationInFrames: 90, width: 1920, height: 1080 }));

export const interpolate = vi.fn((frame: number, inputRange: number[], outputRange: number[]) => {
  if (frame <= inputRange[0]) return outputRange[0];
  if (frame >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1];
  return outputRange[0];
});

export const spring = vi.fn(() => 0);
export const staticFile = vi.fn((path: string) => path);
export const registerRoot = vi.fn();

export const Easing = {
  bezier: () => (t: number) => t,
  linear: (t: number) => t,
  ease: (t: number) => t,
  inOut: () => (t: number) => t,
};
