'use client';

import React from 'react';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props {
  mode: PracticeMode;
  idx: number;
}

const MODE_COLOR: Record<PracticeMode, { fg: string; bg: string; ring: string; soft: string }> = {
  classic:   { fg: '#00FFFF', bg: '#003844', ring: '#00FFFF', soft: 'rgba(0, 255, 255, 0.18)' },
  wordHunt:  { fg: '#BFFF00', bg: '#1f3a00', ring: '#BFFF00', soft: 'rgba(191, 255, 0, 0.18)' },
  wheelRush: { fg: '#C4B5FD', bg: '#2e1065', ring: '#8B5CF6', soft: 'rgba(139, 92, 246, 0.20)' },
};

const Tile: React.FC<{
  letter: string;
  x: number;
  y: number;
  size?: number;
  color: { fg: string; bg: string };
  active?: boolean;
  dim?: boolean;
}> = ({ letter, x, y, size = 36, color, active, dim }) => (
  <g transform={`translate(${x} ${y})`} opacity={dim ? 0.35 : 1}>
    <rect
      width={size}
      height={size}
      rx={6}
      fill={active ? color.fg : color.bg}
      stroke="#0d0d18"
      strokeWidth={2.2}
    />
    {active && (
      <rect
        x={2}
        y={2}
        width={size}
        height={size}
        rx={6}
        fill="none"
        stroke="#0d0d18"
        strokeWidth={1.4}
        opacity={0.4}
      />
    )}
    <text
      x={size / 2}
      y={size / 2 + 2}
      textAnchor="middle"
      dominantBaseline="middle"
      fontFamily="Fredoka, sans-serif"
      fontWeight={800}
      fontSize={18}
      fill={active ? '#0d0d18' : '#FFFEF0'}
    >
      {letter}
    </text>
  </g>
);

const Path: React.FC<{ d: string; color: string }> = ({ d, color }) => (
  <path d={d} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
);

const ART: Record<PracticeMode, [React.ReactElement, React.ReactElement, React.ReactElement]> = {
  classic: [
    // tip1 — Tap adjacent tiles to spell. 2x2 grid w/ "WORD" path
    <svg key="c1" viewBox="0 0 320 200" className="w-full h-full">
      <rect width="320" height="200" rx="8" fill={MODE_COLOR.classic.soft} />
      <Path d="M 96 70 L 160 70 L 224 70 L 224 130" color={MODE_COLOR.classic.ring} />
      <Tile letter="W" x={78} y={52} color={MODE_COLOR.classic} active />
      <Tile letter="O" x={142} y={52} color={MODE_COLOR.classic} active />
      <Tile letter="R" x={206} y={52} color={MODE_COLOR.classic} active />
      <Tile letter="D" x={206} y={116} color={MODE_COLOR.classic} active />
      <Tile letter="A" x={78} y={116} color={MODE_COLOR.classic} dim />
      <Tile letter="N" x={142} y={116} color={MODE_COLOR.classic} dim />
      <text x="160" y="180" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={14} fill="#FFFEF0">
        Tap → tap → tap
      </text>
    </svg>,
    // tip2 — Longer words show off more. Comparison w/ scores
    <svg key="c2" viewBox="0 0 320 200" className="w-full h-full">
      <rect width="320" height="200" rx="8" fill={MODE_COLOR.classic.soft} />
      <g transform="translate(28 56)">
        <Tile letter="C" x={0} y={0} color={MODE_COLOR.classic} active size={28} />
        <Tile letter="A" x={32} y={0} color={MODE_COLOR.classic} active size={28} />
        <Tile letter="T" x={64} y={0} color={MODE_COLOR.classic} active size={28} />
        <text x={46} y={66} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={20} fill={MODE_COLOR.classic.ring}>
          +30
        </text>
      </g>
      <g transform="translate(146 36)">
        <Tile letter="C" x={0} y={0} color={MODE_COLOR.classic} active />
        <Tile letter="A" x={36} y={0} color={MODE_COLOR.classic} active />
        <Tile letter="S" x={72} y={0} color={MODE_COLOR.classic} active />
        <Tile letter="T" x={108} y={0} color={MODE_COLOR.classic} active />
        <Tile letter="L" x={36} y={50} color={MODE_COLOR.classic} active />
        <Tile letter="E" x={72} y={50} color={MODE_COLOR.classic} active />
        <text x={86} y={120} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={26} fill={MODE_COLOR.classic.ring}>
          +180
        </text>
      </g>
      <text x={138} y={108} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={28} fill="#FFFEF0">
        →
      </text>
    </svg>,
    // tip3 — No timer — just explore. Crossed-out clock + sparkle tiles
    <svg key="c3" viewBox="0 0 320 200" className="w-full h-full">
      <rect width="320" height="200" rx="8" fill={MODE_COLOR.classic.soft} />
      <g transform="translate(60 60)">
        <circle cx="40" cy="40" r="36" fill={MODE_COLOR.classic.bg} stroke="#0d0d18" strokeWidth={2.5} />
        <line x1="40" y1="40" x2="40" y2="18" stroke="#FFFEF0" strokeWidth={3} strokeLinecap="round" />
        <line x1="40" y1="40" x2="58" y2="40" stroke="#FFFEF0" strokeWidth={3} strokeLinecap="round" />
        <line x1="10" y1="10" x2="70" y2="70" stroke="#FF3366" strokeWidth={5} strokeLinecap="round" />
      </g>
      <g transform="translate(180 32)">
        <Tile letter="∞" x={0} y={0} color={MODE_COLOR.classic} active size={44} />
        <text x={56} y={32} fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={20} fill="#FFFEF0">
          Take your time
        </text>
        <g transform="translate(0 64)">
          <Tile letter="P" x={0} y={0} color={MODE_COLOR.classic} active size={28} />
          <Tile letter="L" x={32} y={0} color={MODE_COLOR.classic} active size={28} />
          <Tile letter="A" x={64} y={0} color={MODE_COLOR.classic} active size={28} />
          <Tile letter="Y" x={96} y={0} color={MODE_COLOR.classic} active size={28} />
        </g>
      </g>
    </svg>,
  ],
  wordHunt: [
    // tip1 — Drag connected letters to spell target word
    <svg key="w1" viewBox="0 0 320 200" className="w-full h-full">
      <rect width="320" height="200" rx="8" fill={MODE_COLOR.wordHunt.soft} />
      <g transform="translate(96 12)">
        <rect width="128" height="32" rx="16" fill="#0d0d18" stroke={MODE_COLOR.wordHunt.fg} strokeWidth={2.5} />
        <text x="64" y="22" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={16} fill={MODE_COLOR.wordHunt.fg}>
          Target: MOON
        </text>
      </g>
      <Path d="M 96 78 L 160 78 L 160 142 L 224 142" color={MODE_COLOR.wordHunt.ring} />
      <Tile letter="M" x={78} y={60} color={MODE_COLOR.wordHunt} active />
      <Tile letter="O" x={142} y={60} color={MODE_COLOR.wordHunt} active />
      <Tile letter="O" x={142} y={124} color={MODE_COLOR.wordHunt} active />
      <Tile letter="N" x={206} y={124} color={MODE_COLOR.wordHunt} active />
      <Tile letter="X" x={78} y={124} color={MODE_COLOR.wordHunt} dim />
      <Tile letter="Y" x={206} y={60} color={MODE_COLOR.wordHunt} dim />
    </svg>,
    // tip2 — Bonus words count too
    <svg key="w2" viewBox="0 0 320 200" className="w-full h-full">
      <rect width="320" height="200" rx="8" fill={MODE_COLOR.wordHunt.soft} />
      <g transform="translate(28 30)">
        <rect width="120" height="28" rx="14" fill="#0d0d18" stroke={MODE_COLOR.wordHunt.fg} strokeWidth={2} />
        <text x="60" y="20" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={14} fill={MODE_COLOR.wordHunt.fg}>
          MOON ✓
        </text>
      </g>
      <g transform="translate(28 78)">
        <text x="0" y="0" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={12} fill="#FFFEF0">
          Bonus:
        </text>
        <g transform="translate(0 12)">
          <rect width="56" height="22" rx="11" fill={MODE_COLOR.wordHunt.bg} stroke={MODE_COLOR.wordHunt.fg} strokeWidth={1.5} />
          <text x="28" y="16" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={12} fill={MODE_COLOR.wordHunt.fg}>+SUN</text>
        </g>
        <g transform="translate(64 12)">
          <rect width="60" height="22" rx="11" fill={MODE_COLOR.wordHunt.bg} stroke={MODE_COLOR.wordHunt.fg} strokeWidth={1.5} />
          <text x="30" y="16" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={12} fill={MODE_COLOR.wordHunt.fg}>+MOO</text>
        </g>
        <g transform="translate(132 12)">
          <rect width="56" height="22" rx="11" fill={MODE_COLOR.wordHunt.bg} stroke={MODE_COLOR.wordHunt.fg} strokeWidth={1.5} />
          <text x="28" y="16" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={12} fill={MODE_COLOR.wordHunt.fg}>+ON</text>
        </g>
      </g>
      <g transform="translate(180 110)">
        <Tile letter="✦" x={0} y={0} color={MODE_COLOR.wordHunt} active size={28} />
        <text x="36" y="20" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={16} fill="#FFFEF0">All count</text>
      </g>
    </svg>,
    // tip3 — No timer, no life bar
    <svg key="w3" viewBox="0 0 320 200" className="w-full h-full">
      <rect width="320" height="200" rx="8" fill={MODE_COLOR.wordHunt.soft} />
      <g transform="translate(40 62)">
        <rect width="100" height="22" rx="11" fill="#0d0d18" stroke="#FFFEF0" strokeWidth={1.5} opacity={0.45} />
        <text x="50" y="16" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={12} fill="#FFFEF0" opacity={0.6}>
          0:00 timer
        </text>
        <line x1="-4" y1="-4" x2="104" y2="26" stroke="#FF3366" strokeWidth={3.5} strokeLinecap="round" />
      </g>
      <g transform="translate(180 62)">
        <rect width="100" height="22" rx="11" fill="#0d0d18" stroke="#FFFEF0" strokeWidth={1.5} opacity={0.45} />
        <text x="50" y="16" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={12} fill="#FFFEF0" opacity={0.6}>
          ❤❤❤
        </text>
        <line x1="-4" y1="-4" x2="104" y2="26" stroke="#FF3366" strokeWidth={3.5} strokeLinecap="round" />
      </g>
      <g transform="translate(96 120)">
        <Tile letter="∞" x={0} y={0} color={MODE_COLOR.wordHunt} active size={48} />
        <text x={64} y={34} fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={18} fill={MODE_COLOR.wordHunt.fg}>
          Just play
        </text>
      </g>
    </svg>,
  ],
  wheelRush: [
    // tip1 — Center letter required
    <svg key="r1" viewBox="0 0 320 200" className="w-full h-full">
      <rect width="320" height="200" rx="8" fill={MODE_COLOR.wheelRush.soft} />
      <circle cx="160" cy="100" r="76" fill={MODE_COLOR.wheelRush.bg} stroke="#0d0d18" strokeWidth={2.5} />
      <Tile letter="A" x={142} y={36} color={MODE_COLOR.wheelRush} />
      <Tile letter="N" x={196} y={64} color={MODE_COLOR.wheelRush} />
      <Tile letter="T" x={196} y={120} color={MODE_COLOR.wheelRush} />
      <Tile letter="R" x={142} y={148} color={MODE_COLOR.wheelRush} />
      <Tile letter="S" x={88} y={120} color={MODE_COLOR.wheelRush} />
      <Tile letter="P" x={88} y={64} color={MODE_COLOR.wheelRush} />
      <g transform="translate(142 82)">
        <rect width="36" height="36" rx="6" fill={MODE_COLOR.wheelRush.fg} stroke="#0d0d18" strokeWidth={2.5} />
        <text x="18" y="20" textAnchor="middle" dominantBaseline="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={18} fill="#0d0d18">
          E
        </text>
      </g>
      <text x="160" y="190" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={13} fill={MODE_COLOR.wheelRush.fg}>
        Lime center = always in word
      </text>
    </svg>,
    // tip2 — Tap outer letters in any order
    <svg key="r2" viewBox="0 0 320 200" className="w-full h-full">
      <rect width="320" height="200" rx="8" fill={MODE_COLOR.wheelRush.soft} />
      <circle cx="160" cy="100" r="72" fill={MODE_COLOR.wheelRush.bg} stroke="#0d0d18" strokeWidth={2} opacity={0.7} />
      <Path d="M 142 60 L 188 90 L 142 130 L 196 130 L 144 88" color={MODE_COLOR.wheelRush.ring} />
      <Tile letter="A" x={130} y={42} color={MODE_COLOR.wheelRush} active />
      <Tile letter="C" x={184} y={72} color={MODE_COLOR.wheelRush} active />
      <Tile letter="T" x={130} y={120} color={MODE_COLOR.wheelRush} active />
      <g transform="translate(142 82)">
        <rect width="36" height="36" rx="6" fill={MODE_COLOR.wheelRush.fg} stroke="#0d0d18" strokeWidth={2.5} />
        <text x="18" y="20" textAnchor="middle" dominantBaseline="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={18} fill="#0d0d18">
          E
        </text>
      </g>
      <text x="160" y="190" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={13} fill="#FFFEF0">
        Any order — A → C → E → T
      </text>
    </svg>,
    // tip3 — Try plurals
    <svg key="r3" viewBox="0 0 320 200" className="w-full h-full">
      <rect width="320" height="200" rx="8" fill={MODE_COLOR.wheelRush.soft} />
      <g transform="translate(36 70)">
        <Tile letter="C" x={0} y={0} color={MODE_COLOR.wheelRush} active size={32} />
        <Tile letter="A" x={36} y={0} color={MODE_COLOR.wheelRush} active size={32} />
        <Tile letter="T" x={72} y={0} color={MODE_COLOR.wheelRush} active size={32} />
        <text x={52} y={62} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={14} fill="#FFFEF0">
          CAT
        </text>
      </g>
      <text x="158" y="92" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={28} fill={MODE_COLOR.wheelRush.fg}>
        →
      </text>
      <g transform="translate(178 70)">
        <Tile letter="C" x={0} y={0} color={MODE_COLOR.wheelRush} active size={32} />
        <Tile letter="A" x={36} y={0} color={MODE_COLOR.wheelRush} active size={32} />
        <Tile letter="T" x={72} y={0} color={MODE_COLOR.wheelRush} active size={32} />
        <g transform="translate(108 0)">
          <rect width="32" height="32" rx="6" fill={MODE_COLOR.wheelRush.fg} stroke="#0d0d18" strokeWidth={2.5} />
          <text x="16" y="22" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={18} fill="#0d0d18">
            S
          </text>
        </g>
        <text x={70} y={62} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={800} fontSize={14} fill={MODE_COLOR.wheelRush.fg}>
          CATS +
        </text>
      </g>
    </svg>,
  ],
};

/**
 * Per-slide tutorial illustration. SVG composition that depicts the specific
 * mechanic the slide caption describes. Decorative — `aria-hidden` because the
 * caption text already announces the tip to assistive tech.
 */
const PracticeTutorialArt: React.FC<Props> = ({ mode, idx }) => {
  const safeIdx = Math.max(0, Math.min(2, idx)) as 0 | 1 | 2;
  return (
    <div
      data-testid={`practice-tutorial-art-${mode}-${safeIdx}`}
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center bg-neo-navy"
    >
      {ART[mode][safeIdx]}
    </div>
  );
};

export default PracticeTutorialArt;
