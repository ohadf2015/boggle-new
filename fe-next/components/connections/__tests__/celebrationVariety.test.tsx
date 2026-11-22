import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BridgeCelebration from '../BridgeCelebration';
import SparkBurst from '../SparkBurst';
import { CorrectVerdict } from '../PuzzleCard';

const motionPref = vi.hoisted(() => ({ reduced: false }));
vi.mock('framer-motion', () => {
  const make = (Tag: string) => {
    const Comp = ({ children, initial, animate, transition, exit, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(Tag, { ...rest, 'data-initial': JSON.stringify(initial ?? null), 'data-animate': JSON.stringify(animate ?? null) }, children as React.ReactNode);
    return Comp;
  };
  return { m: { span: make('span'), p: make('p'), div: make('div') }, useReducedMotion: () => motionPref.reduced };
});
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (k: string) => k }) }));

const animOf = (el: Element) => JSON.parse((el as HTMLElement).dataset.animate!);

describe('Connections solve celebration variety', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    motionPref.reduced = false;
  });

  it('given two solves with different rolls, then the praise stamp enters and tilts differently', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const a = render(<BridgeCelebration streak={2} points={0} />);
    const first = a.getByText('connections.praise2');
    const firstAnim = animOf(first);
    const firstEntrance = first.dataset.entrance;
    a.unmount();
    random.mockReturnValue(0.9);
    render(<BridgeCelebration streak={2} points={0} />);
    const second = screen.getByText('connections.praise2');
    expect(second.dataset.entrance).not.toBe(firstEntrance);
    expect(animOf(second).rotate).not.toEqual(firstAnim.rotate);
    expect(Math.abs(animOf(second).rotate[1])).toBeLessThanOrEqual(6);
  });

  it('given two spark bursts with different rolls, then the sparks fly different paths and lead with a different colour', () => {
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const a = render(<SparkBurst />);
    const sparksA = [...a.getByTestId('spark-burst').children];
    const first = { anim: animOf(sparksA[0]), cls: sparksA[0].className, n: sparksA.length };
    a.unmount();
    random.mockReturnValue(0.9);
    render(<SparkBurst />);
    const sparksB = [...screen.getByTestId('spark-burst').children];
    expect(sparksB).toHaveLength(first.n);
    expect(first.n).toBeLessThanOrEqual(16);
    expect(animOf(sparksB[0]).x).not.toBe(first.anim.x);
    expect(sparksB[0].className).not.toBe(first.cls);
  });

  it('given a low-end device, then the spark burst halves its sparks', () => {
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(2);
    render(<SparkBurst />);
    expect(screen.getByTestId('spark-burst').children).toHaveLength(8);
  });

  it('given two correct verdicts with different rolls, then the pop tilts differently', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const a = render(<CorrectVerdict label="ok" />);
    const first = a.getByText('ok').dataset.initial;
    a.unmount();
    random.mockReturnValue(0.9);
    render(<CorrectVerdict label="ok" />);
    expect(screen.getByText('ok').dataset.initial).not.toBe(first);
  });

  it('given reduced motion, then the stamp and sparks are skipped and the verdict appears without motion', () => {
    motionPref.reduced = true;
    expect(render(<BridgeCelebration streak={1} points={10} />).container.innerHTML).toBe('');
    expect(render(<SparkBurst />).container.innerHTML).toBe('');
    render(<CorrectVerdict label="ok" />);
    expect(screen.getByText('ok').dataset.initial).toBe('false');
  });
});
