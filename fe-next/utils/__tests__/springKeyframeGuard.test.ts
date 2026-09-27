/**
 * Gate: no framer-motion spring/inertia transition may drive 3+ keyframes.
 * Regression for growth-radar t_15ec0d7a (#3597) / prior #893.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findSpringKeyframeViolations } from '../springKeyframeGuard';

describe('springKeyframeGuard', () => {
  it('finds no spring + 3+ keyframe violations under fe-next components/app', () => {
    const root = path.resolve(__dirname, '../..');
    // Limit to UI trees that ship to visitors
    const hits = [
      ...findSpringKeyframeViolations(path.join(root, 'components')),
      ...findSpringKeyframeViolations(path.join(root, 'app')),
      ...findSpringKeyframeViolations(path.join(root, 'hooks')),
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
});
