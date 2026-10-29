import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CoachDemo } from './CoachDemo';
import type { CoachDemoType } from '@/lib/tutorial/modeCoachContent';

// framer-motion: render m.* as plain divs so the demo render path runs without
// the animation engine (mirrors ModeCoach.test.tsx).
vi.mock('framer-motion', () => {
  const div = React.forwardRef(function MotionDiv(
    props: Record<string, unknown>,
    ref: React.Ref<HTMLDivElement>,
  ) {
    const MOTION = new Set(['initial', 'animate', 'exit', 'transition', 'variants', 'layout']);
    const clean: Record<string, unknown> = {};
    for (const k of Object.keys(props)) if (!MOTION.has(k)) clean[k] = props[k];
    return React.createElement('div', { ...clean, ref });
  });
  return { m: new Proxy({}, { get: () => div }), useReducedMotion: () => false };
});

// Every demo type in the registry must render without throwing. clearTiles
// (blast) and tapClue (word-hunt) ship to production for the first time with
// this change — they were authored but never mounted, so this is the only
// coverage their render path has had.
const ALL_DEMOS: CoachDemoType[] = [
  'icon',
  'drag',
  'longWord',
  'tapClue',
  'centerLetter',
  'lockWord',
  'clearTiles',
  'stack',
  'connectGroup',
  'chain',
  'towerDrop',
];

describe('CoachDemo', () => {
  it.each(ALL_DEMOS)('renders the "%s" demo without throwing', (demo) => {
    const { container } = render(<CoachDemo demo={demo} accent="purple" emoji="🎯" />);
    expect(container.firstChild).not.toBeNull();
  });
});

describe('CoachDemo stack (word tower)', () => {
  it('given the stack demo, when rendered, then it shows real letters being spelled and the word slab on a tower', () => {
    render(<CoachDemo demo="stack" accent="cyan" />);
    const letters = screen.getAllByTestId('coach-stack-letter').map((el) => el.getAttribute('data-letter'));
    expect(letters.join('')).toBe('TOP');
    expect(screen.getByTestId('coach-stack-slab').textContent).toBe('TOP');
    expect(screen.getAllByTestId('coach-stack-floor').length).toBeGreaterThanOrEqual(2);
    for (const floor of screen.getAllByTestId('coach-stack-floor')) expect(floor.textContent).not.toBe('');
  });

  it('given the drop demo, when rendered, then a slab hangs over a tower', () => {
    render(<CoachDemo demo="towerDrop" accent="cyan" />);
    expect(screen.getByTestId('coach-drop-slab')).toBeTruthy();
    expect(screen.getAllByTestId('coach-stack-floor').length).toBeGreaterThanOrEqual(2);
  });
});

describe('CoachDemo in an RTL page (he)', () => {
  it.each(['drag', 'chain', 'longWord'] as CoachDemoType[])(
    'given the "%s" demo under dir=rtl, then its Latin letter row stays left-to-right (C-A-T, not T-A-C)',
    (demo) => {
      const { container } = render(
        <div dir="rtl">
          <CoachDemo demo={demo} accent="purple" />
        </div>,
      );
      const root = container.querySelector('[aria-hidden="true"]') as HTMLElement;
      expect(root.getAttribute('dir')).toBe('ltr');
    },
  );

  it('keeps the drag demo letters in C-A-T order', () => {
    const { container } = render(
      <div dir="rtl">
        <CoachDemo demo="drag" accent="purple" />
      </div>,
    );
    expect(container.textContent).toBe('CAT');
  });
});
