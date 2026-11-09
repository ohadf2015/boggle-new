import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

describe('consumer-only mounts stay off the classroom product', () => {
  const providers = read('app/essential-providers.tsx');

  it.each([
    'SignupPromptHost',
    'AgeGatePromptWrapper',
    'UnlockNotifierMount',
    'GlobalCoinEarnFx',
    'HiddenAchievementListener',
  ])('%s mounts only on game pages', (widget) => {
    expect(providers).toMatch(new RegExp(`\\{gameSurface && <${widget} />\\}`));
    expect(providers.match(new RegExp(`<${widget}\\b`, 'g'))).toHaveLength(1);
  });

  it('decides game vs classroom from eduSections', () => {
    expect(providers).toMatch(/const gameSurface = surfaceOf\(pathname\) === 'game'/);
  });

  it('never starts session replay on a classroom page, whatever fires the init', () => {
    const init = providers.slice(providers.indexOf('const initLogRocket'), providers.indexOf('export function EssentialProviders'));
    expect(init).toMatch(/surfaceOf\(window\.location\.pathname\) === 'edu'\) return;/);
    expect(init.indexOf("surfaceOf(window.location.pathname)")).toBeLessThan(init.indexOf("import('logrocket')"));
  });

  it('churn tracking mounts only on game pages; referral attribution keeps running', () => {
    const widgets = read('components/DeferredLayoutWidgets.tsx');
    expect(widgets).toMatch(/\{gameSurface && <ChurnSignalTracker \/>\}/);
    expect(widgets.match(/<ChurnSignalTracker\b/g)).toHaveLength(1);
    expect(widgets).toMatch(/^\s*<ReferralCodeClaimer \/>$/m);
  });
});
