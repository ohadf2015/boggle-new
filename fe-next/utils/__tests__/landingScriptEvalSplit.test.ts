import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const feRoot = path.resolve(__dirname, '..', '..');

describe('landing first-paint script-eval split', () => {
  it('lib/supabase.ts does not statically import @supabase/ssr', () => {
    const src = fs.readFileSync(path.join(feRoot, 'lib', 'supabase.ts'), 'utf8');
    expect(src).not.toMatch(/^import[^;]*@supabase\/ssr/m);
    expect(src).toContain('webpackChunkName: "supabase-ssr"');
    expect(src).toContain('export async function ensureSupabase');
    expect(src).toContain('hasLikelySupabaseSession');
  });

  it('locale layout does not statically import ads/pixels/native chrome', () => {
    const src = fs.readFileSync(path.join(feRoot, 'app', '[locale]', 'layout.tsx'), 'utf8');
    const banned = [
      "from '@/components/ads/AdSenseLoader'",
      "from '@/components/GoogleAnalytics'",
      "from '@/components/GoogleConsentMode'",
      "from '@/components/NativeOAuthInitializer'",
      "from '@/components/DictionaryPrewarmer'",
      "from '@/components/CrazyGamesScriptServer'",
      "from '@/components/feedback/FeedbackDevtoolsWidget'",
    ];
    for (const line of banned) {
      expect(src, `layout must not statically import ${line}`).not.toContain(line);
    }
    expect(src).toContain('LocaleDeferredChrome');
    expect(src).toContain('{!isLanding && <LocaleDeferredChrome');
  });

  it('ConditionalProviders uses LandingSlimProviders on locale-root', () => {
    const src = fs.readFileSync(path.join(feRoot, 'app', 'conditional-providers.tsx'), 'utf8');
    expect(src).toContain('LandingSlimProviders');
    expect(src).toContain('isLandingPath');
    expect(src).toMatch(/nextDynamic\([\s\S]*essential-providers/);
    expect(src).not.toMatch(/^import \{ EssentialProviders \} from '\.\/essential-providers'/m);
    const slim = fs.readFileSync(path.join(feRoot, 'app', 'landing-slim-providers.tsx'), 'utf8');
    expect(slim).toContain('NavigationProvider');
  });

  it('authFetch guest-fast-paths without ensureSupabase', () => {
    const src = fs.readFileSync(path.join(feRoot, 'utils', 'authFetch.ts'), 'utf8');
    expect(src).toContain('hasLikelySupabaseSession');
    expect(src).toContain('ensureSupabase');
  });
});
