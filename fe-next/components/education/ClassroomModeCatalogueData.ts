// One table for the picker, its tests and the locale check; every entry launches an existing engine.

import { teacherGameMode, type ModeAccent } from '@/lib/education/gameModes';
import { BOSS_BATTLE_ID, launchOf, type CatalogueLaunch, type ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import type { PlayStyle } from '@/shared/utils/teamBattle';

export const CATALOGUE_CATEGORIES = ['meaning', 'board'] as const;
export type ModeCategory = (typeof CATALOGUE_CATEGORIES)[number];

export type ModeComplexity = 'simple' | 'medium' | 'tricky';
export type ModeStyle = 'ffa' | 'teams' | 'solo' | 'class';
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
export type ModePreviewKind = 'quiz' | 'board' | 'blast' | 'hunt' | 'wheel' | 'craft' | 'boss';

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
  /** camelCase tail of the steps block (and of the name/how keys for an engine mode). */
  suffix: string;
  nameKey: string;
  howKey: string;
  poster: string;
  accent: ModeAccent;
}

type Row = Omit<CatalogueMode, 'suffix' | 'poster' | 'accent' | 'launch' | 'nameKey' | 'howKey'>;

const ROWS: readonly Row[] = [
  { id: 'vocab-quiz', category: 'meaning', complexity: 'simple', style: 'ffa', teamsCapable: false, bestFor: ['meanings', 'testPrep'], preview: 'quiz' },
  { id: BOSS_BATTLE_ID, category: 'meaning', complexity: 'simple', style: 'class', teamsCapable: false, bestFor: ['teamwork', 'review'], preview: 'boss' },
  { id: 'wordcraft', category: 'meaning', complexity: 'tricky', style: 'solo', teamsCapable: false, bestFor: ['lessonWords', 'independent'], preview: 'craft' },
  { id: 'classic', category: 'board', complexity: 'medium', style: 'ffa', teamsCapable: true, bestFor: ['spelling', 'mixedLevels'], preview: 'board' },
  { id: 'blast', category: 'board', complexity: 'simple', style: 'ffa', teamsCapable: true, bestFor: ['energy', 'warmup'], preview: 'blast' },
  { id: 'word-hunt', category: 'board', complexity: 'medium', style: 'ffa', teamsCapable: true, bestFor: ['focus', 'spelling'], preview: 'hunt' },
  { id: 'wheel-rush', category: 'board', complexity: 'simple', style: 'ffa', teamsCapable: true, bestFor: ['warmup', 'review'], preview: 'wheel' },
];

export const BOSS_POSTER = '/images/bosses/boss-lexicon-dragon.png';

const MODES: readonly CatalogueMode[] = ROWS.flatMap((row): CatalogueMode[] => {
  const launch = launchOf(row.id);
  if (row.id === BOSS_BATTLE_ID) {
    return [{ ...row, launch, suffix: 'bossBattle', nameKey: 'eg2Modes.boss.name', howKey: 'eg2Modes.boss.how', poster: BOSS_POSTER, accent: 'pink' }];
  }
  const base = teacherGameMode(launch.gameMode);
  if (!base) return [];
  return [{ ...row, launch, suffix: base.nameKeySuffix, nameKey: base.nameKey, howKey: base.howKey, poster: base.poster, accent: base.accent }];
});

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
}

export function catalogueKeys(mode: CatalogueMode, style: ModeStyle = mode.style): CatalogueModeKeys {
  return {
    name: mode.nameKey,
    how: mode.howKey,
    category: `eg2Modes.category.${mode.category}`,
    complexity: `eg2Modes.complexity.${mode.complexity}`,
    style: `eg2Modes.style.${style}`,
    bestFor: mode.bestFor.map((b) => `eg2Modes.bestFor.${b}`),
    steps: [1, 2, 3].map((n) => `eg2Modes.steps.${mode.suffix}.${n}`),
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
