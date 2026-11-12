import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResultsMascotMoment } from '../ResultsMascotMoment';

let reducedEffects = false;
let staticOverlay = false;
const playSound = vi.fn();

vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [reducedEffects, vi.fn()] }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => false }));
vi.mock('@/lib/native/webViewLayerFlash', () => ({ prefersStaticFullscreenOverlay: () => staticOverlay }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound }) }));
vi.mock('@/components/mascot/MascotCelebrationVideo', () => ({
  MascotCelebrationVideo: ({ kind }: { kind: string }) => <div data-testid="mascot-celebration-video" data-kind={kind} />,
}));
vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid="mascot-still" data-variant={variant} />,
}));

const t = (key: string) => key;

describe('ResultsMascotMoment', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reducedEffects = false;
    staticOverlay = false;
    playSound.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('Given a win on desktop with effects on, When mounted, Then the celebration clip plays at the edge and never takes taps', () => {
    render(<ResultsMascotMoment celebration="champion" nearMiss={null} t={t} />);
    const root = screen.getByTestId('sp-mascot-moment');
    expect(root).toHaveAttribute('data-beat', 'celebrate');
    expect(root.className).toContain('pointer-events-none');
    expect(screen.getByTestId('mascot-celebration-video')).toHaveAttribute('data-kind', 'champion');
  });

  it('Given reduce effects, When mounted, Then only a still pose shows and no voice line plays', () => {
    reducedEffects = true;
    render(<ResultsMascotMoment celebration="champion" nearMiss={null} t={t} />);
    expect(screen.queryByTestId('mascot-celebration-video')).toBeNull();
    expect(screen.getByTestId('mascot-still')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(playSound).not.toHaveBeenCalled();
  });

  it('Given a close-to-best miss, When mounted, Then the mascot faceplants and says aww on the freeze-frame', () => {
    render(<ResultsMascotMoment celebration={null} nearMiss={{ kind: 'best', gap: 2 }} t={t} />);
    expect(screen.getByTestId('sp-mascot-moment')).toHaveAttribute('data-beat', 'faceplant');
    expect(screen.getByTestId('mascot-still')).toHaveAttribute('data-variant', 'oops');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(playSound).toHaveBeenCalledWith('mascotAww', expect.objectContaining({ requiresGameActive: false }));
  });

  it('Given the moment has played, When its time is up, Then it leaves the screen', () => {
    render(<ResultsMascotMoment celebration={null} nearMiss={{ kind: 'best', gap: 2 }} t={t} />);
    act(() => { vi.advanceTimersByTime(6000); });
    expect(screen.queryByTestId('sp-mascot-moment')).toBeNull();
  });

  it('Given nothing to react to, When mounted, Then nothing renders', () => {
    const { container } = render(<ResultsMascotMoment celebration={null} nearMiss={null} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given a win on a phone, When mounted, Then the small joy-jump clip plays at the edge instead of the video', () => {
    staticOverlay = true;
    render(<ResultsMascotMoment celebration="knight" nearMiss={null} t={t} />);
    expect(screen.queryByTestId('mascot-celebration-video')).toBeNull();
    const clip = screen.getByTestId('sp-mascot-clip');
    expect(clip.getAttribute('src')).toMatch(/^\/mascot\/anim\/joy-jump\.webp\?t=/);
    expect(clip.className).not.toMatch(/opacity-0|inset-0/);
    expect(screen.getByTestId('sp-mascot-moment').className).not.toContain('inset-0');
  });

  it('Given a close-to-best miss on a phone, When mounted, Then the faceplant clip plays', () => {
    staticOverlay = true;
    render(<ResultsMascotMoment celebration={null} nearMiss={{ kind: 'best', gap: 2 }} t={t} />);
    expect(screen.getByTestId('sp-mascot-clip').getAttribute('src')).toMatch(/^\/mascot\/anim\/faceplant-thumbsup\.webp\?t=/);
  });

  it('Given a phone clip is playing, When its duration is up, Then it hides', () => {
    staticOverlay = true;
    render(<ResultsMascotMoment celebration="champion" nearMiss={null} t={t} />);
    act(() => { vi.advanceTimersByTime(2600); });
    expect(screen.getByTestId('sp-mascot-clip')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.queryByTestId('sp-mascot-moment')).toBeNull();
  });

  it('Given the clip played on an earlier results screen, When a new one mounts, Then the clip src is fresh so it replays', () => {
    staticOverlay = true;
    const first = render(<ResultsMascotMoment celebration="champion" nearMiss={null} t={t} />);
    const firstSrc = screen.getByTestId('sp-mascot-clip').getAttribute('src');
    first.unmount();
    act(() => { vi.advanceTimersByTime(50); });
    render(<ResultsMascotMoment celebration="champion" nearMiss={null} t={t} />);
    expect(screen.getByTestId('sp-mascot-clip').getAttribute('src')).not.toBe(firstSrc);
  });

  it('Given reduce effects on a phone, When mounted, Then the still pose shows and no clip plays', () => {
    staticOverlay = true;
    reducedEffects = true;
    render(<ResultsMascotMoment celebration="champion" nearMiss={null} t={t} />);
    expect(screen.queryByTestId('sp-mascot-clip')).toBeNull();
    expect(screen.getByTestId('mascot-still')).toHaveAttribute('data-variant', 'celebration');
  });
});
