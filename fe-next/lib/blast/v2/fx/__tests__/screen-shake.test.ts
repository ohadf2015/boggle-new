import { describe, it, expect, vi } from 'vitest';
import { useScreenShake, ShakeIntensity } from '../screen-shake';
import * as framerMotion from 'framer-motion';

// Mock framer-motion useReducedMotion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof framerMotion>('framer-motion');
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

describe('useScreenShake', () => {
  it('should increment data-shake-key on light intensity', () => {
    const container = document.createElement('div');
    container.setAttribute('data-shake-key', '0');
    const boardRef = { current: container } as React.RefObject<HTMLDivElement>;

    const shake = useScreenShake(boardRef);
    shake('light');

    expect(container.getAttribute('data-shake-key')).toBe('1');
  });

  it('should increment data-shake-key multiple times', () => {
    const container = document.createElement('div');
    container.setAttribute('data-shake-key', '0');
    const boardRef = { current: container } as React.RefObject<HTMLDivElement>;

    const shake = useScreenShake(boardRef);
    shake('light');
    shake('medium');
    shake('heavy');

    expect(container.getAttribute('data-shake-key')).toBe('3');
  });

  it('should handle missing initial data-shake-key attribute', () => {
    const container = document.createElement('div');
    // no data-shake-key initially
    const boardRef = { current: container } as React.RefObject<HTMLDivElement>;

    const shake = useScreenShake(boardRef);
    shake('light');

    expect(container.getAttribute('data-shake-key')).toBe('1');
  });

  it('should skip shake if reduced motion is enabled', () => {
    vi.mocked(framerMotion.useReducedMotion).mockReturnValue(true);

    const container = document.createElement('div');
    container.setAttribute('data-shake-key', '0');
    const boardRef = { current: container } as React.RefObject<HTMLDivElement>;

    const shake = useScreenShake(boardRef);
    shake('light');

    expect(container.getAttribute('data-shake-key')).toBe('0');
    vi.mocked(framerMotion.useReducedMotion).mockReturnValue(false);
  });

  it('should handle null boardRef gracefully', () => {
    const boardRef = { current: null } as React.RefObject<HTMLDivElement>;

    const shake = useScreenShake(boardRef);
    expect(() => shake('light')).not.toThrow();
  });
});
