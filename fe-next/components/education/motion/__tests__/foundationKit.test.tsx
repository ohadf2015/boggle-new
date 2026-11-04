import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { motionPref } from './reducedMotion.mock';
import * as kit from '../index';
import { useEduReducedMotion } from '@/lib/education/motion';
import { EDU_DUR, EDU_EASE } from '@/lib/education/motion/tokens';

vi.unmock('framer-motion');

beforeEach(() => {
  motionPref.reduced = false;
});

describe('kit tokens', () => {
  it('re-exports the lib durations and eases, so there is one source of timing', () => {
    expect(kit.EDU_MOTION.dur).toBe(EDU_DUR);
    expect(kit.EDU_MOTION.ease).toBe(EDU_EASE);
  });

  it('defines press, pop and settle springs', () => {
    for (const name of ['press', 'pop', 'settle'] as const) {
      expect(kit.EDU_MOTION.spring[name].type).toBe('spring');
      expect(kit.EDU_MOTION.spring[name].stiffness).toBeGreaterThan(0);
    }
  });

  it('caps a whole stagger so long lists never trail on', () => {
    expect(kit.staggerDelay(0)).toBe(0);
    expect(kit.staggerDelay(1)).toBeCloseTo(kit.EDU_MOTION.stagger.step);
    expect(kit.staggerDelay(500)).toBe(kit.EDU_MOTION.stagger.max);
  });
});

describe('useReducedMotionSafe', () => {
  it('is the edu hook itself, so surfaces never disagree', () => {
    expect(kit.useReducedMotionSafe).toBe(useEduReducedMotion);
  });
});

describe('AnimatedNumber', () => {
  it('is the existing CountUp', () => {
    expect(kit.AnimatedNumber).toBe(kit.CountUp);
  });
});

describe('pressMotion', () => {
  it('scales down on tap with the press spring', () => {
    const p = kit.pressMotion(false);
    expect(p.whileTap).toEqual({ scale: kit.EDU_MOTION.press.scale });
    expect(p.transition).toBe(kit.EDU_MOTION.spring.press);
  });

  it('adds no motion under reduced motion; the shadow lip from pressClasses still cues the press', () => {
    expect(kit.pressMotion(true)).toEqual({});
  });
});

describe('Reveal', () => {
  it('starts offset by a transform, never hidden', () => {
    render(<kit.Reveal>edu.card</kit.Reveal>);
    const el = screen.getByText('edu.card');
    expect(el.style.transform).toMatch(/translateY\(12px\)/);
    expect(el.style.opacity).toBe('');
  });

  it('renders in place with no transform under reduced motion', () => {
    motionPref.reduced = true;
    render(<kit.Reveal>edu.card</kit.Reveal>);
    expect(screen.getByText('edu.card').style.transform).not.toMatch(/translateY/);
  });
});

describe('Stagger', () => {
  it('wraps every child in a Reveal, in order', () => {
    render(
      <kit.Stagger>
        <span>edu.a</span>
        <span>edu.b</span>
        <span>edu.c</span>
      </kit.Stagger>,
    );
    const items = screen.getAllByTestId('edu-reveal');
    expect(items).toHaveLength(3);
    expect(items[2].textContent).toBe('edu.c');
  });

  it('shows every child at rest under reduced motion', () => {
    motionPref.reduced = true;
    render(
      <kit.Stagger>
        <span>edu.a</span>
        <span>edu.b</span>
      </kit.Stagger>,
    );
    for (const el of screen.getAllByTestId('edu-reveal')) expect(el.style.transform).not.toMatch(/translateY/);
  });
});

describe('CelebrationBurst', () => {
  it('renders a small, bounded set of pieces while playing', () => {
    render(<kit.CelebrationBurst playing />);
    const box = screen.getByTestId('edu-celebration-burst');
    expect(box.getAttribute('aria-hidden')).toBe('true');
    expect(box.className).toContain('overflow-hidden');
    expect(box.className).toContain('pointer-events-none');
    const pieces = screen.getAllByTestId('edu-burst-piece');
    expect(pieces.length).toBeGreaterThan(0);
    expect(pieces.length).toBeLessThanOrEqual(kit.CELEBRATION_BURST_MAX);
  });

  it('clamps a large count to the cap', () => {
    render(<kit.CelebrationBurst playing count={999} />);
    expect(screen.getAllByTestId('edu-burst-piece')).toHaveLength(kit.CELEBRATION_BURST_MAX);
  });

  it('colours pieces with neo tokens only', () => {
    render(<kit.CelebrationBurst playing />);
    for (const p of screen.getAllByTestId('edu-burst-piece')) {
      expect(p.className).toMatch(/bg-neo-/);
      expect(p.getAttribute('style') ?? '').not.toMatch(/#[0-9a-f]{3,6}/i);
    }
  });

  it('renders nothing when not playing', () => {
    render(<kit.CelebrationBurst playing={false} />);
    expect(screen.queryByTestId('edu-celebration-burst')).toBeNull();
  });

  it('renders nothing under reduced motion', () => {
    motionPref.reduced = true;
    render(<kit.CelebrationBurst playing />);
    expect(screen.queryByTestId('edu-celebration-burst')).toBeNull();
  });
});

describe('CelebrationBurst sparkle variant', () => {
  it('pins four small stars to the corners of its box', () => {
    render(<kit.CelebrationBurst playing variant="sparkle" />);
    const stars = screen.getAllByTestId('edu-burst-piece');
    expect(stars).toHaveLength(4);
    const corners = stars.map((s) => s.getAttribute('data-corner'));
    expect(new Set(corners)).toEqual(new Set(['ts', 'te', 'bs', 'be']));
  });

  it('is done within the answer-feedback window', () => {
    expect(kit.SPARKLE_MAX_S).toBeLessThanOrEqual(0.45);
  });

  it('draws stars in one neo tone via currentColor, never a hex', () => {
    render(<kit.CelebrationBurst playing variant="sparkle" />);
    for (const s of screen.getAllByTestId('edu-burst-piece')) {
      expect(s.getAttribute('class') ?? '').toMatch(/text-neo-lime/);
      expect(s.outerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
    }
  });

  it('ignores count, so a sparkle never grows into confetti', () => {
    render(<kit.CelebrationBurst playing variant="sparkle" count={16} />);
    expect(screen.getAllByTestId('edu-burst-piece')).toHaveLength(4);
  });

  it('renders nothing under reduced motion', () => {
    motionPref.reduced = true;
    render(<kit.CelebrationBurst playing variant="sparkle" />);
    expect(screen.queryByTestId('edu-celebration-burst')).toBeNull();
  });
});
