import { describe, it, expect } from 'vitest';
import { posthogApiHost } from '../posthogApiHost';

describe('posthogApiHost', () => {
  it('Given the production site, Then events go through our own /ingest so school ad blockers do not drop them', () => {
    expect(posthogApiHost('www.lexiclash.live', 'https://eu.i.posthog.com')).toBe('/ingest');
    expect(posthogApiHost('lexiclash.live', undefined)).toBe('/ingest');
  });

  it('Given the native app or any other host (no Next server behind it), Then events go straight to PostHog', () => {
    expect(posthogApiHost('localhost', 'https://eu.i.posthog.com')).toBe('https://eu.i.posthog.com');
    expect(posthogApiHost('games.crazygames.com', undefined)).toBe('https://eu.i.posthog.com');
    expect(posthogApiHost('', 'https://us.i.posthog.com')).toBe('https://us.i.posthog.com');
  });
});
