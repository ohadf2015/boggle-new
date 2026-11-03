import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const academy = readdirSync(join(process.cwd(), 'components/student/academy'))
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => `components/student/academy/${f}`);

const celebrations = [
  'components/education/LevelUpCelebration.tsx',
  'components/education/StreakBonusIndicator.tsx',
  'components/education/XpProgressBar.tsx',
  'components/education/EduMascot.tsx',
];

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('student hub and celebrations read reduced motion from one place', () => {
  it('finds the hub sources', () => {
    expect(academy.length).toBeGreaterThan(10);
  });

  it.each([...academy, ...celebrations])('%s never asks the OS alone (the in-app effects switch must count too)', (file) => {
    const src = read(file);
    expect(src).not.toMatch(/\buseReducedMotion\b/);
    expect(src).not.toMatch(/\busePrefersReducedMotion\b/);
    expect(src).not.toMatch(/matchMedia\(\s*['"]\(prefers-reduced-motion/);
  });

  it.each(celebrations)('%s uses useEduReducedMotion', (file) => {
    expect(read(file)).toMatch(/useEduReducedMotion\(\)/);
  });

  it('the hub decides once with useEduReducedMotion and hands it down', () => {
    expect(read('components/student/academy/AcademyHub.tsx')).toMatch(/useEduReducedMotion\(\)/);
  });
});
