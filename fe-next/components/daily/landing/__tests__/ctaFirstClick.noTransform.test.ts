/**
 * First-click lock: START QUEST / PLAY / Find Words used to need two taps
 * because a transform (framer-motion y-slide, CSS breathing scale, hover
 * translate, neo-press, whileTap scale, or touch-tilt scale) moved the hit
 * target between pointerdown and pointerup.
 *
 * These are source assertions so they stay valid even when framer-motion is
 * mocked away in component tests. Node env — no DOM required.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (...parts: string[]) =>
  readFileSync(path.resolve(__dirname, ...parts), 'utf8');

describe('CTA first-click — no transform on the hit target', () => {
  it('QuestCard entrance is opacity-only (no y-slide) and does not breathe on the clickable wrapper', () => {
    const src = read('..', 'QuestCard.tsx');
    expect(src).toMatch(/initial=\{\{\s*opacity:\s*0\s*\}\}/);
    expect(src).not.toMatch(/initial=\{\{\s*opacity:\s*0,\s*y:/);
    expect(src).not.toMatch(/className=\{cn\('relative w-full', isNew && showEffects && 'animate-breathing'\)\}/);
    // Touch tilt scaled the card on first finger-down.
    expect(src).not.toMatch(/onTouchStart=\{tiltHandlers\.onTouchStart\}/);
    expect(src).toContain("showEffects && 'animate-breathing'");
    expect(src).toContain('pointer-events-none');
  });

  it('DailyModeQuestCard entrance is opacity-only', () => {
    const src = read('..', 'DailyModeQuestCard.tsx');
    expect(src).toMatch(/initial=\{\{\s*opacity:\s*0\s*\}\}/);
    expect(src).not.toMatch(/initial=\{\{\s*opacity:\s*0,\s*y:/);
  });

  it('DailyReadyScreen PLAY buttons do not y-slide, breathe, or translate on hover/active', () => {
    const src = read('..', '..', 'DailyReadyScreen.tsx');
    expect(src).toContain("{t('daily.playButton')}");
    const playClasses = [...src.matchAll(/onClick=\{onStart\}[\s\S]*?className="([^"]+)"/g)].map((m) => m[1]);
    expect(playClasses.length).toBe(2);
    for (const cls of playClasses) {
      expect(cls).not.toMatch(/translate/);
      expect(cls).not.toMatch(/animate-breathing/);
    }
  });

  it('Word Wheel ready-screen PLAY is a static button (no whileTap / scale loop)', () => {
    const src = read('..', '..', 'WordWheelChallenge.tsx');
    expect(src).toContain("{t('daily.play')}");
    expect(src).not.toMatch(/whileTap=\{\{\s*scale:/);
    expect(src).not.toMatch(/animate=\{\{\s*scale:\s*\[1,\s*1\.03,\s*1\]/);
    expect(src).not.toMatch(/active:translate-x-px active:translate-y-px/);
  });
});
