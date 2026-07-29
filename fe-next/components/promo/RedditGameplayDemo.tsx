/**
 * RedditGameplayDemo — Landscape (1920x1080, 30fps, ~15s)
 * For r/WebGames, r/playmygame
 *
 * Simulated Word Hunt gameplay — relaxed pacing, 4 words found,
 * dark charcoal tiles, neon glows, circuit texture, mascot.
 */

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  staticFile,
  AnimatedImage,
} from 'remotion';
import { loadFont as loadFredoka } from '@remotion/google-fonts/Fredoka';
import { loadFont as loadRubik } from '@remotion/google-fonts/Rubik';

const { fontFamily: fredoka } = loadFredoka('normal', {
  weights: ['700'],
  subsets: ['latin'],
});
const { fontFamily: rubik } = loadRubik('normal', {
  weights: ['400', '700', '800', '900'],
  subsets: ['latin'],
});

const C = {
  navy: '#1a1a2e',
  tile: '#2a2a3e',
  tileBorder: '#3a3a4e',
  lime: '#BFFF00',
  pink: '#FF1493',
  cyan: '#00FFFF',
  red: '#FF3366',
  cream: '#FFFEF0',
  white: '#FFFFFF',
  black: '#000000',
} as const;

const GRID_LETTERS = [
  ['H', 'U', 'N', 'T'],
  ['C', 'L', 'A', 'S'],
  ['W', 'O', 'R', 'D'],
  ['B', 'E', 'X', 'I'],
];

/** Only 4 words, spaced out generously */
const FOUND_WORDS: {
  word: string;
  pts: number;
  delay: number;
  cells: [number, number][];
}[] = [
  { word: 'HUNT', pts: 120, delay: 50, cells: [[0,0],[0,1],[0,2],[0,3]] },
  { word: 'CLASH', pts: 250, delay: 100, cells: [[1,0],[1,1],[1,2],[1,3],[0,3]] },
  { word: 'WORDS', pts: 180, delay: 155, cells: [[2,0],[2,1],[2,2],[2,3],[0,3]] },
  { word: 'LORE', pts: 140, delay: 210, cells: [[1,1],[2,1],[2,2],[3,1]] },
];

function getActiveCellInfo(frame: number): { active: Set<string>; combo: number } {
  let combo = 0;
  for (const w of FOUND_WORDS) {
    if (frame < w.delay) continue;
    const elapsed = frame - w.delay;
    if (elapsed > 25) { combo++; continue; }
    const cellsLit = Math.min(w.cells.length, Math.floor(elapsed / 4) + 1);
    const active = new Set<string>();
    for (let i = 0; i < cellsLit; i++) {
      active.add(`${w.cells[i][0]},${w.cells[i][1]}`);
    }
    return { active, combo };
  }
  return { active: new Set(), combo };
}

const CircuitBackground: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.06 }}>
    {[180, 400, 620, 840].map((y) => (
      <div key={`h${y}`} style={{
        position: 'absolute', top: y, left: 0, right: 0,
        height: 1, background: C.cyan,
      }} />
    ))}
    {[300, 700, 1100, 1500].map((x) => (
      <div key={`v${x}`} style={{
        position: 'absolute', left: x, top: 0, bottom: 0,
        width: 1, background: C.cyan,
      }} />
    ))}
    {[[300,180],[700,400],[1100,620],[1500,840],[300,620],[1100,180]].map(([x,y], i) => (
      <div key={`n${i}`} style={{
        position: 'absolute', left: x - 3, top: y - 3,
        width: 6, height: 6, borderRadius: '50%',
        background: C.cyan,
      }} />
    ))}
  </div>
);

const GridCell: React.FC<{
  letter: string; row: number; col: number;
  frame: number; fps: number;
  isSelected: boolean; combo: number;
}> = ({ letter, row, col, frame, fps, isSelected, combo }) => {
  const delay = row * 4 + col * 3;
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 90 } });

  let selectedBg: string = C.lime;
  let selectedGlow = '0 0 16px rgba(191,255,0,0.6), 0 0 4px rgba(191,255,0,0.3)';
  if (combo >= 3) {
    selectedBg = 'linear-gradient(135deg, #F97316, #EF4444)';
    selectedGlow = '0 0 16px rgba(249,115,22,0.6)';
  }

  return (
    <div style={{
      width: 110, height: 110,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: isSelected ? selectedBg : `linear-gradient(165deg, ${C.tile} 0%, #232338 100%)`,
      border: `2px solid ${isSelected ? 'rgba(191,255,0,0.6)' : C.tileBorder}`,
      borderRadius: 12,
      boxShadow: isSelected
        ? selectedGlow
        : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.3)',
      transform: `scale(${s * (isSelected ? 1.06 : 1)})`,
      fontFamily: fredoka, fontSize: 48, fontWeight: 700,
      color: isSelected ? C.black : C.white,
      textShadow: isSelected ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
      transition: 'background 0.3s, border-color 0.3s',
    }}>
      {letter}
    </div>
  );
};

const CircularTimer: React.FC<{ timeLeft: number; size: number }> = ({ timeLeft, size }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const progress = timeLeft / 60;
  const isLow = timeLeft <= 20;

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.black} strokeWidth={4} opacity={0.3} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={isLow ? C.red : C.cyan} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
          strokeLinecap="square"
          style={{ filter: `drop-shadow(0 0 6px ${isLow ? C.red : C.cyan})` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: rubik, fontWeight: 900, fontSize: size * 0.35,
        color: isLow ? C.red : C.white,
        textShadow: `0 0 8px ${isLow ? 'rgba(255,51,102,0.5)' : 'rgba(0,255,255,0.3)'}`,
      }}>
        {timeLeft}
      </div>
    </div>
  );
};

const ScoreDisplay: React.FC<{ score: number; rank: number }> = ({ score, rank }) => (
  <div style={{
    position: 'relative',
    border: '2px solid rgba(191,255,0,0.3)', borderRadius: 12,
    background: 'rgba(191,255,0,0.08)',
    padding: '8px 28px', minWidth: 100, textAlign: 'center',
  }}>
    <div style={{
      fontFamily: rubik, fontSize: 12, fontWeight: 700,
      color: 'rgba(255,254,240,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em',
    }}>SCORE</div>
    <div style={{
      fontFamily: rubik, fontSize: 40, fontWeight: 900, color: C.lime,
      textShadow: '0 0 20px rgba(191,255,0,0.5), 0 0 40px rgba(191,255,0,0.2)',
    }}>{String(score).padStart(3, '0')}</div>
    <div style={{
      position: 'absolute', top: -10, right: -10,
      width: 26, height: 26, borderRadius: '50%',
      background: C.pink, border: '2px solid rgba(0,0,0,0.3)',
      boxShadow: '0 0 8px rgba(255,20,147,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: rubik, fontSize: 12, fontWeight: 900, color: C.white,
    }}>{rank}</div>
  </div>
);

const WordListPanel: React.FC<{
  words: typeof FOUND_WORDS; frame: number; fps: number;
}> = ({ words, frame, fps }) => (
  <div style={{
    background: C.cream, border: `4px solid ${C.black}`,
    borderRadius: 12, boxShadow: `3px 3px 0px ${C.black}`,
    width: 340, transform: 'rotate(1deg)', overflow: 'hidden',
  }}>
    <div style={{
      background: C.cyan, borderBottom: `4px solid ${C.black}`,
      padding: '10px 16px', fontFamily: fredoka, fontSize: 20, fontWeight: 700,
      color: C.black, textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>WORDS FOUND</div>
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {words.map((w) => {
        const wIn = spring({ frame: frame - w.delay - 15, fps, config: { damping: 12, stiffness: 100 } });
        if (frame <= w.delay + 10) return null;
        const isLatest = words.filter((ww) => frame > ww.delay + 10).pop()?.word === w.word;
        return (
          <div key={w.word} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 12px',
            background: isLatest ? C.lime : C.cream,
            border: `3px solid ${C.black}`, borderRadius: 8,
            boxShadow: isLatest ? `2px 2px 0px ${C.black}` : `1px 1px 0px ${C.black}`,
            transform: `translateX(${interpolate(wIn, [0, 1], [200, 0])}px)`,
            opacity: interpolate(wIn, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
          }}>
            <span style={{
              fontFamily: rubik, fontSize: 18, fontWeight: 900, color: C.black,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{w.word}</span>
            <span style={{
              fontFamily: rubik, fontSize: 16, fontWeight: 700, color: C.black,
              background: 'rgba(0,0,0,0.05)', borderRadius: 6, padding: '2px 8px',
            }}>+{w.pts}</span>
          </div>
        );
      })}
    </div>
  </div>
);

const WordFormingBar: React.FC<{ frame: number; words: typeof FOUND_WORDS }> = ({ frame, words }) => {
  let currentWord = '';
  let state: 'forming' | 'accepted' | 'idle' = 'idle';
  let currentPts = 0;

  for (const w of words) {
    if (frame < w.delay) continue;
    const elapsed = frame - w.delay;
    if (elapsed <= 18) {
      const lettersShown = Math.min(w.word.length, Math.floor(elapsed / 3) + 1);
      currentWord = w.word.slice(0, lettersShown);
      state = 'forming';
      break;
    } else if (elapsed <= 28) {
      currentWord = w.word;
      currentPts = w.pts;
      state = 'accepted';
      break;
    }
  }

  if (state === 'idle') return null;

  return (
    <div style={{
      background: state === 'accepted' ? C.lime : 'rgba(0,255,255,0.15)',
      border: state === 'accepted' ? `3px solid ${C.black}` : `2px solid ${C.cyan}`,
      borderRadius: 10, padding: '8px 32px', minWidth: 200, textAlign: 'center',
      boxShadow: state === 'accepted'
        ? `2px 2px 0px ${C.black}`
        : `0 0 12px rgba(0,255,255,0.3)`,
      fontFamily: fredoka, fontSize: 32, fontWeight: 700,
      color: state === 'accepted' ? C.black : C.cyan,
      letterSpacing: '0.12em', textTransform: 'uppercase',
    }}>
      {currentWord}
      {state === 'accepted' && (
        <span style={{ marginLeft: 12, fontSize: 20 }}>+{currentPts}</span>
      )}
    </div>
  );
};

export const RedditGameplayDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 16, stiffness: 80 } });
  const titleO = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const { active, combo } = getActiveCellInfo(frame);

  const score = FOUND_WORDS.reduce((acc, w) =>
    frame > w.delay + 20 ? acc + w.pts : acc, 0);
  const timeLeft = Math.max(0, 60 - Math.floor(frame / 7));

  const ctaO = interpolate(frame, [340, 370], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const ctaScale = spring({ frame: frame - 340, fps, config: { damping: 10, stiffness: 60 } });

  return (
    <AbsoluteFill style={{ backgroundColor: C.navy }}>
      <CircuitBackground />

      <div style={{
        position: 'absolute', left: 200, top: '40%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,255,255,0.06) 0%, transparent 70%)',
        transform: 'translate(-50%, -50%)',
      }} />

      {/* LEFT: Grid area */}
      <div style={{
        position: 'absolute', left: 100, top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 30, opacity: titleO }}>
          <CircularTimer timeLeft={timeLeft} size={80} />
          <ScoreDisplay score={score} rank={2} />
        </div>

        <WordFormingBar frame={frame} words={FOUND_WORDS} />

        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6, padding: 12,
          borderRadius: 14, background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: combo >= 3
            ? '0 0 20px rgba(0,255,255,0.3)'
            : '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {GRID_LETTERS.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 6 }}>
              {row.map((letter, ci) => (
                <GridCell key={ci} letter={letter} row={ri} col={ci}
                  frame={frame} fps={fps}
                  isSelected={active.has(`${ri},${ci}`)} combo={combo} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Word list + title */}
      <div style={{
        position: 'absolute', right: 80, top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{
            fontFamily: fredoka, fontSize: 56, fontWeight: 700,
            color: C.pink, letterSpacing: '0.08em',
            transform: `scale(${titleIn})`, textTransform: 'uppercase',
            textShadow: '0 0 30px rgba(255,20,147,0.5), 0 0 60px rgba(255,20,147,0.2)',
          }}>WORD HUNT</div>
          <div style={{
            fontFamily: rubik, fontSize: 18, fontWeight: 700,
            color: 'rgba(255,254,240,0.5)', letterSpacing: '0.12em',
            textTransform: 'uppercase', opacity: titleO,
          }}>FIND WORDS. BEAT EVERYONE.</div>
        </div>

        <WordListPanel words={FOUND_WORDS} frame={frame} fps={fps} />

        <div style={{ alignSelf: 'center', marginTop: 4 }}>
          <AnimatedImage src={staticFile('mascot/onfire-nobg.gif')}
            width={180} height={180} fit="contain" loopBehavior="loop" />
        </div>
      </div>

      {/* CTA overlay */}
      {frame > 330 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(26,26,46,0.94)', opacity: ctaO,
        }}>
          <div style={{
            position: 'absolute', width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(191,255,0,0.12) 0%, transparent 60%)',
          }} />
          <div style={{
            fontFamily: fredoka, fontSize: 96, fontWeight: 700,
            color: C.lime, letterSpacing: '0.12em', textTransform: 'uppercase',
            textShadow: '0 0 40px rgba(191,255,0,0.4), 0 0 80px rgba(191,255,0,0.15)',
            transform: `scale(${Math.max(0, ctaScale)})`,
          }}>LEXICLASH</div>
          <div style={{
            fontFamily: rubik, fontSize: 30, fontWeight: 700,
            color: 'rgba(255,254,240,0.8)', marginTop: 12, letterSpacing: '0.06em',
          }}>Free &middot; No signup &middot; Browser</div>
          <div style={{
            fontFamily: rubik, fontSize: 26, fontWeight: 900,
            color: C.lime, marginTop: 20,
            textShadow: '0 0 12px rgba(191,255,0,0.4)',
          }}>lexiclash.live</div>
          <div style={{ marginTop: 16 }}>
            <AnimatedImage src={staticFile('mascot/explorer-nobg.gif')}
              width={200} height={200} fit="contain" loopBehavior="loop" />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

RedditGameplayDemo.displayName = 'RedditGameplayDemo';
