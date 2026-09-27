/**
 * AnchoredNativeBanner / BannerCoordinatorMount — AdMob plugin availability guard.
 *
 * Sibling of the Sentry JAVASCRIPT-NEXTJS-12A fix already applied in
 * AdMobContext.tsx / useAppLifecycle.ts / DeepLinkHandler.tsx / mobileOAuth.ts:
 * `Capacitor.isNativePlatform()` can return true on Android WebView before the
 * native bridge has bound a given plugin. Calling `AdMob.addListener(...)` or
 * `AdMob.resumeBanner()` in that window returns a rejected "thenable" proxy
 * ("AdMob.<method>() is not implemented on android") — an unhandled rejection
 * that fires from a component mounted app-wide (essential-providers), so it can
 * surface during ANY navigation, including exiting a Daily Challenge sub-game.
 * Gating on `Capacitor.isPluginAvailable('AdMob')` (already used in
 * AdMobContext.tsx:61) short-circuits both effects until the plugin registers.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('AnchoredNativeBanner — AdMob plugin guard', () => {
  const source = readFileSync(resolve(__dirname, '../AnchoredNativeBanner.tsx'), 'utf8');

  it('checks isPluginAvailable("AdMob") before registering listeners', () => {
    expect(source).toMatch(/isPluginAvailable\(\s*['"]AdMob['"]\s*\)/);
  });
});

describe('BannerCoordinatorMount — AdMob plugin guard', () => {
  const source = readFileSync(resolve(__dirname, '../BannerCoordinatorMount.tsx'), 'utf8');

  it('checks isPluginAvailable("AdMob") before registering listeners/ops', () => {
    expect(source).toMatch(/isPluginAvailable\(\s*['"]AdMob['"]\s*\)/);
  });
});
