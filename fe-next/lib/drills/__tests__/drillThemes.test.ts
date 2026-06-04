/**
 * Tests for the per-drill identity/theme system.
 *
 * Every drill must have a complete, on-brand theme: a persona, an accent from
 * the neo-brutalist palette, an EXISTING mascot variant (so art stays coherent
 * with the kawaii-marshmallow cast — no clashing new characters), and i18n keys
 * for its mission / benefit / coach-tip / persona name.
 *
 * @module lib/drills/__tests__/drillThemes.test
 */

import { DRILL_THEMES, getDrillTheme, ACCENT_CLASSES } from '../drillThemes';
import { MASCOT_IMAGES } from '@/components/ui/Mascot';
import type { DrillType } from '@/shared/types/cognitive';

const ALL_DRILLS: DrillType[] = [
  'lightning-round',
  'memory-hunt',
  'combo-master',
  'pattern-switcher',
  'rare-gems',
];

describe('DRILL_THEMES', () => {
  it('has a theme for every drill, and no extras', () => {
    expect(Object.keys(DRILL_THEMES).sort()).toEqual([...ALL_DRILLS].sort());
  });

  it.each(ALL_DRILLS)('theme for %s is complete and on-brand', (id) => {
    const theme = DRILL_THEMES[id];
    expect(theme.id).toBe(id);

    // Accent is a real neo-* token (stays inside the 4-family palette + orange).
    expect(theme.accent).toMatch(/^neo-(lime|purple|orange|cyan|pink)$/);

    // Mascot variant must be one the component can actually render.
    expect(theme.mascot in MASCOT_IMAGES).toBe(true);

    // i18n keys are wired (no hardcoded UI strings).
    expect(theme.personaKey).toBe(`brain.drills.${id}.persona`);
    expect(theme.missionKey).toBe(`brain.drills.${id}.mission`);
    expect(theme.benefitKey).toBe(`brain.drills.${id}.benefit`);
    expect(theme.coachTipKey).toBe(`brain.drills.${id}.coachTip`);
  });

  it('keeps the established per-drill accent colors', () => {
    expect(DRILL_THEMES['lightning-round'].accent).toBe('neo-lime');
    expect(DRILL_THEMES['memory-hunt'].accent).toBe('neo-purple');
    expect(DRILL_THEMES['combo-master'].accent).toBe('neo-orange');
    expect(DRILL_THEMES['pattern-switcher'].accent).toBe('neo-cyan');
    expect(DRILL_THEMES['rare-gems'].accent).toBe('neo-pink');
  });

  it('gives each drill a distinct mascot so personas feel different', () => {
    const mascots = ALL_DRILLS.map((id) => DRILL_THEMES[id].mascot);
    expect(new Set(mascots).size).toBe(mascots.length);
  });
});

describe('ACCENT_CLASSES (Tailwind-JIT safety)', () => {
  // Tailwind only emits classes it sees as COMPLETE LITERAL strings. These must
  // be full literals (never `bg-${accent}`), or themed surfaces render colorless.
  it('maps every accent to full literal text/bg/border classes', () => {
    for (const theme of Object.values(DRILL_THEMES)) {
      const cls = ACCENT_CLASSES[theme.accent];
      expect(cls.text).toBe(`text-${theme.accent}`);
      expect(cls.bg).toBe(`bg-${theme.accent}`);
      expect(cls.border).toBe(`border-${theme.accent}`);
      // Literal, not a fragment to be interpolated later.
      expect(cls.bg.startsWith('bg-neo-')).toBe(true);
    }
  });
});

describe('getDrillTheme', () => {
  it('returns the matching theme', () => {
    expect(getDrillTheme('rare-gems')).toBe(DRILL_THEMES['rare-gems']);
  });

  it('falls back to a valid theme for an unknown id (never throws)', () => {
    // @ts-expect-error intentionally bad id
    const theme = getDrillTheme('not-a-drill');
    expect(theme).toBeDefined();
    expect(theme.mascot in MASCOT_IMAGES).toBe(true);
  });
});
