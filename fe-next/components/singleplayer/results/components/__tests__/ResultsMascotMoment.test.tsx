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

  it('Given a win on a phone/webview, When mounted, Then a still pose does the slapstick beat instead of the clip', () => {
    staticOverlay = true;
    render(<ResultsMascotMoment celebration="knight" nearMiss={null} t={t} />);
    expect(screen.queryByTestId('mascot-celebration-video')).toBeNull();
    expect(screen.getByTestId('mascot-still')).toHaveAttribute('data-variant', 'celebration');
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
});
