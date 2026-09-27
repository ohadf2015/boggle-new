import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AvatarRendererSsr from './AvatarRendererSsr';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';

function readSource(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
}

/** First non-blank, non-comment line — where a directive prologue must live. */
function firstMeaningfulLine(src: string): string {
  return (
    src
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*')) ?? ''
  );
}

describe('avatar PNG render — JAVASCRIPT-NEXTJS-1HW / 1DV', () => {
  // 2026-09 redraw: the PNG route renders the SAME compositor as the browser
  // (art/AvatarArt). The old failure — part files reading client Contexts that
  // are undefined under the react-server condition — is designed out: nothing
  // in the compositor's static import graph may create a Context or be a
  // 'use client' module.
  it('the server compositor graph has no createContext and no "use client" module', () => {
    const seen = new Set<string>();
    const queue = ['./art/AvatarArt.tsx'];
    const offenders: string[] = [];
    while (queue.length) {
      const rel = queue.shift()!;
      if (seen.has(rel)) continue;
      seen.add(rel);
      const src = readSource(rel);
      if (/createContext\(/.test(src) || /^['"]use client['"]/.test(firstMeaningfulLine(src))) offenders.push(rel);
      for (const m of src.matchAll(/^import\s+(?!type\b)[^;]*?from\s+['"](\.\/[^'"]+)['"]/gm)) {
        const dir = rel.slice(0, rel.lastIndexOf('/') + 1);
        const spec = m[1].slice(2);
        for (const ext of ['.tsx', '.ts']) {
          try {
            readSource(`${dir}${spec}${ext}`);
            queue.push(`${dir}${spec}${ext}`);
            break;
          } catch {
            /* try next extension */
          }
        }
      }
    }
    expect(seen.size).toBeGreaterThan(8);
    expect(offenders).toEqual([]);
  });

  it('avatar PNG render failures are filtered from Sentry (handled gracefully)', () => {
    const sentryConfig = readSource('../../sentry.server.config.ts');
    expect(sentryConfig).toMatch(/\\\[AVATAR_PNG\\\] render failed/i);
  });

  // Logic guard for the `?? fallback` part lookups in AvatarRendererSsr — runs
  // in plain Node (no client-reference transform), so it cannot reproduce the
  // bundler bug above, but it locks the render contract against config drift.
  it('renders the default avatar to a static SVG document', () => {
    const svg = renderToStaticMarkup(
      createElement(AvatarRendererSsr, { config: DEFAULT_AVATAR_CONFIG, size: 256, circular: true }),
    );
    expect(svg).toContain('<svg');
    expect(svg).toContain('data-testid="custom-avatar-ssr"');
    expect(svg).toContain('fsssr'); // faceShadowId = `fs${uid}`, uid='ssr'
  });

  it('renders a maximal config (epic parts + back-layer hair) without an undefined element', () => {
    const config: CustomAvatarConfig = {
      ...DEFAULT_AVATAR_CONFIG,
      gender: 'female',
      base: 'dragonHead',
      eyes: 'galaxy',
      hair: 'long', // back-layer style → exercises HairFrontPart / isBackStyle paths
      accessory: 'sunglasses',
      eyebrows: 'arched',
      facialHair: 'none',
      noseStyle: 'pointed',
      mouth: 'vampire',
      bodyStyle: 'hoodie',
    };
    const svg = renderToStaticMarkup(
      createElement(AvatarRendererSsr, { config, size: 256, circular: true }),
    );
    expect(svg).toContain('<svg');
  });
});
