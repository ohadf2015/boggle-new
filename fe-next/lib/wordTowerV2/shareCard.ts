import type { BiomeId } from './biomes';

/** v1 share PNG only knows v1 biome ids. Map v2 skies onto the closest card. */
const BIOME_TO_SHARE: Record<BiomeId, string> = {
  downtown: 'city',
  sunset: 'sky',
  clouds: 'sky',
  jetstream: 'stratosphere',
  aurora: 'orbit',
  orbit: 'nebula',
  cosmos: 'galaxy',
};

export function shareBiomeId(biome: BiomeId): string {
  return BIOME_TO_SHARE[biome] ?? 'city';
}

export function v2ShareCardPath(p: {
  heightM: number;
  floors: number;
  biome: BiomeId;
  topWord: string;
  name: string;
}): string {
  const q = new URLSearchParams({
    h: String(Math.max(0, Math.round(p.heightM))),
    f: String(Math.max(0, Math.round(p.floors))),
    b: shareBiomeId(p.biome),
    w: p.topWord.slice(0, 16),
    n: p.name.slice(0, 18),
  });
  return `/api/word-tower/share?${q.toString()}`;
}
