/**
 * r5 FCP: skipped chrome on heavy-game routes was still statically imported
 * from the server locale layout, so webpack put AutoHideFooter / GlobalBottomNav
 * / OAuth / pixels in layout-*.js on /singleplayer. Same trap as
 * DeferredLayoutWidgets — ssr:false from a client wrapper is what actually
 * removes the bytes. Guard the layout source.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const LAYOUT = readFileSync(
  path.resolve(__dirname, '..', 'layout.tsx'),
  'utf8',
);

const FORBIDDEN_STATIC = [
  '@/components/AutoHideFooter',
  '@/components/GlobalBottomNav',
  '@/components/InGameAudioButton',
  '@/components/DictionaryPrewarmer',
  '@/components/NativeOAuthInitializer',
  '@/components/NativePGSInitializer',
  '@/components/feedback/FeedbackDevtoolsWidget',
  '@/components/WebVitalsReporter',
  '@/components/PagePresenceReporter',
  '@/components/AnimationsLoader',
  '@/components/auth/GoogleOneTapInitializer',
  '@/components/offline/OfflineBanner',
  '@/components/offline/OfflineSyncBridge',
  '../conditional-providers',
];

describe('locale layout heavy-game split', () => {
  it('does not statically import site chrome or ConditionalProviders', () => {
    for (const spec of FORBIDDEN_STATIC) {
      expect(LAYOUT, `${spec} must not be a static import of layout.tsx`).not.toMatch(
        new RegExp(`from ['"]${spec.replace(/[./]/g, '\\$&')}['"]`),
      );
    }
  });

  it('branches the body through a client shell so game routes do not parse site chrome', () => {
    expect(LAYOUT).toMatch(/LocaleBodyChrome|MaybeSiteChrome|HeavyGameShell/);
  });
});
