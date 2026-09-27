import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Education framer-motion must honour reduced motion: either the file calls
 * `useReducedMotion`, or the app wraps the tree in MotionConfigProvider
 * (which sets `reducedMotion="always"` from AccessibilityContext). Infinite
 * loops (`repeat: Infinity`) are the one case MotionConfig is not enough on
 * its own to reason about — those files must call the hook so the loop is
 * never scheduled.
 */

const REPO = path.resolve(__dirname, '../../..');
const EDUCATION = path.join(REPO, 'components/education');
const PROVIDERS = path.join(REPO, 'app/essential-providers.tsx');
const MOTION_PROVIDER = path.join(REPO, 'components/motion/MotionConfigProvider.tsx');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__tests__' && e.name !== 'node_modules') walk(full, out);
    } else if (e.name.endsWith('.tsx') && !e.name.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
}

describe('education reduced motion', () => {
  it('wraps the app in MotionConfigProvider so `m` / `motion` honour the OS setting', () => {
    const providers = fs.readFileSync(PROVIDERS, 'utf8');
    const config = fs.readFileSync(MOTION_PROVIDER, 'utf8');
    expect(providers).toMatch(/<MotionConfigProvider>/);
    expect(config).toMatch(/reducedMotion=\{shouldReduceMotion \? 'always' : 'never'\}/);
  });

  it('never schedules an infinite loop without useReducedMotion', () => {
    const violations: string[] = [];
    for (const file of walk(EDUCATION)) {
      const src = fs.readFileSync(file, 'utf8');
      if (!/repeat:\s*Infinity/.test(src)) continue;
      if (!/useReducedMotion/.test(src)) {
        violations.push(path.relative(REPO, file));
      }
    }
    expect(violations).toEqual([]);
  });
});
