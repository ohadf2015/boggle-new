import { tr } from '@/lib/seo/wordLists/i18n';
import type { SpellLabels } from './SpellTilesPractice';

export const SPELL_LABEL_KEYS = [
  'modeTitle',
  'modeSub',
  'welcomeTitle',
  'welcomeBody',
  'wordCount',
  'start',
  'hear',
  'peek',
  'noVoice',
  'listen',
  'erase',
  'correct',
  'wrong',
  'shown',
  'stars',
  'progress',
  'endTitle',
  'endAccuracy',
  'endStars',
  'cheerTop',
  'cheerMid',
  'cheerLow',
  'again',
  'teacherTitle',
  'teacherBody',
  'teacherCta',
] as const;

export function spellLabels(locale: string): SpellLabels & { modeTitle: string; modeSub: string } {
  const out = Object.fromEntries(SPELL_LABEL_KEYS.map((k) => [k, tr(locale, `practice.spell.${k}`)])) as Record<
    (typeof SPELL_LABEL_KEYS)[number],
    string
  >;
  return { ...out, close: tr(locale, 'practice.close') };
}
