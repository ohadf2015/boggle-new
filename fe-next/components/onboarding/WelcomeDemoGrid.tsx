'use client';

import React, { useMemo } from 'react';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getWelcomeDemoConfig } from './demoConfigs';

/**
 * 4×4 animated demo grid that traces a locale-appropriate word on a 4s loop.
 * Per language: PLAY (en, ja-romaji), GATO (es), KATT (sv), שמחה (he).
 *
 * Built with the game's actual tile colors (lime/cyan) so the welcome
 * teaches the real interaction, not a stylized tutorial image. Path stroke
 * animates via SVG `pathLength`; tiles light up in sequence.
 */

const CELL = 64;
const GAP = 6;
const PAD = 16;
const SIZE = CELL * 4 + GAP * 3 + PAD * 2;

const cx = (col: number) => PAD + col * (CELL + GAP) + CELL / 2;
const cy = (row: number) => PAD + row * (CELL + GAP) + CELL / 2;

const WelcomeDemoGrid: React.FC = () => {
  const { language, t } = useLanguage();
  const config = useMemo(() => getWelcomeDemoConfig(language), [language]);
  const { letters: GRID, path: PATH, word } = config;

  const pathD = useMemo(
    () => PATH.map(([c, r], i) => `${i === 0 ? 'M' : 'L'} ${cx(c)} ${cy(r)}`).join(' '),
    [PATH],
  );

  const isOnPath = (col: number, row: number): number => {
    for (let i = 0; i < PATH.length; i++) {
      if (PATH[i][0] === col && PATH[i][1] === row) return i;
    }
    return -1;
  };

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full h-auto"
      role="img"
      aria-label={t('onboarding.welcome.demoAriaLabel', { word })}
    >
      {/* Tiles */}
      {GRID.map((row, r) =>
        row.map((letter, c) => {
          const x = PAD + c * (CELL + GAP);
          const y = PAD + r * (CELL + GAP);
          const pathIdx = isOnPath(c, r);
          const onPath = pathIdx >= 0;
          // Static palette: path tiles cycle lime, off-path stays navy-light
          const baseFill = onPath ? '#BFFF00' : '#16213e';
          const baseText = onPath ? '#0a0f1c' : '#FFFEF0';
          const accentFill = '#FF1493';

          return (
            <g key={`${r}-${c}`}>
              {/* Hard pixel shadow */}
              <rect
                x={x + 3}
                y={y + 3}
                width={CELL}
                height={CELL}
                rx={8}
                fill="#000"
              />
              <m.rect
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx={8}
                stroke="#000"
                strokeWidth={2.5}
                initial={{ fill: baseFill }}
                animate={
                  onPath
                    ? {
                        fill: [baseFill, accentFill, baseFill],
                      }
                    : { fill: baseFill }
                }
                transition={
                  onPath
                    ? {
                        duration: 4,
                        delay: 0.6 + pathIdx * 0.5,
                        repeat: Infinity,
                        repeatDelay: 0,
                        times: [0, 0.08, 1],
                        ease: 'easeOut',
                      }
                    : { duration: 0 }
                }
              />
              <text
                x={x + CELL / 2}
                y={y + CELL / 2}
                fill={baseText}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="Fredoka, sans-serif"
                fontSize={32}
                fontWeight={700}
                style={{ pointerEvents: 'none' }}
              >
                {letter}
              </text>
            </g>
          );
        }),
      )}

      {/* Animated trace path */}
      <m.path
        d={pathD}
        fill="none"
        stroke="#FF1493"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 4,
          delay: 0.4,
          repeat: Infinity,
          times: [0, 0.5, 0.85, 1],
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{ filter: 'drop-shadow(2px 2px 0 #000)' }}
      />

      {/* Pointer dot follows the trace */}
      <m.circle
        r={9}
        fill="#FFFEF0"
        stroke="#000"
        strokeWidth={2.5}
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 1, 1, 0],
          cx: PATH.map(([c]) => cx(c)),
          cy: PATH.map(([, r]) => cy(r)),
        }}
        transition={{
          duration: 4,
          delay: 0.4,
          repeat: Infinity,
          times: [0, 0.04, 0.5, 0.55],
          ease: 'easeInOut',
        }}
      />
    </svg>
  );
};

export default WelcomeDemoGrid;
