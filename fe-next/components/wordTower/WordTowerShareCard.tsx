/**
 * Server-rendered share card (SSR → SVG → PNG via sharp in the route).
 * Pure SVG, no 'use client', no hooks — must render with renderToStaticMarkup.
 * Params-driven so it works for share links and is verifiable standalone.
 */
import React from 'react';
import { BIOME_THEME } from './biomeTheme';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

export interface ShareCardProps {
  width?: number;
  height?: number;
  heightM: number;
  floors: number;
  biomeId: WordTowerBiomeId;
  topWord: string;
  name: string;
  /** Optional daily-twist label ("🌟 Golden Letter"); omitted = no chip. */
  mutatorLabel?: string;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export default function WordTowerShareCard({
  width = 1200,
  height = 630,
  heightM,
  floors,
  biomeId,
  topWord,
  name,
  mutatorLabel = '',
}: ShareCardProps) {
  const theme = BIOME_THEME[biomeId];
  const block = hex(theme.block);
  const accent = hex(theme.accent);
  // Two-stop gradient pulled from the biome's CSS gradient endpoints.
  const stops = theme.bg.match(/#[0-9a-fA-F]{6}/g) ?? ['#1a1a2e', '#3a5a7e'];
  const top = stops[0];
  const bottom = stops[stops.length - 1];

  // Tower silhouette: a stack of blocks on the left, taller = more floors.
  const towerX = 150;
  const towerW = 150;
  const blockH = 34;
  const gap = 6;
  const maxBlocks = 11;
  const shown = Math.max(3, Math.min(maxBlocks, floors));
  const baseY = height - 90;

  const blocks = Array.from({ length: shown }, (_, i) => {
    const y = baseY - (i + 1) * (blockH + gap);
    const wobble = (i % 2 === 0 ? -1 : 1) * (i * 1.4);
    return (
      <g key={i} transform={`translate(${towerX + wobble}, ${y})`}>
        <rect x={4} y={5} width={towerW} height={blockH} rx={6} fill="#000" opacity={0.5} />
        <rect x={0} y={0} width={towerW} height={blockH} rx={6} fill={block} stroke="#000" strokeWidth={3} />
      </g>
    );
  });

  // A few stars for higher biomes.
  const stars = theme.stars > 0.3
    ? Array.from({ length: 18 }, (_, i) => (
        <circle
          key={`s${i}`}
          cx={(i * 137) % width}
          cy={(i * 71) % (height - 200)}
          r={i % 3 === 0 ? 3 : 1.6}
          fill="#fff"
          opacity={theme.stars}
        />
      ))
    : null;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={top} />
          <stop offset="100%" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#sky)" />
      {stars}

      {/* Daily-twist banner — top-left over the sky, only on a daily share. */}
      {mutatorLabel ? (
        <g transform="translate(60, 50)">
          <rect x={0} y={0} width={Math.min(560, 150 + mutatorLabel.length * 22)} height={64} rx={12} fill="#BFFF00" stroke="#000" strokeWidth={4} />
          <text x={20} y={31} fontFamily="sans-serif" fontSize={18} fontWeight={700} fill="#000" opacity={0.6}>TODAY&apos;S TWIST</text>
          <text x={20} y={56} fontFamily="sans-serif" fontSize={26} fontWeight={800} fill="#000">{mutatorLabel}</text>
        </g>
      ) : null}

      {blocks}

      {/* Right column copy */}
      <g transform={`translate(${towerX + towerW + 120}, 0)`}>
        <text x={0} y={170} fontFamily="sans-serif" fontSize={150} fontWeight={800} fill="#BFFF00" stroke="#000" strokeWidth={4}>
          {Math.round(heightM)}<tspan fontSize={64} fill="#00FFFF"> m</tspan>
        </text>
        <text x={0} y={230} fontFamily="sans-serif" fontSize={40} fontWeight={700} fill="#fff" opacity={0.9}>
          {String(name || 'Player').slice(0, 18)}&apos;s tower
        </text>
        <rect x={0} y={270} width={520} height={64} rx={10} fill={block} stroke="#000" strokeWidth={3} />
        <text x={20} y={313} fontFamily="sans-serif" fontSize={34} fontWeight={800} fill={accent}>
          {String(topWord || '').slice(0, 16).toUpperCase()}
        </text>
        <text x={0} y={400} fontFamily="sans-serif" fontSize={30} fontWeight={700} fill="#fff" opacity={0.85}>
          {floors} floors · {biomeId.toUpperCase()}
        </text>
        <rect x={0} y={450} width={420} height={70} rx={12} fill="#FF1493" stroke="#000" strokeWidth={4} />
        <text x={210} y={497} textAnchor="middle" fontFamily="sans-serif" fontSize={36} fontWeight={800} fill="#fff">
          BEAT MY TOWER
        </text>
      </g>

      <text x={width - 40} y={height - 36} textAnchor="end" fontFamily="sans-serif" fontSize={30} fontWeight={800} fill="#fff" opacity={0.8}>
        LexiClash · Word Tower
      </text>
    </svg>
  );
}
