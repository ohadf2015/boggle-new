import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { xpForLevel, MAX_LEVEL } from '../levelCurve';

const MIGRATIONS = join(__dirname, '../../../supabase/migrations');

interface SqlCurve {
  file: string;
  base: number;
  maxLevel: number;
  tiers: Array<{ upTo: number; exponent: number }>;
  fallback: number;
}

function latestCurveFor(names: string[]): SqlCurve {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  const fnPattern = new RegExp(
    `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+(?:public\\.)?(?:${names.join('|')})\\s*\\(([\\s\\S]*?)\\$\\$\\s*(?:LANGUAGE|;)`,
    'gi',
  );
  let latest: { file: string; body: string } | null = null;
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS, file), 'utf8');
    for (const match of sql.matchAll(fnPattern)) {
      if (/increment_player_xp_unchecked\s*\(/i.test(match[1])) continue;
      latest = { file, body: match[1] };
    }
  }
  if (!latest) throw new Error(`no migration defines ${names.join('/')}`);
  const { file, body } = latest;
  const round = body.match(/ROUND\(\s*(\d+)\s*\*\s*POWER\(\s*i\s*,\s*v_exponent\s*\)\s*\)/i);
  const loop = body.match(/FOR\s+i\s+IN\s+REVERSE\s+(\d+)\s*\.\.\s*2/i);
  const tiers = [...body.matchAll(/(?:ELS)?IF\s+i\s*<=\s*(\d+)\s+THEN\s+v_exponent\s*:=\s*([\d.]+)/gi)].map((m) => ({
    upTo: Number(m[1]),
    exponent: Number(m[2]),
  }));
  const fallback = body.match(/ELSE\s+v_exponent\s*:=\s*([\d.]+)/i);
  if (!round || !loop || tiers.length === 0 || !fallback) {
    throw new Error(`${file}: latest ${names[0]} has no parsable level curve; update shared/xp/levelCurve.ts and this guard together`);
  }
  return { file, base: Number(round[1]), maxLevel: Number(loop[1]), tiers, fallback: Number(fallback[1]) };
}

function sqlXpForLevel(curve: SqlCurve, level: number): number {
  if (level <= 1) return 0;
  const tier = curve.tiers.find((t) => level <= t.upTo);
  const exponent = tier ? tier.exponent : curve.fallback;
  return Math.round(curve.base * Math.pow(level, exponent));
}

describe.each([
  ['increment_player_xp', ['increment_player_xp', 'increment_player_xp_unchecked']],
  ['update_player_stats_and_xp', ['update_player_stats_and_xp']],
])('%s level curve matches shared/xp/levelCurve', (_label, names) => {
  const curve = latestCurveFor(names);

  it('has the same max level', () => {
    expect(curve.maxLevel).toBe(MAX_LEVEL);
  });

  it('needs the same XP for every level', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      expect({ level, xp: sqlXpForLevel(curve, level) }).toEqual({ level, xp: xpForLevel(level) });
    }
  });
});
