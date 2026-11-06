import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { GhostRivalsLayer } from '../GhostRivalsLayer';
import type { GhostRival } from '@/lib/wordTowerV2/rush/types';

afterEach(cleanup);

const t = (key: string, p?: Record<string, string | number>) => (p ? `${p.m}m` : key);
const rival = (id: string, name: string, peakM: number): GhostRival => ({ id, name, peakM });

describe('GhostRivalsLayer', () => {
  it('given a rival above the screen, when rendered, then the tag is a small arrow and height, not a name', () => {
    const { container } = render(
      <GhostRivalsLayer t={t} rivals={[rival('a', 'Guest Player', 53)]} heightToY={() => -400} viewportHeight={600} />,
    );
    const tag = container.querySelector('[data-rival-tag]');
    expect(tag?.getAttribute('data-offscreen')).toBe('true');
    expect(tag?.textContent).not.toContain('Guest Player');
    expect(tag?.textContent).toContain('53m');
  });

  it('given a rival whose height is on screen, when rendered, then the tag names them', () => {
    const { container } = render(
      <GhostRivalsLayer t={t} rivals={[rival('a', 'Guest Player', 12)]} heightToY={() => 200} viewportHeight={600} />,
    );
    const tag = container.querySelector('[data-rival-tag]');
    expect(tag?.getAttribute('data-offscreen')).toBeNull();
    expect(tag?.textContent).toContain('Guest Player');
  });
});
