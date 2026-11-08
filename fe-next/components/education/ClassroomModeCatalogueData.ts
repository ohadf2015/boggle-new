// One table for the picker, its tests and the locale check; every entry launches an existing engine.

import { teacherGameMode, type ModeAccent } from '@/lib/education/gameModes';
import { BOSS_BATTLE_ID, launchOf, type CatalogueLaunch, type ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import type { PlayStyle } from '@/shared/utils/teamBattle';

export const CATALOGUE_CATEGORIES = ['finish', 'together', 'board'] as const;
export type ModeCategory = (typeof CATALOGUE_CATEGORIES)[number];

export type ModeComplexity = 'simple' | 'medium' | 'tricky';
export type ModeStyle = 'ffa' | 'teams' | 'solo' | 'class' | 'together';
export type ModeBestFor =
  | 'meanings'
  | 'review'
  | 'testPrep'
  | 'spelling'
  | 'warmup'
  | 'energy'
  | 'focus'
  | 'lessonWords'
  | 'independent'
  | 'mixedLevels'
  | 'teamwork';
/** Where a mode is played: the class screen, students' phones, or either. */
export type ModeDelivery = 'projector' | 'phones' | 'both';
export type ModePreviewKind = 'quiz' | 'board' | 'blast' | 'hunt' | 'wheel' | 'craft' | 'boss' | 'crossword';

export interface CatalogueMode {
  id: ClassroomCatalogueId;
  launch: CatalogueLaunch;
  category: ModeCategory;
  complexity: ModeComplexity;
  style: ModeStyle;
  /** The board engine scores teams for this mode, so the lobby's Teams setting applies. */
  teamsCapable: boolean;
  bestFor: readonly [ModeBestFor, ModeBestFor];
  preview: ModePreviewKind;
  delivery: ModeDelivery;
  /** camelCase tail of the steps block (and of the name/how keys for an engine mode). */
  suffix: string;
  /** Prefix of the three numbered how-it-plays steps. */
  stepsKey: string;
  nameKey: string;
  howKey: string;
  poster: string;
  /** Full poster for the mode's picker card and Home tile; `poster` stays the transparent sticker. */
  cover: string;
  accent: ModeAccent;
}

type Row = Omit<CatalogueMode, 'suffix' | 'stepsKey' | 'poster' | 'cover' | 'accent' | 'launch' | 'nameKey' | 'howKey'>;

// Classic and Vocab Quiz lead: classroom rooms that actually start a round and that students finish.
// Wordcraft and Crossword are played one board per student but raced on one class leaderboard, so they are offered as "play together".
const ROWS: readonly Row[] = [
  { id: 'classic', category: 'finish', complexity: 'medium', style: 'ffa', teamsCapable: true, bestFor: ['spelling', 'mixedLevels'], preview: 'board', delivery: 'both' },
  { id: 'vocab-quiz', category: 'finish', complexity: 'simple', style: 'ffa', teamsCapable: false, bestFor: ['meanings', 'testPrep'], preview: 'quiz', delivery: 'projector' },
  { id: 'wordcraft', category: 'together', complexity: 'medium', style: 'together', teamsCapable: false, bestFor: ['lessonWords', 'spelling'], preview: 'craft', delivery: 'both' },
  { id: 'crossword', category: 'together', complexity: 'medium', style: 'together', teamsCapable: false, bestFor: ['meanings', 'spelling'], preview: 'crossword', delivery: 'phones' },
  { id: 'blast', category: 'board', complexity: 'simple', style: 'ffa', teamsCapable: true, bestFor: ['energy', 'warmup'], preview: 'blast', delivery: 'phones' },
  { id: BOSS_BATTLE_ID, category: 'board', complexity: 'simple', style: 'class', teamsCapable: false, bestFor: ['teamwork', 'review'], preview: 'boss', delivery: 'projector' },
  { id: 'word-hunt', category: 'board', complexity: 'medium', style: 'ffa', teamsCapable: true, bestFor: ['focus', 'spelling'], preview: 'hunt', delivery: 'phones' },
  { id: 'wheel-rush', category: 'board', complexity: 'simple', style: 'ffa', teamsCapable: true, bestFor: ['warmup', 'review'], preview: 'wheel', delivery: 'both' },
];

export const BOSS_POSTER = '/images/bosses/boss-lexicon-dragon.png';
const BOSS_CARD_POSTER = '/mascot/teacher/modes/boss-battle.webp';

/** Modes whose steps live in their own namespace. */
const STEPS_KEY: Record<string, string> = { crossword: 'eduCrossword.steps' };

const MODES: readonly CatalogueMode[] = ROWS.flatMap((row): CatalogueMode[] => {
  const launch = launchOf(row.id);
  const cover = `/mascot/teacher/modes/covers-v3/${row.id}.webp`;
  if (row.id === BOSS_BATTLE_ID) {
    return [{ ...row, launch, suffix: 'bossBattle', stepsKey: 'eg2Modes.steps.bossBattle', nameKey: 'eg2Modes.boss.name', howKey: 'classroomBoss.cardHow', poster: BOSS_CARD_POSTER, cover, accent: 'pink' }];
  }
  const base = teacherGameMode(launch.gameMode);
  if (!base) return [];
  return [{ ...row, launch, suffix: base.nameKeySuffix, stepsKey: STEPS_KEY[row.id] ?? `eg2Modes.steps.${base.nameKeySuffix}`, nameKey: base.nameKey, howKey: base.howKey, poster: base.poster, cover, accent: base.accent }];
});

/** The three modes classes play most; they get a "Most popular" tag and lead the landing. */
export const CLASS_FAVORITE_MODES: readonly ClassroomCatalogueId[] = ['vocab-quiz', 'classic', 'blast'];

export function isClassFavorite(id: string | null | undefined): boolean {
  return CLASS_FAVORITE_MODES.some((m) => m === id);
}

/** The landing's three featured modes, in display order. */
export const FEATURED_HOME_MODES: readonly ClassroomCatalogueId[] = CLASS_FAVORITE_MODES;

export function deliveryKey(delivery: ModeDelivery): string {
  return `eduShell.delivery.${delivery}`;
}

export function catalogueModes(): readonly CatalogueMode[] {
  return MODES;
}

export function catalogueEntry(id: string | null | undefined): CatalogueMode | undefined {
  return MODES.find((m) => m.id === id);
}

export function modeStyleFor(mode: CatalogueMode, playStyle: PlayStyle): ModeStyle {
  return mode.teamsCapable && playStyle === 'teams' ? 'teams' : mode.style;
}

export interface CatalogueModeKeys {
  name: string;
  how: string;
  category: string;
  complexity: string;
  style: string;
  bestFor: string[];
  steps: string[];
  /** One line on what students do in a start-here or play-together mode; null for the board games. */
  hint: string | null;
}

export function catalogueKeys(mode: CatalogueMode, style: ModeStyle = mode.style): CatalogueModeKeys {
  return {
    name: mode.nameKey,
    how: mode.howKey,
    category: `eg2Modes.category.${mode.category}`,
    complexity: `eg2Modes.complexity.${mode.complexity}`,
    style: `eg2Modes.style.${style}`,
    bestFor: mode.bestFor.map((b) => `eg2Modes.bestFor.${b}`),
    steps: [1, 2, 3].map((n) => `${mode.stepsKey}.${n}`),
    hint: mode.category === 'board' ? null : `eg2Modes.hint.${mode.id}`,
  };
}

/** Picker chrome copy — listed so the locale test covers it too. */
export const CATALOGUE_UI_KEYS = [
  'eg2Modes.title',
  'eg2Modes.spec.duration',
  'eg2Modes.spec.complexity',
  'eg2Modes.spec.style',
  'eg2Modes.bestForLabel',
  'eg2Modes.howItPlays',
  'eg2Modes.hideHowItPlays',
  'eg2Modes.previewLabel',
  'eg2Modes.style.teams',
  'eg2Modes.style.class',
  'eg2Modes.needsMeanings',
] as const;

/** Boss Battle copy on the live surfaces (HUD, verdict, projector start). */
export const BOSS_LIVE_KEYS = [
  'eg2Modes.boss.dragon',
  'eg2Modes.boss.hp',
  'eg2Modes.boss.yourHit',
  'eg2Modes.boss.yourCrit',
  'eg2Modes.boss.noHit',
  'eg2Modes.boss.classHits',
  'eg2Modes.boss.defeatedTitle',
  'eg2Modes.boss.defeatedBody',
  'eg2Modes.boss.escapedTitle',
  'eg2Modes.boss.escapedBody',
  'eg2Modes.boss.start',
] as const;
