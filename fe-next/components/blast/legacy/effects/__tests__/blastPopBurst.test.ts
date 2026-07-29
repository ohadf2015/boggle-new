import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPopBurst } from '../blastPopBurst';

vi.mock('gsap', () => {
  const tl = {
    to: vi.fn().mockReturnThis(),
    fromTo: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    eventCallback: vi.fn().mockReturnThis(),
    kill: vi.fn(),
  };
  return {
    default: {
      timeline: vi.fn(() => tl),
    },
    gsap: {
      timeline: vi.fn(() => tl),
    },
  };
});

describe('createPopBurst', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a timeline + dispose handle', () => {
    const el = document.createElement('div');
    const result = createPopBurst({ el, color: '#BFFF00' });
    expect(result).toHaveProperty('timeline');
    expect(result).toHaveProperty('dispose');
    expect(typeof result.dispose).toBe('function');
  });

  it('runs back.out scale spring then fade', async () => {
    const gsap = (await import('gsap')).default;
    const el = document.createElement('div');
    createPopBurst({ el, color: '#BFFF00' });
    expect(gsap.timeline).toHaveBeenCalledTimes(1);
    const tl = (gsap.timeline as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(tl.fromTo).toHaveBeenCalled();
    const fromToCall = tl.fromTo.mock.calls[0];
    const toVars = fromToCall[2];
    expect(toVars.ease).toMatch(/back\.out/);
  });

  it('dispose kills the timeline (cleanup safety)', () => {
    const el = document.createElement('div');
    const { dispose, timeline } = createPopBurst({ el, color: '#BFFF00' });
    dispose();
    expect((timeline.kill as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('calls onComplete via timeline eventCallback when provided', () => {
    const el = document.createElement('div');
    const onComplete = vi.fn();
    const { timeline } = createPopBurst({ el, color: '#BFFF00', onComplete });
    expect((timeline.eventCallback as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('onComplete', onComplete);
  });
});
