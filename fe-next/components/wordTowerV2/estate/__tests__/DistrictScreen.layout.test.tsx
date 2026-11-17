import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { emptyEstate } from '@/lib/wordTowerV2/estate';
import type { UseEstate } from '../../useEstate';
import { DistrictScreen } from '../DistrictScreen';
import { PartArt } from '../PartArt';

vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound: vi.fn() }) }));
vi.mock('@/hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => true }));

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

function api(overrides: Partial<UseEstate> = {}): UseEstate {
  return {
    status: 'ready',
    authed: true,
    estate: { ...emptyEstate(), coins: 8000 },
    perks: { baseWidthMult: 1, swayMult: 1, swingPeriodMult: 1, perfectWindowMult: 1, coinMult: 1, shieldCap: 0, scoreMult: 1, freeBraces: 0 },
    inbox: [],
    reportRun: vi.fn(),
    upgrade: vi.fn(),
    repair: vi.fn(),
    buyCharge: vi.fn(),
    rivals: vi.fn(),
    raid: vi.fn(),
    markSeen: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as UseEstate;
}

describe('DistrictScreen layout', () => {
  it('lets the diorama scroll instead of clipping the back-row roofs', () => {
    render(<DistrictScreen t={t} estate={api()} onClose={() => undefined} />);
    const diorama = screen.getByTestId('estate-diorama');
    expect(diorama.className).toMatch(/overflow-y-auto/);
    expect(diorama.className).not.toMatch(/overflow-hidden/);
  });

  it('marks the selected plot clearly and moves the selection on tap', () => {
    render(<DistrictScreen t={t} estate={api()} onClose={() => undefined} />);
    // The first affordable slot (foundation) is auto-selected on open.
    const foundation = screen.getAllByTestId('plot-card-foundation')[0];
    expect(foundation).toHaveAttribute('data-selected', 'true');
    expect(foundation).toHaveAttribute('aria-pressed', 'true');
    expect(foundation.className).toMatch(/ring-neo-yellow/);

    const crane = screen.getAllByTestId('plot-card-craneYard')[0];
    fireEvent.click(crane);
    expect(screen.getAllByTestId('plot-card-craneYard')[0]).toHaveAttribute('data-selected', 'true');
    expect(screen.getAllByTestId('plot-card-foundation')[0]).not.toHaveAttribute('data-selected');
  });
});

describe('PartArt', () => {
  it('does not sit the tower on a full-width black slab', () => {
    const { container } = render(<PartArt slot="foundation" level={1} material={{ id: 'brick', main: 0xc8553d, trim: 0x7a2e1f, glow: 0xffb38a }} />);
    const slabs = [...container.querySelectorAll('rect')].filter((r) => r.getAttribute('width') === '120' && (r.getAttribute('fill') || '').toLowerCase() === '#141830');
    expect(slabs).toHaveLength(0);
    expect(container.querySelector('ellipse')).toBeTruthy();
  });
});
