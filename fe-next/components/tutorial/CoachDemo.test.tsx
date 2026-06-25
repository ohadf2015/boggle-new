import React from 'react';
import { render } from '@testing-library/react';
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
];

describe('CoachDemo', () => {
  it.each(ALL_DEMOS)('renders the "%s" demo without throwing', (demo) => {
    const { container } = render(<CoachDemo demo={demo} accent="purple" emoji="🎯" />);
    expect(container.firstChild).not.toBeNull();
  });
});
