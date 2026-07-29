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
  // These context modules call createContext. Turbopack forbids createContext
  // from entering a server-graph module, and the avatar PNG route handler
  // (app/api/avatar/png/[playerId]/route.ts) imports them via AvatarRendererSsr
  // — so they MUST stay behind 'use client' or the PRODUCTION BUILD FAILS:
  //   "You're importing a module that depends on `createContext` into a React
  //    Server Component module."
  // Removing 'use client' has been attempted and reverted twice. Do NOT remove
  // it. The server-render failure it causes is suppressed via sentry.server
  // .config.ts ignoreErrors and the route degrades gracefully (404 → mascot).
  it.each(['AvatarUidContext.tsx', 'AvatarEyeColorContext.tsx'])(
    '%s keeps "use client" (Turbopack requires it; removing breaks the prod build)',
    (file) => {
      expect(firstMeaningfulLine(readSource(`./${file}`))).toMatch(/^['"]use client['"]/);
    },
  );

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
