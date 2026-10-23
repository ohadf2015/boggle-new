import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({}) }));

import DraftOverlay from '../DraftOverlay';

const src = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8');
const classOf = (source: string, testId: string) => {
  const m = source.match(new RegExp(`<[^>]*data-testid="${testId}"[^>]*>`, 's'));
  const c = m?.[0].match(/className="([^"]*)"/s) ?? m?.[0].match(/className=\{cn\(([^)]*)\)/s);
  return c?.[1] ?? '';
};

describe('short-viewport CTA contract (360x640, 375x667, landscape 667x375)', () => {
  it('DraftOverlay: Take/Skip pinned shrink-0, middle scrolls instead of clipping', () => {
    render(<DraftOverlay offer={[{ type: 'heal', amount: 2 }, { type: 'heal', amount: 2 }, { type: 'heal', amount: 2 }]} onPick={() => {}} run={null} />);
    const actions = screen.getByTestId('draft-take').closest('[data-testid="draft-actions"]')!;
    expect(actions.className).toContain('shrink-0');
    const scroll = screen.getByTestId('draft-scroll');
    for (const c of ['min-h-0', 'flex-1', 'overflow-y-auto', 'overscroll-contain']) expect(scroll.className).toContain(c);
    expect(scroll.firstElementChild!.className).toContain('my-auto');
  });

  it('LevelCleared: continue row pinned, stars/chest region scrolls', () => {
    const s = src('run/LevelCleared.tsx');
    expect(classOf(s, 'loot-actions')).toContain('shrink-0');
    const scroll = classOf(s, 'loot-scroll');
    for (const c of ['min-h-0', 'flex-1', 'overflow-y-auto', 'overscroll-contain']) expect(scroll).toContain(c);
  });

  it('LevelIntro: hero scrolls, footer (Start/Fight) pinned', () => {
    const s = src('intro/LevelIntro.tsx');
    const scroll = classOf(s, 'intro-scroll');
    for (const c of ['min-h-0', 'flex-1', 'overflow-y-auto', 'overscroll-contain']) expect(scroll).toContain(c);
    const foot = classOf(s, 'intro-foot');
    expect(foot).toContain('shrink-0');
  });
});
