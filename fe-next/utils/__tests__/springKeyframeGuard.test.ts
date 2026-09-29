/**
 * Gate: no framer-motion spring/inertia transition may drive 3+ keyframes.
 * Regression for growth-radar t_15ec0d7a (#3597) / prior #893 / t_6d1f84e4.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findSpringKeyframeViolations } from '../springKeyframeGuard';

function withFixture(source: string, run: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skg-'));
  fs.writeFileSync(path.join(dir, 'Fixture.tsx'), source);
  try {
    run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('springKeyframeGuard', () => {
  it('finds no spring + 3+ keyframe violations under fe-next UI trees', () => {
    const root = path.resolve(__dirname, '../..');
    const hits = [
      ...findSpringKeyframeViolations(path.join(root, 'components')),
      ...findSpringKeyframeViolations(path.join(root, 'app')),
      ...findSpringKeyframeViolations(path.join(root, 'hooks')),
      ...findSpringKeyframeViolations(path.join(root, 'player')),
    ];

    if (hits.length > 0) {
      const detail = hits
        .map(
          (h) =>
            `  ${h.file}:${h.line} ${h.animateProp}.${h.prop}=${h.lit} under spring`,
        )
        .join('\n');
      expect.fail(
        `Found ${hits.length} spring+multi-keyframe violation(s) (motion only allows 2 keyframes with spring/inertia):\n${detail}`,
      );
    }

    expect(hits).toEqual([]);
  });

  it('flags identifier-bound multi-kf transform with no tween (default-spring risk)', () => {
    withFixture(
      `import { m } from 'framer-motion';
const WOBBLES = [{ rotate: [0, -5, 5, -3, 0], y: [0, -2, 0] }];
export const Teaser = () => <m.div animate={WOBBLES[0]} />;
`,
      (dir) => {
        const hits = findSpringKeyframeViolations(dir);
        expect(hits.length).toBeGreaterThan(0);
        expect(hits.some((h) => h.prop === 'rotate')).toBe(true);
      },
    );
  });

  it('does not flag identifier-bound multi-kf when the tag tweens', () => {
    withFixture(
      `import { m } from 'framer-motion';
const WOBBLES = [{ rotate: [0, -5, 5, -3, 0], y: [0, -2, 0] }];
export const Teaser = () => (
  <m.div animate={WOBBLES[0]} transition={{ duration: 2, ease: 'easeInOut' }} />
);
`,
      (dir) => {
        expect(findSpringKeyframeViolations(dir)).toEqual([]);
      },
    );
  });

  it('flags spread-inlined multi-kf transform without tween', () => {
    withFixture(
      `import { motion } from 'framer-motion';
const MOOD = { x: [0, 18, -4, 0], scale: [1, 1.12, 1] };
export const Rival = () => <motion.img animate={{ scale: 1, ...MOOD }} />;
`,
      (dir) => {
        const hits = findSpringKeyframeViolations(dir);
        expect(hits.length).toBeGreaterThan(0);
      },
    );
  });

  it('flags exit multi-kf transform under explicit spring', () => {
    withFixture(
      `import { m } from 'framer-motion';
export const X = () => (
  <m.div exit={{ scale: [1, 1.2, 0] }} transition={{ type: 'spring', stiffness: 400 }} />
);
`,
      (dir) => {
        const hits = findSpringKeyframeViolations(dir);
        expect(hits.some((h) => h.animateProp === 'exit' && h.prop === 'scale')).toBe(true);
      },
    );
  });

  it('flags scaleX multi-kf without tween', () => {
    withFixture(
      `import { m } from 'framer-motion';
export const X = () => <m.span animate={{ scaleX: [1, 0.85, 1] }} />;
`,
      (dir) => {
        expect(findSpringKeyframeViolations(dir).some((h) => h.prop === 'scaleX')).toBe(true);
      },
    );
  });

  it('does not flag delay-only when an explicit tween is set on the transform', () => {
    withFixture(
      `import { m } from 'framer-motion';
export const X = () => (
  <m.div
    animate={{ scale: [0, 1.3, 1] }}
    transition={{ delay: 0.3, scale: { type: 'tween', duration: 0.35, ease: 'easeOut' } }}
  />
);
`,
      (dir) => {
        expect(findSpringKeyframeViolations(dir)).toEqual([]);
      },
    );
  });
});
