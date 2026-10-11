import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { LazyMotionRoot } from '../LazyMotionRoot';
import { useMotionMaxReady } from '@/components/motion/useMotionMaxReady';

vi.unmock('framer-motion');

const ROOT = join(__dirname, '..', '..');
const gitGrep = (pattern: string, ...paths: string[]) =>
  execFileSync('git', ['grep', '--untracked', '-lE', pattern, '--', ...paths, ':!**/__tests__/**', ':!**/*.test.*'], { cwd: ROOT, encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);

function Probe() {
  return <span data-testid="probe">{useMotionMaxReady() ? 'max' : 'animation'}</span>;
}

describe('LazyMotionRoot', () => {
  it('renders children at once and reports drag/layout ready after the max features load', async () => {
    render(<LazyMotionRoot><Probe /></LazyMotionRoot>);
    expect(screen.getByTestId('probe').textContent).toBe('animation');
    await act(async () => { await import('../motionMaxFeatures'); });
    await vi.waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('max'));
  });

  it('keeps domMax out of the root chunk: only the async features module imports it', () => {
    expect(readFileSync(join(ROOT, 'app/LazyMotionRoot.tsx'), 'utf8')).not.toMatch(/\bdomMax\b/);
    expect(gitGrep('(^|[^A-Za-z])domMax([^A-Za-z]|$)', '*.ts', '*.tsx', ':!vitest.setup.ts')).toEqual(['app/motionMaxFeatures.ts']);
  });

  it('every drag surface re-renders once drag is loaded', () => {
    const dragFiles = gitGrep('dragConstraints|dragElastic', '*.tsx');
    expect(dragFiles.length).toBeGreaterThan(0);
    const missing = dragFiles.filter((f) => !readFileSync(join(ROOT, f), 'utf8').includes('useMotionMaxReady'));
    expect(missing).toEqual([]);
  });
});
