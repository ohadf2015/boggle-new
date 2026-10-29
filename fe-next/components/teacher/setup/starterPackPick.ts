import { STARTER_LESSON_PACKS, type StarterLessonPack } from '@/lib/education/starterLessonPacks';
import type { GradeBand } from './classSetupDefaults';

type Level = StarterLessonPack['targetLevel'];

const BAND_LEVEL: Record<GradeBand, Level> = {
  k2: 'beginner',
  g35: 'beginner',
  g68: 'intermediate',
  g912: 'advanced',
  esl: 'beginner',
};
const LEVELS: readonly Level[] = ['beginner', 'intermediate', 'advanced'];

export function packsForLanguage(language: string): StarterLessonPack[] {
  const own = STARTER_LESSON_PACKS.filter((p) => p.language === language);
  return own.length > 0 ? own : STARTER_LESSON_PACKS.filter((p) => p.language === 'en');
}

/** The closest level wins, so a language with only beginner packs still gets one. */
export function recommendedPack(language: string, band: GradeBand | null): StarterLessonPack {
  const packs = packsForLanguage(language);
  const want = LEVELS.indexOf(band ? BAND_LEVEL[band] : 'beginner');
  const distance = (p: StarterLessonPack) => Math.abs(LEVELS.indexOf(p.targetLevel) - want);
  return packs.reduce((best, p) => (distance(p) < distance(best) ? p : best), packs[0] ?? STARTER_LESSON_PACKS[0]);
}
