/**
 * RedditMultilingualShowcase — Landscape (1920×1080, 30fps, ~12s)
 * For r/languagelearning, r/wordgames
 *
 * Cycles through 5 languages with dark charcoal tiles, neon glows,
 * circuit texture, kawaii mascot — matching real LexiClash promo style.
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
  purple: '#8B5CF6',
  cream: '#FFFEF0',
  white: '#FFFFFF',
  black: '#000000',
} as const;

interface LangScene {
  flag: string;
  label: string;
  grid: string[][];
  words: string[];
  color: string;
  dir: 'ltr' | 'rtl';
  mascot: string;
}

const LANGUAGES: LangScene[] = [
  {
    flag: '🇺🇸',
    label: 'ENGLISH',
    grid: [['H','U','N','T'],['C','L','A','S'],['W','O','R','D'],['B','E','X','I']],
    words: ['HUNT', 'CLASH', 'WORDS'],
    color: C.lime,
    dir: 'ltr',
    mascot: 'mascot/powerup-nobg.gif',
  },
  {
    flag: '🇮🇱',
    label: 'עברית',
    grid: [['מ','ל','ח','מ'],['ה','ש','ב','ע'],['ד','ר','כ','י'],['ת','פ','ל','ה']],
    words: ['מלחמה', 'דרך', 'שבע'],
    color: C.cyan,
    dir: 'rtl',
    mascot: 'mascot/explorer-nobg.gif',
  },
  {
    flag: '🇯🇵',
    label: '日本語',
    grid: [['あ','い','う','え'],['か','き','く','け'],['さ','し','す','せ'],['た','ち','つ','て']],
    words: ['あいう', 'かき', 'しすせ'],
    color: C.pink,
    dir: 'ltr',
    mascot: 'mascot/onfire-nobg.gif',
  },
  {
    flag: '🇸🇪',
    label: 'SVENSKA',
    grid: [['S','T','Ö','R'],['K','L','A','N'],['V','Ä','G','E'],['D','R','Ö','M']],
    words: ['STÖRA', 'KLAN', 'DRÖM'],
    color: C.purple,
    dir: 'ltr',
    mascot: 'mascot/trophy-nobg.gif',
  },
  {
    flag: '🇪🇸',
    label: 'ESPAÑOL',
    grid: [['P','A','L','A'],['B','R','A','S'],['C','O','M','O'],['J','U','E','G']],
    words: ['PALABRA', 'COMO', 'JUEGO'],
    color: C.lime,
    dir: 'ltr',
    mascot: 'mascot/mindblown-nobg.gif',
  },
];

const SCENE_FRAMES = 75;
const TRANSITION_FRAMES = 16;

/** Circuit board background */
const CircuitBg: React.FC = () => (
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
        width: 6, height: 6, borderRadius: '50%', background: C.cyan,
      }} />
    ))}
  </div>
);

/** Dark charcoal tile with neon highlight */
const Tile: React.FC<{
  letter: string;
  delay: number;
  frame: number;
  fps: number;
  highlight: boolean;
  color: string;
}> = ({ letter, delay, frame, fps, highlight, color }) => {
  const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 150 } });
  const glowPulse = highlight
    ? 0.6 + 0.4 * Math.sin((frame - delay) * 0.15)
    : 0;

  return (
    <div
      style={{
        width: 105,
        height: 105,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: highlight
          ? `linear-gradient(145deg, ${color}33 0%, ${C.tile} 70%)`
          : `linear-gradient(145deg, #33334a 0%, ${C.tile} 100%)`,
        border: `2px solid ${highlight ? color : C.tileBorder}`,
        borderRadius: 8,
        boxShadow: highlight
          ? `0 0 ${12 + glowPulse * 8}px ${color}55, 2px 2px 0px ${C.black}`
          : `2px 2px 0px ${C.black}`,
        transform: `scale(${s})`,
        fontFamily: fredoka,
        fontSize: 44,
        fontWeight: 700,
        color: highlight ? color : C.cream,
      }}
    >
      {letter}
    </div>
  );
};

/** Word chip in found list */
const WordChip: React.FC<{
  word: string;
  index: number;
  frame: number;
  fps: number;
  color: string;
  dir: 'ltr' | 'rtl';
  isLatest: boolean;
}> = ({ word, index, frame, fps, color, dir, isLatest }) => {
  const wS = spring({
    frame: frame - (15 + index * 14),
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  return (
    <div
      style={{
        background: isLatest
          ? `linear-gradient(135deg, ${color}44, ${color}22)`
          : `${C.tile}cc`,
        border: `2px solid ${isLatest ? color : C.tileBorder}`,
        borderRadius: 8,
        boxShadow: isLatest
          ? `0 0 12px ${color}33, 2px 2px 0px ${C.black}`
          : `2px 2px 0px ${C.black}`,
        padding: '10px 28px',
        fontFamily: fredoka,
        fontSize: 28,
        fontWeight: 700,
        color: isLatest ? color : C.cream,
        transform: `translateX(${interpolate(wS, [0, 1], [dir === 'rtl' ? -150 : 150, 0])}px)`,
        opacity: interpolate(wS, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
        letterSpacing: '0.06em',
      }}
    >
      {word}
    </div>
  );
};

/** One language scene */
const LanguageScene: React.FC<{ lang: LangScene }> = ({ lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const visibleWords = lang.words.filter((_, i) => frame > 15 + i * 14);

  return (
    <AbsoluteFill style={{ backgroundColor: C.navy }}>
      <CircuitBg />

      {/* Ambient glow orbs */}
      <div style={{
        position: 'absolute', top: 100, left: 200,
        width: 400, height: 400, borderRadius: '50%',
        background: `radial-gradient(circle, ${lang.color}08 0%, transparent 70%)`,
      }} />
      <div style={{
        position: 'absolute', bottom: 50, right: 300,
        width: 300, height: 300, borderRadius: '50%',
        background: `radial-gradient(circle, ${C.pink}06 0%, transparent 70%)`,
      }} />

      {/* Flag + Language label */}
      <div
        style={{
          position: 'absolute',
          top: 55,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <span style={{ fontSize: 64 }}>{lang.flag}</span>
        <span
          style={{
            fontFamily: fredoka,
            fontSize: 52,
            fontWeight: 700,
            color: lang.color,
            letterSpacing: '0.08em',
            textShadow: `0 0 25px ${lang.color}44`,
          }}
        >
          {lang.label}
        </span>
      </div>

      {/* Grid (center-left) */}
      <div
        style={{
          position: 'absolute',
          left: 140,
          top: '50%',
          transform: 'translateY(-28%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          direction: lang.dir,
        }}
      >
        {lang.grid.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 6 }}>
            {row.map((letter, ci) => {
              const highlight = frame > 15 + ri * 3 + ci * 2 && (ri + ci) % 3 === 0;
              return (
                <Tile
                  key={ci}
                  letter={letter}
                  delay={ri * 2 + ci * 2}
                  frame={frame}
                  fps={fps}
                  highlight={highlight}
                  color={lang.color}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Found words (right side) */}
      <div
        style={{
          position: 'absolute',
          right: 140,
          top: '50%',
          transform: 'translateY(-28%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          direction: lang.dir,
        }}
      >
        <div
          style={{
            fontFamily: rubik,
            fontSize: 16,
            fontWeight: 700,
            color: `${lang.color}88`,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 6,
          }}
        >
          WORDS FOUND
        </div>
        {visibleWords.map((word, i) => (
          <WordChip
            key={word}
            word={word}
            index={i}
            frame={frame}
            fps={fps}
            color={lang.color}
            dir={lang.dir}
            isLatest={i === visibleWords.length - 1}
          />
        ))}
      </div>

      {/* Mascot (bottom-right corner) */}
      <div style={{
        position: 'absolute',
        bottom: 30,
        right: 60,
        opacity: interpolate(frame, [10, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        <AnimatedImage
          src={staticFile(lang.mascot)}
          width={180}
          height={180}
          fit="contain"
          loopBehavior="loop"
        />
      </div>
    </AbsoluteFill>
  );
};

/** CTA scene */
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: C.navy }}>
      <CircuitBg />

      {/* Big neon glow behind title */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 200, borderRadius: '50%',
        background: `radial-gradient(circle, ${C.lime}15 0%, transparent 70%)`,
      }} />

      {/* Flags row */}
      <div
        style={{
          position: 'absolute',
          top: '16%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 24,
          alignItems: 'center',
        }}
      >
        {LANGUAGES.map((lang, i) => (
          <span
            key={lang.label}
            style={{
              fontSize: 52,
              opacity: interpolate(
                frame - i * 4,
                [0, 6],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
              ),
              transform: `translateY(${interpolate(
                frame - i * 4,
                [0, 6],
                [15, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
              )}px)`,
            }}
          >
            {lang.flag}
          </span>
        ))}
      </div>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: '36%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: fredoka,
          fontSize: 96,
          fontWeight: 700,
          color: C.lime,
          textShadow: `0 0 40px ${C.lime}44, 0 0 80px ${C.lime}22`,
          letterSpacing: '0.12em',
        }}
      >
        LEXICLASH
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: 'absolute',
          top: '54%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: rubik,
          fontSize: 34,
          fontWeight: 700,
          color: `${C.cream}bb`,
          letterSpacing: '0.05em',
        }}
      >
        5 languages &middot; Free &middot; Browser
      </div>

      {/* URL */}
      <div
        style={{
          position: 'absolute',
          top: '62%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: rubik,
          fontSize: 28,
          fontWeight: 900,
          color: C.lime,
          textShadow: `0 0 16px ${C.lime}44`,
          letterSpacing: '0.04em',
        }}
      >
        lexiclash.live
      </div>

      {/* Mascot */}
      <div style={{
        position: 'absolute',
        top: '72%',
        left: '50%',
        transform: 'translateX(-50%)',
        opacity: interpolate(frame, [8, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        <AnimatedImage
          src={staticFile('mascot/crying-nobg.gif')}
          width={200}
          height={200}
          fit="contain"
          loopBehavior="loop"
        />
      </div>
    </AbsoluteFill>
  );
};

export const RedditMultilingualShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.navy }}>
      <TransitionSeries>
        {LANGUAGES.flatMap((lang, i) => {
          const items: React.ReactNode[] = [
            <TransitionSeries.Sequence key={`seq-${lang.label}`} durationInFrames={SCENE_FRAMES}>
              <LanguageScene lang={lang} />
            </TransitionSeries.Sequence>,
          ];
          if (i < LANGUAGES.length - 1) {
            items.push(
              <TransitionSeries.Transition
                key={`tr-${lang.label}`}
                presentation={slide({ direction: 'from-right' })}
                timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
              />,
            );
          }
          return items;
        })}

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 10 })}
        />

        <TransitionSeries.Sequence durationInFrames={120}>
          <CTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

RedditMultilingualShowcase.displayName = 'RedditMultilingualShowcase';
