import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BlastPopBurst } from '../BlastPopBurst';

vi.mock('gsap', () => {
  const tl = {
    to: vi.fn().mockReturnThis(),
    fromTo: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    eventCallback: vi.fn().mockReturnThis(),
    kill: vi.fn(),
  };
  return {
    default: { timeline: vi.fn(() => tl) },
    gsap: { timeline: vi.fn(() => tl) },
  };
});

afterEach(() => cleanup());

describe('BlastPopBurst', () => {
  it('renders one chip per burst event', () => {
    const { container } = render(
      <BlastPopBurst
        bursts={[
          { id: 'a', startX: 50, startY: 60, color: '#BFFF00' },
          { id: 'b', startX: 30, startY: 40, color: '#00FFFF' },
        ]}
        onComplete={() => {}}
      />,
    );
    expect(container.querySelectorAll('[data-testid="blast-pop-burst"]').length).toBe(2);
  });

  it('positions chip via inline left/top percentages', () => {
    const { container } = render(
      <BlastPopBurst
        bursts={[{ id: 'a', startX: 25, startY: 75, color: '#FF1493' }]}
        onComplete={() => {}}
      />,
    );
    const el = container.querySelector('[data-testid="blast-pop-burst"]') as HTMLElement;
    expect(el.style.left).toBe('25%');
    expect(el.style.top).toBe('75%');
  });

  it('renders empty when no bursts', () => {
    const { container } = render(<BlastPopBurst bursts={[]} onComplete={() => {}} />);
    expect(container.querySelectorAll('[data-testid="blast-pop-burst"]').length).toBe(0);
  });
});
