/**
 * Sentry JAVASCRIPT-NEXTJS-2A4 — "Objects are not valid as a React child (found:
 * object with keys {uid, gender, base, skin, ...})" on /profile.
 *
 * Prod builds run the React Compiler (next.config `reactCompiler: true`); vitest
 * does not. The compiler turns every PascalCase function that returns JSX into
 * a component with its own `useMemoCache` slot. If such a function is CALLED as
 * a plain function (`fn(ctx)`) from inside another component, its memo cache
 * borrows the caller's slots — conditionally, and a different function per body
 * style. Switching style (default config → stored turtleneck config) hands the
 * new body the old body's cache array, and a stale slot holding `ctx` gets
 * returned as a child.
 *
 * This test compiles bodies.tsx with the same compiler, so it exercises what
 * production actually runs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { transformSync } from '@babel/core';
import { resolveAvatarConfig } from '@/lib/avatar/legacyMap';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { buildCtx } from '../ctx';

const ART_DIR = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, '.bodies.compiled.tmp.tsx');

function compileBodies(): string {
  const src = fs.readFileSync(path.join(ART_DIR, 'bodies.tsx'), 'utf8');
  const out = transformSync(src, {
    filename: 'bodies.tsx',
    babelrc: false,
    configFile: false,
    plugins: [
      '@babel/plugin-syntax-jsx',
      ['@babel/plugin-syntax-typescript', { isTSX: true }],
      ['babel-plugin-react-compiler', {}],
    ],
  });
  return out!.code!.replace(/from '\.\//g, "from '../");
}

afterAll(() => {
  fs.rmSync(OUT, { force: true });
});

describe('Body under the React Compiler (2A4)', () => {
  it('switching bodyStyle on a mounted Body never renders the ctx object as a child', async () => {
    fs.writeFileSync(OUT, compileBodies());
    const { Body } = (await import(/* @vite-ignore */ OUT)) as typeof import('../bodies');

    const first = resolveAvatarConfig(DEFAULT_AVATAR_CONFIG);
    const stored = resolveAvatarConfig({
      ...DEFAULT_AVATAR_CONFIG, bodyStyle: 'turtleneck', shirtColor: '#00897B',
    } as CustomAvatarConfig);
    const styles = ['default', 'hoodie', 'suit', 'turtleneck', 'offShoulder', 'cropTop'];

    const bad: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      for (const a of styles) {
        for (const b of styles) {
          if (a === b) continue;
          const { rerender, unmount } = render(
            <svg><Body ctx={buildCtx(first, 'u', false)} style={a} /></svg>,
          );
          try {
            rerender(<svg><Body ctx={buildCtx(stored, 'u', false)} style={b} /></svg>);
          } catch (e) {
            bad.push(`${a}->${b}: ${(e as Error).message.slice(0, 70)}`);
          }
          unmount();
        }
      }
    } finally {
      spy.mockRestore();
    }
    expect(bad).toEqual([]);
  });
});
