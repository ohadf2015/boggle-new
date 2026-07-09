import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { WordTowerMinimap } from '../WordTowerMinimap';
import type { RivalMarker } from '@/lib/wordTower/rivals';

afterEach(cleanup);

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k} ${JSON.stringify(p)}` : k);

const rivals: RivalMarker[] = [
  { id: 'r1', name: 'Ann', heightM: 180, highestBiome: 'sky' },
  { id: 'r2', name: 'Bo', heightM: 260, highestBiome: 'orbit' },
];

describe('WordTowerMinimap — clearer hierarchy + markers', () => {
  it('renders zone bands with data-zone ids for every biome slice', () => {
    const { container } = render(
      <WordTowerMinimap heightM={600} viewM={600} personalBestM={0} rivals={rivals} onScrollTop={() => {}} t={t} />,
    );
    const zones = container.querySelectorAll('[data-zone]');
    expect(zones.length).toBeGreaterThanOrEqual(4);
  });

  it('marks self climber, PB, and rival ticks with testable roles', () => {
    // heights of rivals sit under scaleMax(heightM, personalBestM)
    const { container } = render(
      <WordTowerMinimap
        heightM={100}
        viewM={100}
        personalBestM={300}
        rivals={rivals}
        onScrollTop={vi.fn()}
        t={t}
      />,
    );
    expect(container.querySelector('[data-marker="self"]')).toBeTruthy();
    expect(container.querySelector('[data-marker="pb"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-marker="rival"]').length).toBe(2);
  });

  it('shows height caption and optional view marker when panned', () => {
    const { container } = render(
      <WordTowerMinimap heightM={200} viewM={50} personalBestM={0} onScrollTop={() => {}} t={t} />,
    );
    expect(screen.getByText(/200\s*m/)).toBeTruthy();
    expect(container.querySelector('[data-marker="view"]')).toBeTruthy();
  });

  it('uses an enriched rail width for readable zone bands', () => {
    const { container } = render(
      <WordTowerMinimap heightM={100} viewM={100} personalBestM={0} onScrollTop={() => {}} t={t} />,
    );
    const rail = container.querySelector('[data-minimap-rail]');
    expect(rail).toBeTruthy();
    expect(rail?.getAttribute('data-enriched')).toBe('true');
  });
});
