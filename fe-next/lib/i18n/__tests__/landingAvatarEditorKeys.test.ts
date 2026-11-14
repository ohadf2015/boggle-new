import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { en } from '@/translations/en';
import { pickLandingMessages } from '../pickLandingMessages';
import { LANDING_NAMESPACES, LANDING_EXTRA_KEYS } from '../landingNamespaces';

// PostHog inbox 01a1a66f: the homepage EditAvatarButton opens AvatarBuilderModal
// on the landing subset, so the editor painted raw keys (avatarBuilder.title...).
const resolve = (root: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>(
    (o, p) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[p] : undefined),
    root,
  );

const root = join(__dirname, '../../..');
const editorFiles = [
  'components/avatar/AvatarBuilderModal.tsx',
  'components/avatar/GlowUpButton.tsx',
  'components/avatar/LobbyAvatarRewardButton.tsx',
  'components/progression/UpNextRail.tsx',
  ...readdirSync(join(root, 'components/avatar/editor'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => `components/avatar/editor/${f}`),
];

const usedKeys = Array.from(
  new Set(
    editorFiles.flatMap((f) =>
      Array.from(readFileSync(join(root, f), 'utf8').matchAll(/\bt\(\s*['"]([a-zA-Z]+\.[a-zA-Z0-9_.-]+)['"]/g)).map(
        (m) => m[1],
      ),
    ),
  ),
).filter((k) => typeof resolve(en as Record<string, unknown>, k) === 'string');

describe('landing subset covers the homepage avatar editor', () => {
  const subset = pickLandingMessages(en as Record<string, unknown>, LANDING_NAMESPACES, LANDING_EXTRA_KEYS);

  it('finds editor keys to check', () => {
    expect(usedKeys.length).toBeGreaterThan(20);
  });

  it.each(usedKeys)('resolves %s', (key) => {
    expect(typeof resolve(subset, key)).toBe('string');
  });

  it.each(['pwa.iosInstallTitle'])('resolves %s', (key) => {
    if (typeof resolve(en as Record<string, unknown>, key) !== 'string') return;
    expect(typeof resolve(subset, key)).toBe('string');
  });
});
