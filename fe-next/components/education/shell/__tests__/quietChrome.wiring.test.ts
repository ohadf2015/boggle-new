/**
 * The predicate is only worth having if it is actually wired, and the wiring is
 * the part that silently rots: a widget gets added to the stack later and lands
 * outside the guard. These read the source rather than render it, matching
 * `components/__tests__/DeferredLayoutWidgets.test.tsx` — the widgets are all
 * `ssr:false` dynamic imports with no server render to assert against.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const widgets = readFileSync(path.join(ROOT, 'components', 'DeferredLayoutWidgets.tsx'), 'utf8');
const consent = readFileSync(path.join(ROOT, 'components', 'CookieConsent.tsx'), 'utf8');

describe('quiet-chrome wiring', () => {
  it('DeferredLayoutWidgets asks the shared predicate, not its own path check', () => {
    expect(widgets).toMatch(/isQuietChromeSurface/);
    expect(widgets).toMatch(/education\/shell\/quietChromeRoutes/);
  });

  it.each([
    'AndroidAppInstallPromo',
    'AndroidInstallPill',
    'PWAInstallPrompt',
    'PushNotificationPrompt',
  ])('%s is inside the quiet-surface guard', (widget) => {
    // The guarded block runs from the `!quietChrome &&` fragment to its close.
    const start = widgets.indexOf('!quietChrome && (');
    const end = widgets.indexOf('</>\n      )}', start);
    expect(start, 'a quiet-surface guard must exist').toBeGreaterThan(-1);
    const guarded = widgets.slice(start, end);
    expect(guarded).toContain(`<${widget} />`);
  });

  it('keeps CookieConsent mounted on those surfaces — consent is deferred, never skipped', () => {
    const start = widgets.indexOf('!quietChrome && (');
    const end = widgets.indexOf('</>\n      )}', start);
    expect(widgets.slice(start, end)).not.toContain('<CookieConsent />');
    expect(widgets).toContain('<CookieConsent />');
  });

  it('ranks the consent sheet below TeacherLiveControls (z-70) on a game surface', () => {
    // z-[200] would put the sheet over the host's own START GAME strip and over
    // GamePausedOverlay — on a projector, in front of the class.
    expect(consent).toMatch(/useInGameSurface|isInGameSurface/);
    expect(consent).toMatch(/z-\[60\]/);
  });
});
