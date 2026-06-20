/**
 * PracticeSandbox responsive layout contract (className-based).
 *
 * On desktop (md+), the sandbox root MUST allow vertical scroll to prevent
 * clipped content when the welcome card consumes vertical space. This test
 * verifies that the className strings match the expected pattern.
 *
 * NOTE: jsdom has no layout engine, so visual verification (no clipped content,
 * card visible at 1280×633) must be done via browser screenshot. This test
 * verifies the classNames are correct.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PracticeSandbox — responsive overflow contract (classNames)', () => {
  it('PracticeClassicSandbox root contains md:overflow-y-auto', () => {
    const filePath = path.join(
      __dirname,
      '../PracticeClassicSandbox.tsx'
    );
    const content = fs.readFileSync(filePath, 'utf-8');
    // Find the root div around line 224
    const match = content.match(
      /return\s*\(\s*<div className="relative flex flex-col items-center w-full[^"]*overflow-hidden[^"]*">/
    );
    expect(match).toBeTruthy();
    expect(content).toMatch(/md:overflow-y-auto/);
  });

  it('PracticeWordHuntSandbox root contains md:overflow-y-auto', () => {
    const filePath = path.join(
      __dirname,
      '../PracticeWordHuntSandbox.tsx'
    );
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('md:overflow-y-auto');
    expect(content).toContain('items-stretch w-full');
    expect(content).toContain('overflow-hidden');
  });

  it('PracticeWheelSandbox root contains md:overflow-y-auto', () => {
    const filePath = path.join(
      __dirname,
      '../PracticeWheelSandbox.tsx'
    );
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('md:overflow-y-auto');
    expect(content).toContain('items-stretch w-full');
    expect(content).toContain('overflow-hidden');
  });
});
