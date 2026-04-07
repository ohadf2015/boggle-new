/**
 * RedditVSBattle — Landscape (1920x1080, 30fps, ~10s)
 * For r/WebGames, r/playmygame, r/IndieGaming
 *
 * Split-screen 1v1 battle with kawaii mascots, pink lightning VS,
 * dark charcoal tiles, neon glows, race track.
 * TransitionSeries with slide/fade transitions between scenes.
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
import {
  TransitionSeries,
  linearTiming,
} from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
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

/** Circuit board background */
const CircuitBg: React.FC<{ color?: string }> = ({ color = C.cyan }) => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.05 }}>
    {[160, 380, 600, 820].map((y) => (
      <div key={`h${y}`} style={{
        position: 'absolute', top: y, left: 0, right: 0, height: 1, background: color,
      }} />
    ))}
    {[250, 650, 1050, 1450, 1750].map((x) => (
      <div key={`v${x}`} style={{
        position: 'absolute', left: x, top: 0, bottom: 0, width: 1, background: color,
      }} />
    ))}
  </div>
);

/** Pink lightning bolt SVG (matches promo-vs-flat.png style) */
const LightningBolt: React.FC<{ height: number; opacity: number }> = ({ height, opacity }) => (
  <svg width={80} height={height} viewBox="0 0 80 200" style={{ opacity }}>
    <path d="M50 0 L20 85 L40 85 L10 200 L70 100 L45 100 L75 0 Z"
      fill={C.pink} stroke={C.black} strokeWidth={2} />
    <path d="M50 0 L20 85 L40 85 L10 200 L70 100 L45 100 L75 0 Z"
      fill="none" stroke={C.pink} strokeWidth={4}
      style={{ filter: 'blur(8px)' }} />
  </svg>
);

/* ---------- Scene 1: "VS" Intro with mascot blobs ---------- */
const VSIntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const vsScale = spring({ frame: frame - 12, fps, config: { damping: 6, stiffness: 80 } });
  const p1In = spring({ frame: frame - 3, fps, config: { damping: 12, stiffness: 100 } });
  const p2In = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 100 } });
  const boltFlash = interpolate(frame, [14, 18, 22, 26], [0, 1, 0.6, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.navy, overflow: 'hidden' }}>
      <CircuitBg />

      {/* Left glow (lime) */}
      <div style={{
        position: 'absolute', left: -100, top: '30%',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(191,255,0,0.1) 0%, transparent 60%)',
      }} />
      {/* Right glow (cyan) */}
      <div style={{
        position: 'absolute', right: -100, top: '30%',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,255,255,0.1) 0%, transparent 60%)',
      }} />

      {/* Player 1 — Lime mascot */}
      <div style={{
        position: 'absolute', left: 240, top: '50%',
        transform: `translateY(-50%) translateX(${interpolate(p1In, [0, 1], [-400, 0])}px)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        opacity: interpolate(p1In, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        <AnimatedImage src={staticFile('mascot/powerup-nobg.gif')}
          width={220} height={220} fit="contain" loopBehavior="loop" />
        <div style={{
          fontFamily: fredoka, fontSize: 34, fontWeight: 700,
          color: C.lime, letterSpacing: '0.06em',
          textShadow: '0 0 20px rgba(191,255,0,0.4)',
        }}>WordNinja42</div>
        <div style={{
          fontFamily: rubik, fontSize: 18, fontWeight: 700,
          color: 'rgba(255,254,240,0.4)', letterSpacing: '0.1em',
        }}>ELO 1420</div>
      </div>

      {/* Center VS + Lightning */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: `translate(-50%, -50%) scale(${Math.max(0, vsScale)})`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <LightningBolt height={260} opacity={boltFlash} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: fredoka, fontSize: 100, fontWeight: 700,
          color: C.pink, letterSpacing: '0.08em',
          textShadow: '0 0 40px rgba(255,20,147,0.6), 0 0 80px rgba(255,20,147,0.2)',
          WebkitTextStroke: `3px ${C.black}`,
        }}>VS</div>
      </div>

      {/* Player 2 — Cyan mascot */}
      <div style={{
        position: 'absolute', right: 240, top: '50%',
        transform: `translateY(-50%) translateX(${interpolate(p2In, [0, 1], [400, 0])}px)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        opacity: interpolate(p2In, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        <AnimatedImage src={staticFile('mascot/onfire-nobg.gif')}
          width={220} height={220} fit="contain" loopBehavior="loop" />
        <div style={{
          fontFamily: fredoka, fontSize: 34, fontWeight: 700,
          color: C.cyan, letterSpacing: '0.06em',
          textShadow: '0 0 20px rgba(0,255,255,0.4)',
        }}>LexiQueen</div>
        <div style={{
          fontFamily: rubik, fontSize: 18, fontWeight: 700,
          color: 'rgba(255,254,240,0.4)', letterSpacing: '0.1em',
        }}>ELO 1385</div>
      </div>

      {/* "WORD HUNT" subtitle at top */}
      <div style={{
        position: 'absolute', top: 50, left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: fredoka, fontSize: 28, fontWeight: 700,
        color: 'rgba(255,254,240,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase',
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
      }}>WORD HUNT — RANKED MATCH</div>
    </AbsoluteFill>
  );
};

/* ---------- Scene 2: Split-screen gameplay ---------- */
const PLAYER_WORDS = [
  { word: 'CLASH', pts: 250, at: 20 },
  { word: 'HUNT', pts: 120, at: 60 },
  { word: 'CLAWS', pts: 280, at: 100 },
];
const OPPONENT_WORDS = [
  { word: 'WORDS', pts: 180, at: 35 },
  { word: 'CLAN', pts: 110, at: 75 },
  { word: 'DIAL', pts: 80, at: 115 },
];

function scoreAt(words: typeof PLAYER_WORDS, frame: number): number {
  return words.reduce((acc, w) => (frame > w.at + 5 ? acc + w.pts : acc), 0);
}

/** Dark charcoal mini grid */
const MiniGrid: React.FC<{
  letters: string[][]; frame: number; fps: number; accentColor: string;
}> = ({ letters, frame, fps, accentColor }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', gap: 4,
    padding: 8, borderRadius: 12,
    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)',
  }}>
    {letters.map((row, ri) => (
      <div key={ri} style={{ display: 'flex', gap: 4 }}>
        {row.map((letter, ci) => {
          const s = spring({ frame: frame - ri * 2 - ci, fps, config: { damping: 12, stiffness: 140 } });
          const highlight = (frame + ri * 5 + ci * 7) % 40 < 6;
          return (
            <div key={ci} style={{
              width: 68, height: 68,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: highlight ? accentColor : `linear-gradient(165deg, ${C.tile} 0%, #232338 100%)`,
              border: `2px solid ${highlight ? `${accentColor}88` : C.tileBorder}`,
              borderRadius: 10,
              boxShadow: highlight
                ? `0 0 12px ${accentColor}66`
                : 'inset 0 1px 0 rgba(255,255,255,0.04)',
              transform: `scale(${s})`,
              fontFamily: fredoka, fontSize: 30, fontWeight: 700,
              color: highlight ? C.black : C.white,
              textShadow: highlight ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
            }}>{letter}</div>
          );
        })}
      </div>
    ))}
  </div>
);

/** Neon score display */
const NeonScore: React.FC<{ score: number; color: string }> = ({ score, color }) => (
  <div style={{
    fontFamily: rubik, fontSize: 36, fontWeight: 900, color,
    textShadow: `0 0 16px ${color}88, 0 0 32px ${color}44`,
    letterSpacing: '0.04em',
  }}>{String(score).padStart(3, '0')}</div>
);

/** Found word chip */
const WordChip: React.FC<{
  word: string; pts: number; color: string; frame: number; appearAt: number; fps: number;
}> = ({ word, pts, color, frame, appearAt, fps }) => {
  const s = spring({ frame: frame - appearAt - 3, fps, config: { damping: 10, stiffness: 140 } });
  if (frame <= appearAt + 3) return null;

  return (
    <div style={{
      background: color, border: `3px solid ${C.black}`,
      borderRadius: 8, boxShadow: `2px 2px 0px ${C.black}`,
      padding: '4px 16px',
      fontFamily: fredoka, fontSize: 20, fontWeight: 700, color: C.black,
      transform: `scale(${s})`, opacity: interpolate(s, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
      whiteSpace: 'nowrap',
    }}>{word} +{pts}</div>
  );
};

const RaceTrack: React.FC<{ p1Score: number; p2Score: number; maxScore: number }> = ({
  p1Score, p2Score, maxScore,
}) => {
  const p1Pct = Math.min(1, p1Score / maxScore);
  const p2Pct = Math.min(1, p2Score / maxScore);

  return (
    <div style={{
      position: 'absolute', bottom: 60, left: '50%',
      transform: 'translateX(-50%)', width: 800,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{
        fontFamily: rubik, fontSize: 14, fontWeight: 700,
        color: 'rgba(255,254,240,0.4)', textTransform: 'uppercase',
        letterSpacing: '0.12em', textAlign: 'center', marginBottom: 2,
      }}>LIVE RACE</div>

      {/* P1 track */}
      <div style={{
        height: 36, background: 'rgba(191,255,0,0.06)',
        border: `2px solid rgba(191,255,0,0.3)`, borderRadius: 10,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${p1Pct * 100}%`,
          background: `linear-gradient(90deg, ${C.lime}22, ${C.lime}66)`,
          borderRadius: 8,
          boxShadow: `0 0 12px ${C.lime}44`,
        }} />
        <div style={{
          position: 'absolute', left: `calc(${p1Pct * 100}% - 14px)`,
          top: '50%', transform: 'translateY(-50%)', fontSize: 22,
        }}>💪</div>
        <div style={{
          position: 'absolute', right: 0, top: 0, width: 6, height: '100%',
          background: 'repeating-linear-gradient(0deg, #000, #000 3px, #fff 3px, #fff 6px)',
        }} />
      </div>

      {/* P2 track */}
      <div style={{
        height: 36, background: 'rgba(0,255,255,0.06)',
        border: `2px solid rgba(0,255,255,0.3)`, borderRadius: 10,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${p2Pct * 100}%`,
          background: `linear-gradient(90deg, ${C.cyan}22, ${C.cyan}66)`,
          borderRadius: 8,
          boxShadow: `0 0 12px ${C.cyan}44`,
        }} />
        <div style={{
          position: 'absolute', left: `calc(${p2Pct * 100}% - 14px)`,
          top: '50%', transform: 'translateY(-50%)', fontSize: 22,
        }}>🔥</div>
        <div style={{
          position: 'absolute', right: 0, top: 0, width: 6, height: '100%',
          background: 'repeating-linear-gradient(0deg, #000, #000 3px, #fff 3px, #fff 6px)',
        }} />
      </div>
    </div>
  );
};

const BattleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p1Score = scoreAt(PLAYER_WORDS, frame);
  const p2Score = scoreAt(OPPONENT_WORDS, frame);
  const grid = [['H','U','N','T'],['C','L','A','S'],['W','O','R','D'],['B','E','X','I']];

  const p1Latest = [...PLAYER_WORDS].reverse().find((w) => frame > w.at + 3);
  const p2Latest = [...OPPONENT_WORDS].reverse().find((w) => frame > w.at + 3);

  return (
    <AbsoluteFill style={{ backgroundColor: C.navy }}>
      <CircuitBg />

      {/* Center lightning divider */}
      <div style={{
        position: 'absolute', left: '50%', top: 30, bottom: 120,
        transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 2, height: '100%',
          background: `linear-gradient(180deg, transparent, ${C.pink}44, ${C.pink}88, ${C.pink}44, transparent)`,
          boxShadow: `0 0 8px ${C.pink}44`,
        }} />
        <div style={{
          position: 'absolute', top: '50%', transform: 'translateY(-50%)',
          fontFamily: fredoka, fontSize: 24, fontWeight: 700,
          color: C.pink, textShadow: `0 0 12px ${C.pink}88`,
        }}>VS</div>
      </div>

      {/* Player 1 (left) */}
      <div style={{
        position: 'absolute', left: 50, top: 30,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        width: 'calc(50% - 60px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <AnimatedImage src={staticFile('mascot/powerup-nobg.gif')}
            width={64} height={64} fit="contain" loopBehavior="loop" />
          <span style={{
            fontFamily: fredoka, fontSize: 22, fontWeight: 700, color: C.lime,
            textShadow: `0 0 12px ${C.lime}44`,
          }}>WordNinja42</span>
          <NeonScore score={p1Score} color={C.lime} />
        </div>
        <MiniGrid letters={grid} frame={frame} fps={fps} accentColor={C.lime} />
        {p1Latest && (
          <WordChip word={p1Latest.word} pts={p1Latest.pts} color={C.lime}
            frame={frame} appearAt={p1Latest.at} fps={fps} />
        )}
      </div>

      {/* Player 2 (right) */}
      <div style={{
        position: 'absolute', right: 50, top: 30,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        width: 'calc(50% - 60px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <AnimatedImage src={staticFile('mascot/onfire-nobg.gif')}
            width={64} height={64} fit="contain" loopBehavior="loop" />
          <span style={{
            fontFamily: fredoka, fontSize: 22, fontWeight: 700, color: C.cyan,
            textShadow: `0 0 12px ${C.cyan}44`,
          }}>LexiQueen</span>
          <NeonScore score={p2Score} color={C.cyan} />
        </div>
        <MiniGrid letters={grid} frame={frame} fps={fps} accentColor={C.cyan} />
        {p2Latest && (
          <WordChip word={p2Latest.word} pts={p2Latest.pts} color={C.cyan}
            frame={frame} appearAt={p2Latest.at} fps={fps} />
        )}
      </div>

      <RaceTrack p1Score={p1Score} p2Score={p2Score} maxScore={1000} />
    </AbsoluteFill>
  );
};

/* ---------- Scene 3: Victory + CTA ---------- */
const VictoryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const winnerScale = spring({ frame: frame - 5, fps, config: { damping: 6, stiffness: 60 } });
  const ctaIn = spring({ frame: frame - 30, fps, config: { damping: 10, stiffness: 80 } });

  return (
    <AbsoluteFill style={{
      backgroundColor: C.navy,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <CircuitBg color={C.lime} />

      {/* Victory glow */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(191,255,0,0.1) 0%, transparent 60%)',
      }} />

      <div style={{
        transform: `scale(${Math.max(0, winnerScale)})`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        <AnimatedImage src={staticFile('mascot/trophy-nobg.gif')}
          width={220} height={220} fit="contain" loopBehavior="loop" />
        <div style={{
          fontFamily: fredoka, fontSize: 72, fontWeight: 700,
          color: C.lime, letterSpacing: '0.08em',
          textShadow: '0 0 40px rgba(191,255,0,0.5), 0 0 80px rgba(191,255,0,0.2)',
        }}>VICTORY!</div>
        <div style={{
          fontFamily: rubik, fontSize: 28, fontWeight: 700,
          color: C.lime, display: 'flex', alignItems: 'center', gap: 10,
          textShadow: `0 0 12px ${C.lime}44`,
        }}>
          WordNinja42 — 980 pts
        </div>
      </div>

      <div style={{
        marginTop: 36, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 10,
        opacity: interpolate(ctaIn, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(ctaIn, [0, 1], [30, 0])}px)`,
      }}>
        <div style={{
          fontFamily: fredoka, fontSize: 60, fontWeight: 700,
          color: C.pink, letterSpacing: '0.1em',
          textShadow: '0 0 30px rgba(255,20,147,0.4)',
        }}>LEXICLASH</div>
        <div style={{
          fontFamily: rubik, fontSize: 24, fontWeight: 700, color: 'rgba(255,254,240,0.7)',
        }}>Challenge anyone &middot; Free &middot; Browser</div>
        <div style={{
          fontFamily: rubik, fontSize: 22, fontWeight: 900, color: C.lime, marginTop: 4,
          textShadow: '0 0 12px rgba(191,255,0,0.4)',
        }}>lexiclash.live</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Main composition ---------- */
export const RedditVSBattle: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C.navy }}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={80}>
        <VSIntroScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: 'from-bottom' })}
        timing={linearTiming({ durationInFrames: 18 })}
      />

      <TransitionSeries.Sequence durationInFrames={160}>
        <BattleScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 20 })}
      />

      <TransitionSeries.Sequence durationInFrames={110}>
        <VictoryScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

RedditVSBattle.displayName = 'RedditVSBattle';
