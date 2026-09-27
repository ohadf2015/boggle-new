/**
 * useAppLifecycle — App plugin availability guard (Sentry JAVASCRIPT-NEXTJS-12A)
 *
 * On Android WebView, `Capacitor.isNativePlatform()` can return true while the
 * native bridge has not yet bound the @capacitor/app plugin (remote WebView
 * load race). Calling `App.addListener('appStateChange', ...)` in that window
 * surfaces "App plugin is not implemented on android" as an unhandled
 * rejection. Gating on `Capacitor.isPluginAvailable('App')` short-circuits
 * the call until the plugin registers.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('useAppLifecycle — App plugin guard', () => {
  const source = readFileSync(
    resolve(__dirname, '../useAppLifecycle.ts'),
    'utf8',
  );

  it('checks isPluginAvailable("App") before calling addListener', () => {
    expect(source).toMatch(/isPluginAvailable\(\s*['"]App['"]\s*\)/);
  });

  it('still bails out when isNative is false', () => {
    expect(source).toMatch(/if\s*\(!isNative\(\)\)\s*return/);
  });
});

describe('DeepLinkHandler — App plugin guard', () => {
  const source = readFileSync(
    resolve(__dirname, '../../components/DeepLinkHandler.tsx'),
    'utf8',
  );

  it('checks isPluginAvailable("App") before registering appUrlOpen listener', () => {
    expect(source).toMatch(/isPluginAvailable\(\s*['"]App['"]\s*\)/);
  });
});

describe('mobileOAuth — App plugin guard', () => {
  const source = readFileSync(
    resolve(__dirname, '../../utils/mobileOAuth.ts'),
    'utf8',
  );

  it('checks isPluginAvailable("App") before registering OAuth callback listener', () => {
    expect(source).toMatch(/isPluginAvailable\(\s*['"]App['"]\s*\)/);
  });
});
