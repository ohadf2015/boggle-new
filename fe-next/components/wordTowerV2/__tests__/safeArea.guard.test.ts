import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLAY_HEIGHT } from '../safeArea';

const ROOT = join(__dirname, '..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('Word Tower screen edges', () => {
  it('Given the in-game body is padded by the status bar, When the play screen sizes itself, Then it subtracts that padding instead of filling 100dvh', () => {
    const body = readFileSync(join(ROOT, 'WordTowerV2.tsx'), 'utf8');
    expect(body).toContain('style={{ height: PLAY_HEIGHT }}');
    expect(body).not.toMatch(/className=\{`relative h-dvh/);
    // Must match body.screen-fit-locked's padding-top in globals.css exactly.
    const css = readFileSync(join(ROOT, '../../app/globals.css'), 'utf8');
    expect(css).toContain('padding-top: var(--combined-safe-area-top, env(safe-area-inset-top, 0px));');
    expect(PLAY_HEIGHT).toBe('calc(100dvh - var(--combined-safe-area-top, env(safe-area-inset-top, 0px)))');
  });

  it('Given env() reads 0 in the Android app, When a control is padded off the bottom edge, Then it also reads the Capacitor inset', () => {
    const offenders = sources(ROOT).flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => line.includes('safe-area-inset-bottom') && !line.includes('--cap-safe-area-bottom'))
        .map((line) => `${file.slice(ROOT.length)}: ${line.trim()}`),
    );
    expect(offenders).toEqual([]);
  });
});
