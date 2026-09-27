/**
 * The mode intros are the route's loader, so their server-rendered HTML is the
 * first paint a student sees until hydration finishes (seconds on a slow
 * phone). Framer serialises `initial` into that HTML — an entrance offset there
 * meant the VS arena showed both fighters shoved off its edges and the vault
 * an empty black well (chest at scale 0) until JS arrived. The SSR frame must
 * be the finished scene; the entrance may only play on client-only mounts.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key), language: 'en' }),
}));
// The global setup stubs framer-motion; the point here is what REAL framer serialises into SSR HTML.
vi.unmock('framer-motion');
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [false, () => {}] }));
vi.mock('@/components/Avatar', () => ({ default: () => null }));

import { WorkshopVsIntro } from '../WorkshopVsIntro';
import { ReviewVaultIntro } from '../ReviewVaultIntro';

const noop = () => {};
// Entrance offsets the intros use: fighters slide in on x, the chest pops from scale 0, the text column rises on y.
const ENTRANCE = [/translateX\(-120px\)/, /translateX\(140px\)/, /scale\(0\)/, /scale\(1\.8\)/, /scale\(0\.6\)/, /scale\(0\.7\)/, /translateY\(30px\)/];

describe('academy intro first paint (SSR)', () => {
  it('GIVEN the Workshop loader is server-rendered THEN the arena HTML carries no entrance offsets', () => {
    const html = renderToString(<WorkshopVsIntro lessonName="" chips={[]} starting={false} startFailed={false} onPlay={noop} loading />);
    for (const re of ENTRANCE) expect(html).not.toMatch(re);
    expect(html).toContain('workshop-hero');
  });

  it('GIVEN the vault loader is server-rendered THEN the chest is drawn (not scale 0) and nothing is offset', () => {
    const html = renderToString(<ReviewVaultIntro lessonName="" words={[]} onStart={noop} loading />);
    for (const re of ENTRANCE) expect(html).not.toMatch(re);
    expect(html).toContain('chest-books');
  });
});
