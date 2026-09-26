import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${Object.values(p).join(' ')}` : k), language: 'en' }),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} />,
}));

import FoeTarget from '../FoeTarget';

describe('FoeTarget — defeat collapse', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('foe card renders when alive', () => {
    const { container } = render(
      <FoeTarget world={1} score={50} stars={[100, 130, 160]} lastHit={null} combat={null} />
    );

    const foeDiv = container.querySelector('[data-testid="adv-foe"]');
    expect(foeDiv).toBeInTheDocument();
  });

  it('foe card shows defeated state (foeDown text) immediately on defeat', () => {
    const { container, debug } = render(
      <FoeTarget world={1} score={160} stars={[100, 130, 160]} lastHit={null} combat={null} />
    );

    // Verify the component is showing defeat status
    const foeDiv = container.querySelector('[data-testid="adv-foe"]');
    expect(foeDiv?.textContent).toContain('adventurePlay.juice.foeDown');
  });

  it('foe card collapses (unmounts) after ~1.2s when defeated', () => {
    const { container, rerender } = render(
      <FoeTarget world={1} score={160} stars={[100, 130, 160]} lastHit={null} combat={null} />
    );

    // At t=0: card is present with defeat text
    let foeDiv = container.querySelector('[data-testid="adv-foe"]');
    expect(foeDiv).toBeInTheDocument();
    expect(foeDiv?.textContent).toContain('adventurePlay.juice.foeDown');

    // At t=1199ms: card still present
    vi.advanceTimersByTime(1199);
    rerender(
      <FoeTarget world={1} score={160} stars={[100, 130, 160]} lastHit={null} combat={null} />
    );

    foeDiv = container.querySelector('[data-testid="adv-foe"]');
    expect(foeDiv).toBeInTheDocument();
    expect(foeDiv?.textContent).toContain('adventurePlay.juice.foeDown');

    // At t=1200ms: card is unmounted (returns null)
    vi.advanceTimersByTime(1);
    rerender(
      <FoeTarget world={1} score={160} stars={[100, 130, 160]} lastHit={null} combat={null} />
    );

    foeDiv = container.querySelector('[data-testid="adv-foe"]');
    expect(foeDiv).toBeNull();
  });

  it('foe card collapses despite re-renders while timer is active', () => {
    const { container, rerender } = render(
      <FoeTarget world={1} score={160} stars={[100, 130, 160]} lastHit={null} combat={null} />
    );

    // Defeat and start the timer
    expect(container.querySelector('[data-testid="adv-foe"]')).toBeInTheDocument();

    // Advance 600ms and rerender with a new stars array (simulating AdventureLevel's 5x/s renders)
    vi.advanceTimersByTime(600);
    rerender(
      <FoeTarget world={1} score={160} stars={[100, 130, 160]} lastHit={null} combat={null} />
    );

    let foeDiv = container.querySelector('[data-testid="adv-foe"]');
    expect(foeDiv).toBeInTheDocument();

    // Advance to 1200ms total
    vi.advanceTimersByTime(600);
    rerender(
      <FoeTarget world={1} score={160} stars={[100, 130, 160]} lastHit={null} combat={null} />
    );

    foeDiv = container.querySelector('[data-testid="adv-foe"]');
    expect(foeDiv).toBeNull();
  });

  it('foe card does not collapse while alive (advance 5000ms)', () => {
    const { container } = render(
      <FoeTarget world={1} score={50} stars={[100, 130, 160]} lastHit={null} combat={null} />
    );

    // Advance 5 seconds
    vi.advanceTimersByTime(5000);

    const foeDiv = container.querySelector('[data-testid="adv-foe"]');
    expect(foeDiv).toBeInTheDocument();
  });
});
