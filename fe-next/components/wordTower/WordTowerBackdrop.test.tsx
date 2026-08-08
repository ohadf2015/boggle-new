import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WordTowerBackdrop } from './WordTowerBackdrop';

/** The signature zone layers are the only ones that blend with 'screen'. */
const features = (c: HTMLElement) =>
  Array.from(c.querySelectorAll<HTMLElement>('div')).filter((el) => el.style.mixBlendMode === 'screen');

const sky = (biomeId: 'sky' | 'nebula' | 'galaxy', heightM: number) =>
  render(<WordTowerBackdrop band="sky" biomeId={biomeId} heightM={heightM} />).container;

describe('WordTowerBackdrop — signature zone layers', () => {
  it('draws none in the lower zones', () => {
    expect(features(sky('sky', 100))).toHaveLength(0);
  });

  it('draws the zone layer once inside a zone', () => {
    expect(features(sky('nebula', 500))).toHaveLength(1);
  });

  it('CROSS-FADES two layers mid-band instead of cutting between them', () => {
    // 650m is halfway from nebula (500) to galaxy (800). `backgroundImage` is not
    // an animatable property, so without this both would hard-switch at 800m —
    // the galactic band would pop into existence on a single frame.
    const els = features(sky('nebula', 650));
    expect(els).toHaveLength(2);
    const opacities = els.map((el) => Number(el.style.opacity)).sort((a, b) => a - b);
    expect(opacities[0]).toBeGreaterThan(0);
    expect(opacities[1]).toBeGreaterThan(0);
  });

  it('draws only one layer at the top zone, where there is nothing above to fade toward', () => {
    expect(features(sky('galaxy', 900))).toHaveLength(1);
  });

  it('keeps the zone layer out of the non-sky bands', () => {
    const { container } = render(<WordTowerBackdrop band="front" biomeId="nebula" heightM={650} />);
    expect(features(container)).toHaveLength(0);
  });
});
