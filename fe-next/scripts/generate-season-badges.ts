/**
 * Generates Season Placement Badge PNGs.
 * Output: public/badges/season-{N}-rank-{K}.png
 * Style: neo-brutalist (hard borders, hard shadows, flat color, halftone overlay).
 *
 * Run:  npx tsx scripts/generate-season-badges.ts
 *       npx tsx scripts/generate-season-badges.ts --seasons 1-12
 */

import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const SEASON_THEMES: Array<{ name: string; short: string; accent: string }> = [
  { name: 'Word Warriors',      short: 'WW', accent: '#BFFF00' },
  { name: 'Letter Legends',     short: 'LL', accent: '#FF1493' },
  { name: 'Vocab Victors',      short: 'VV', accent: '#00FFFF' },
  { name: 'Syllable Champions', short: 'SC', accent: '#8B5CF6' },
  { name: 'Phonic Phenoms',     short: 'PP', accent: '#FFE135' },
  { name: 'Lexicon Lords',      short: 'LX', accent: '#FF6B35' },
];

interface RankStyle {
  centerColor: string;
  centerColor2: string;
  shape: 'crown' | 'double-star' | 'star' | 'ribbon-cyan' | 'ribbon-pink';
  rarityLabel: string;
}

const RANK_STYLE: Record<number, RankStyle> = {
  1: { centerColor: '#FFD700', centerColor2: '#FFA500', shape: 'crown',        rarityLabel: 'CHAMPION' },
  2: { centerColor: '#C0C0C0', centerColor2: '#9CA3AF', shape: 'double-star',  rarityLabel: 'RUNNER-UP' },
  3: { centerColor: '#CD7F32', centerColor2: '#A0522D', shape: 'star',         rarityLabel: 'BRONZE' },
  4: { centerColor: '#00FFFF', centerColor2: '#0891B2', shape: 'ribbon-cyan',  rarityLabel: 'TOP 5' },
  5: { centerColor: '#FF1493', centerColor2: '#BE185D', shape: 'ribbon-pink',  rarityLabel: 'TOP 5' },
};

const SIZE = 320;

function themeFor(seasonId: number) {
  const idx = ((seasonId - 1) % SEASON_THEMES.length + SEASON_THEMES.length) % SEASON_THEMES.length;
  return SEASON_THEMES[idx];
}

function shapeSvg(shape: RankStyle['shape'], color: string, color2: string): string {
  switch (shape) {
    case 'crown':
      return `
        <g transform="translate(160 168)">
          <path d="M -56 12 L -42 -36 L -22 -8 L 0 -42 L 22 -8 L 42 -36 L 56 12 Z"
                fill="${color}" stroke="#000" stroke-width="6" stroke-linejoin="round"/>
          <rect x="-58" y="12" width="116" height="20" fill="${color2}" stroke="#000" stroke-width="6"/>
          <circle cx="0" cy="-46" r="8" fill="${color2}" stroke="#000" stroke-width="4"/>
          <circle cx="-46" cy="-40" r="6" fill="${color2}" stroke="#000" stroke-width="3"/>
          <circle cx="46" cy="-40" r="6" fill="${color2}" stroke="#000" stroke-width="3"/>
        </g>`;
    case 'double-star': {
      const star = (cx: number, cy: number, r: number, fill: string) => {
        const pts: string[] = [];
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI / 5) * i - Math.PI / 2;
          const rr = i % 2 === 0 ? r : r * 0.45;
          pts.push(`${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`);
        }
        return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="#000" stroke-width="6" stroke-linejoin="round"/>`;
      };
      return `<g transform="translate(160 168)">${star(-22, 0, 38, color2)}${star(22, 0, 38, color)}</g>`;
    }
    case 'star': {
      const pts: string[] = [];
      const cx = 160, cy = 168, r = 64;
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rr = i % 2 === 0 ? r : r * 0.45;
        pts.push(`${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`);
      }
      return `
        <polygon points="${pts.join(' ')}" fill="${color}" stroke="#000" stroke-width="6" stroke-linejoin="round"/>
        <polygon points="${pts.join(' ')}" fill="${color2}" opacity="0.35" transform="scale(0.6) translate(106 112)"/>
      `;
    }
    case 'ribbon-cyan':
    case 'ribbon-pink':
      return `
        <g transform="translate(160 168)">
          <polygon points="-56,40 -56,-44 0,-60 56,-44 56,40 28,28 0,52 -28,28"
                   fill="${color}" stroke="#000" stroke-width="6" stroke-linejoin="round"/>
          <polygon points="-46,-30 -46,30 0,18 46,30 46,-30 0,-46"
                   fill="${color2}" opacity="0.9" stroke="#000" stroke-width="4"/>
          <text x="0" y="6" text-anchor="middle"
                font-family="'Fredoka',sans-serif" font-weight="900" font-size="36"
                fill="#FFFEF0" stroke="#000" stroke-width="2">★</text>
        </g>`;
  }
}

function halftoneDefs(): string {
  return `<pattern id="halftone" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
    <circle cx="5" cy="5" r="1.4" fill="rgba(0,0,0,0.18)"/>
  </pattern>`;
}

function buildSvg(seasonId: number, rank: number): string {
  const theme = themeFor(seasonId);
  const style = RANK_STYLE[rank];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>${halftoneDefs()}</defs>
  <rect x="14" y="14" width="296" height="296" rx="24" fill="#000"/>
  <rect x="6" y="6" width="296" height="296" rx="24" fill="${theme.accent}" stroke="#000" stroke-width="6"/>
  <rect x="6" y="6" width="296" height="296" rx="24" fill="url(#halftone)"/>
  <rect x="6" y="6" width="296" height="44" rx="24" fill="#0F172A"/>
  <rect x="6" y="38" width="296" height="14" fill="#0F172A"/>
  <text x="160" y="36" text-anchor="middle"
        font-family="'Fredoka','Rubik',sans-serif" font-weight="900"
        font-size="20" fill="${theme.accent}" letter-spacing="2">SEASON ${seasonId}</text>
  <circle cx="160" cy="168" r="84" fill="#0F172A" stroke="#000" stroke-width="6"/>
  <circle cx="160" cy="168" r="84" fill="url(#halftone)"/>
  ${shapeSvg(style.shape, style.centerColor, style.centerColor2)}
  <g transform="translate(48 252)">
    <rect x="0" y="0" width="64" height="48" fill="${style.centerColor}" stroke="#000" stroke-width="5" rx="6"/>
    <text x="32" y="36" text-anchor="middle"
          font-family="'Fredoka','Rubik',sans-serif" font-weight="900"
          font-size="34" fill="#0F172A">#${rank}</text>
  </g>
  <g transform="translate(120 252)">
    <rect x="0" y="0" width="152" height="48" fill="#0F172A" stroke="#000" stroke-width="5" rx="6"/>
    <text x="76" y="32" text-anchor="middle"
          font-family="'Fredoka','Rubik',sans-serif" font-weight="900"
          font-size="18" fill="${theme.accent}" letter-spacing="1.5">${style.rarityLabel}</text>
  </g>
</svg>`;
}

async function generate(seasonRange: [number, number]): Promise<void> {
  const outDir = path.resolve(__dirname, '..', 'public', 'badges');
  await fs.mkdir(outDir, { recursive: true });

  const [from, to] = seasonRange;
  let count = 0;
  for (let s = from; s <= to; s++) {
    for (let r = 1; r <= 5; r++) {
      const svg = buildSvg(s, r);
      const out = path.join(outDir, `season-${s}-rank-${r}.png`);
      await sharp(Buffer.from(svg))
        .png({ compressionLevel: 9, palette: false })
        .toFile(out);
      count++;
    }
    process.stdout.write(`  S${s}: 5 badges\n`);
  }
  process.stdout.write(`\n✓ ${count} badge PNGs in ${path.relative(process.cwd(), outDir)}\n`);
}

function parseSeasons(arg: string | undefined): [number, number] {
  if (!arg) return [1, 12];
  const m = /^(\d+)-(\d+)$/.exec(arg);
  if (!m) throw new Error('--seasons expects "from-to" (e.g. 1-12)');
  return [parseInt(m[1], 10), parseInt(m[2], 10)];
}

const idx = process.argv.indexOf('--seasons');
const range = parseSeasons(idx >= 0 ? process.argv[idx + 1] : undefined);
generate(range).catch((err) => {
  console.error(err);
  process.exit(1);
});
