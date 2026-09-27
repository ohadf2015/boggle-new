import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { BlastLevel, ChainLevelSpec, Locale } from './types';
import { buildChainLevel, type ExtraWordCheck } from './engine/chain-builder';
import { validateChainLevel } from './engine/chain-validator';
import { getBlastCommonWords } from './engine/common-words';
import { boardWordMinLength } from './engine/extra-word-check';
import { LOCALE_CONFIGS } from './locale-config';

export type LevelVerifyResult =
  | { id: string; levelNumber: number; locale: Locale; ok: true }
  | { id: string; levelNumber: number; locale: Locale; ok: false; reason: string };

type ChainPackFile = { locale: Locale; levels: ChainLevelSpec[] };

const PACKS_ROOT = resolve(process.cwd(), 'content/blast/packs');

async function loadChainPack(locale: Locale): Promise<ChainPackFile | null> {
  try {
    const raw = await readFile(join(PACKS_ROOT, locale, 'pack-chain.json'), 'utf8');
    return JSON.parse(raw) as ChainPackFile;
  } catch {
    return null;
  }
}

async function buildExtraWordCheck(locale: Locale): Promise<ExtraWordCheck | undefined> {
  try {
    const isCommon = await getBlastCommonWords(locale);
    const minLength = boardWordMinLength(LOCALE_CONFIGS[locale]);
    return { isCommon, minLength };
  } catch {
    return undefined;
  }
}

export function verifyChainLevel(
  spec: ChainLevelSpec,
  extraCheck?: ExtraWordCheck,
): LevelVerifyResult {
  const base = { id: spec.id, levelNumber: spec.levelNumber, locale: spec.locale };
  // Words longer than the grid width are valid — chain-builder stacks them as
  // single-column vertical towers (phone-friendly 5-col cap). The build still
  // needs at least one column.
  if (spec.columns < 1) {
    return { ...base, ok: false, reason: `invalid columns (${spec.columns})` };
  }
  // Tiered: try strict (with screen) first, fall back to relaxed (no screen).
  // Matches ChainPackSource.resolve so verifier reflects runtime behaviour.
  // Narrow grids (≤5 cols) cap the screened budget — once towers stack the
  // common-word screen rejects most placements, so we fail-fast and fall back.
  const tier1Budget = spec.columns <= 5 ? 600 : 3000;
  let level = buildChainLevel(spec, spec.levelNumber, extraCheck, tier1Budget);
  if (!level && extraCheck) {
    level = buildChainLevel(spec, spec.levelNumber);
  }
  if (!level) {
    return {
      ...base,
      ok: false,
      reason: 'buildChainLevel returned null (no seed yielded valid placement within 500 attempts, with or without extra-word-check)',
    };
  }
  const check = validateChainLevel(level);
  if (!check.ok) {
    return { ...base, ok: false, reason: `validator rejected: ${check.reason}` };
  }
  return { ...base, ok: true };
}

export async function verifyAllChainLevels(locale: Locale): Promise<LevelVerifyResult[]> {
  const pack = await loadChainPack(locale);
  if (!pack) return [];
  const extraCheck = await buildExtraWordCheck(locale);
  return pack.levels.map((spec) => verifyChainLevel(spec, extraCheck));
}

export function verifyCuratedLevel(level: BlastLevel): LevelVerifyResult {
  const base = { id: level.id, levelNumber: level.levelNumber, locale: level.locale };
  const check = validateChainLevel(level);
  if (!check.ok) return { ...base, ok: false, reason: `validator: ${check.reason}` };
  return { ...base, ok: true };
}
