import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { m, visualElementStore } from 'framer-motion';
import { LazyMotionRoot } from '../LazyMotionRoot';

vi.unmock('framer-motion');

const maxChunk = vi.hoisted(() => {
  let land!: () => void;
  const landed = new Promise<void>((resolve) => { land = resolve; });
  return { landed, land };
});

vi.mock('../motionMaxFeatures', async () => {
  await maxChunk.landed;
  const fm = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { default: fm.domMax };
});

const ROOT = join(__dirname, '..', '..');
const gitGrep = (pattern: string, ...paths: string[]) =>
  execFileSync('git', ['grep', '--untracked', '-lE', pattern, '--', ...paths, ':!**/__tests__/**', ':!**/*.test.*'], { cwd: ROOT, encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);

type Element = { features: Record<string, unknown>; projection?: unknown };

describe('LazyMotionRoot', () => {
  it('gives an element mounted before the drag/layout chunk lands drag and layout once it arrives', async () => {
    render(
      <LazyMotionRoot>
        <m.div data-testid="surface" drag="x" layout />
      </LazyMotionRoot>,
    );
    const surface = () => visualElementStore.get(screen.getByTestId('surface')) as unknown as Element;

    expect(surface()).toBeDefined();
    expect(surface().features.drag).toBeUndefined();
    expect(surface().projection).toBeUndefined();

    await act(async () => { maxChunk.land(); });

    await vi.waitFor(() => {
      expect(surface().features.drag).toBeDefined();
      expect(surface().projection).toBeDefined();
    });
  });

  it('keeps domMax out of the root chunk: only the async features module imports it', () => {
    expect(readFileSync(join(ROOT, 'app/LazyMotionRoot.tsx'), 'utf8')).not.toMatch(/\bdomMax\b/);
    expect(gitGrep('(^|[^A-Za-z])domMax([^A-Za-z]|$)', '*.ts', '*.tsx', ':!vitest.setup.ts')).toEqual(['app/motionMaxFeatures.ts']);
  });
});
