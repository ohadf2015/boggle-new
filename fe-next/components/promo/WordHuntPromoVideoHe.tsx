/**
 * WordHuntPromoVideoHe — Hebrew Instagram Reel (1080×1920, 9:16, 30fps, ~15s)
 *
 * Hebrew RTL version of the Word Hunt promo video.
 * Same structure, Hebrew text, RTL slide directions.
 */

import React from 'react';
import {
  AbsoluteFill,
  Img,
  AnimatedImage,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
  staticFile,
} from 'remotion';
import { Audio } from '@remotion/media';
import {
  TransitionSeries,
  linearTiming,
} from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { loadFont as loadBangers } from '@remotion/google-fonts/Bangers';
import { loadFont as loadSora } from '@remotion/google-fonts/Sora';
import { loadFont as loadHeebo } from '@remotion/google-fonts/Heebo';

const { fontFamily: bangers } = loadBangers('normal', {
  weights: ['400'],
  subsets: ['latin'],
});
const { fontFamily: sora } = loadSora('normal', {
  weights: ['400', '500', '600', '700'],
  subsets: ['latin'],
});
const { fontFamily: heebo } = loadHeebo('normal', {
  weights: ['400', '500', '600', '700', '800', '900'],
  subsets: ['hebrew'],
});

const C = {
  bg: '#0f0f23',
  lime: '#BFFF00',
  pink: '#FF1493',
  cyan: '#00FFFF',
  purple: '#8B5CF6',
  white: '#FFFFFF',
  black: '#000000',
} as const;

const center: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

// ==============================================
// SCENE 1: HOOK — "חושבים שאתם חכמים? תוכיחו."
// ==============================================

const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgA = Math.round((0.12 + Math.sin(frame * 0.05) * 0.04) * 255)
    .toString(16).padStart(2, '0');

  const l1 = spring({ frame, fps, config: { damping: 200 } });
  const l1Y = interpolate(l1, [0, 1], [50, 0]);

  const l2Raw = spring({ frame, fps, delay: 16, config: { damping: 8, stiffness: 80 } });
  const l2Scale = interpolate(l2Raw, [0, 1], [2.5, 1]);
  const l2O = interpolate(frame, [16, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flashO = interpolate(frame, [20, 22, 30], [0, 0.6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineW = interpolate(frame, [28, 50], [0, 500], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  const mIn = spring({ frame: frame - 20, fps, config: { damping: 10, stiffness: 70 } });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.pink}${bgA} 0%, transparent 60%)`,
          filter: 'blur(80px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 48%, ${C.lime}CC 0%, transparent 50%)`,
          opacity: flashO,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
      <div style={center}>
        <div style={{ transform: `translateY(${l1Y}px)`, opacity: l1 }}>
          <div
            style={{
              fontFamily: heebo,
              fontSize: 52,
              fontWeight: 700,
              color: `${C.white}DD`,
              textAlign: 'center',
              direction: 'rtl',
            }}
          >
            חושבים שאתם חכמים?
          </div>
        </div>
        <div style={{ height: 16 }} />
        <div style={{ transform: `scale(${l2Scale})`, opacity: l2O }}>
          <div
            style={{
              fontFamily: heebo,
              fontSize: 120,
              fontWeight: 900,
              color: C.lime,
              textAlign: 'center',
              textShadow: `0 0 50px ${C.lime}55, 0 0 100px ${C.lime}22`,
              lineHeight: 1,
              direction: 'rtl',
            }}
          >
            תוכיחו.
          </div>
        </div>
        <div
          style={{
            width: lineW,
            height: 4,
            background: `linear-gradient(90deg, transparent, ${C.lime}, transparent)`,
            marginTop: 16,
            borderRadius: 2,
          }}
        />
        <div style={{ marginTop: 50, transform: `scale(${mIn})`, opacity: mIn }}>
          <AnimatedImage
            src={staticFile('mascot/play.gif')}
            width={280}
            height={280}
            fit="contain"
            loopBehavior="loop"
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================================
// SCENE 2: GRID — "ציד מילים"
// ==============================================

const WORDS_HE = [
  { word: 'ציד', pts: 120, color: C.lime },
  { word: 'קרב', pts: 250, color: C.pink },
  { word: 'מילה', pts: 180, color: C.cyan },
  { word: 'ניצחון', pts: 480, color: C.lime },
];

const GridScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gridIn = spring({ frame, fps, config: { damping: 10, stiffness: 70 } });
  const gridO = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const titleIn = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const floatY = Math.sin(frame * 0.07) * 8;
  const floatR = Math.sin(frame * 0.05) * 1;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.lime}0D 0%, transparent 55%)`,
          filter: 'blur(40px)',
        }}
      />
      <div style={center}>
        <div style={{ transform: `scale(${titleIn})`, marginBottom: 24 }}>
          <div
            style={{
              fontFamily: heebo,
              fontSize: 76,
              fontWeight: 900,
              color: C.pink,
              letterSpacing: '0.05em',
              textShadow: `0 0 25px ${C.pink}44`,
              textAlign: 'center',
              direction: 'rtl',
            }}
          >
            ציד מילים
          </div>
        </div>
        <div
          style={{
            transform: `scale(${gridIn}) translateY(${floatY}px) rotate(${floatR}deg)`,
            opacity: gridO,
          }}
        >
          <Img
            src={staticFile('images/promo/promo-grid-clean.png')}
            style={{ width: 580, height: 580, objectFit: 'contain' }}
          />
        </div>
        <div style={{ width: 780, marginTop: 16, padding: '0 20px' }}>
          {WORDS_HE.map((w, i) => {
            const delay = 24 + i * 10;
            const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 150 } });
            const x = interpolate(s, [0, 1], [-700, 0]); // RTL: slide from left
            const o = interpolate(frame - delay, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
            const sp = spring({ frame: frame - delay - 4, fps, config: { damping: 5, stiffness: 90 } });

            return (
              <div
                key={w.word}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 26px',
                  marginBottom: 9,
                  background: `${w.color}10`,
                  border: `2px solid ${w.color}77`,
                  borderRadius: 10,
                  transform: `translateX(${x}px)`,
                  opacity: o,
                  direction: 'rtl',
                }}
              >
                <span style={{ fontFamily: heebo, fontSize: 38, fontWeight: 800, color: w.color }}>
                  {w.word}
                </span>
                <span
                  style={{
                    fontFamily: sora,
                    fontSize: 30,
                    fontWeight: 700,
                    color: C.white,
                    transform: `scale(${sp})`,
                    display: 'inline-block',
                  }}
                >
                  +{w.pts}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================================
// SCENE 3: 1v1 — "1 נגד 1"
// ==============================================

const PlayerHalf: React.FC<{
  name: string;
  color: string;
  score: number;
  frame: number;
  fps: number;
  fromX: number;
  mascotSrc: string;
}> = ({ name, color, score, frame, fps, fromX, mascotSrc }) => {
  const slideIn = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const x = interpolate(slideIn, [0, 1], [fromX, 0]);
  const scorePulse = 1 + Math.sin(frame * 0.8) * 0.015;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `translateX(${x}px)`,
        flex: 1,
      }}
    >
      <AnimatedImage
        src={staticFile(mascotSrc)}
        width={140}
        height={140}
        fit="contain"
        loopBehavior="loop"
      />
      <div
        style={{
          marginTop: 12,
          padding: '8px 24px',
          background: `${color}12`,
          border: `2px solid ${color}44`,
          borderRadius: 999,
          fontFamily: heebo,
          fontSize: 22,
          fontWeight: 600,
          color,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontFamily: bangers,
          fontSize: 80,
          color: C.white,
          textShadow: `0 0 25px ${color}44`,
          lineHeight: 1,
          marginTop: 8,
          transform: `scale(${scorePulse})`,
        }}
      >
        {score}
      </div>
      <div style={{ marginTop: 12 }}>
        <Img
          src={staticFile('images/promo/promo-grid-clean.png')}
          style={{ width: 200, height: 200, objectFit: 'contain', opacity: 0.7 }}
        />
      </div>
    </div>
  );
};

const VSScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s1 = Math.min(Math.floor(frame * 22), 1350);
  const s2 = Math.min(Math.floor(frame * 16), 980);
  const vsIn = spring({ frame: frame - 8, fps, config: { damping: 6, stiffness: 55 } });
  const vsPulse = 1 + Math.sin(frame * 0.15) * 0.02;
  const headerO = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const winO = interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 600,
          background: `radial-gradient(circle, ${C.pink}12 0%, transparent 55%)`,
          filter: 'blur(50px)',
        }}
      />
      <div style={center}>
        <div
          style={{
            fontFamily: heebo,
            fontSize: 56,
            fontWeight: 900,
            color: C.pink,
            textShadow: `0 0 20px ${C.pink}44`,
            textAlign: 'center',
            marginBottom: 8,
            opacity: headerO,
            direction: 'rtl',
          }}
        >
          1 נגד 1
        </div>
        <div
          style={{
            fontFamily: heebo,
            fontSize: 24,
            fontWeight: 500,
            color: `${C.white}88`,
            letterSpacing: '0.1em',
            marginBottom: 30,
            opacity: headerO,
            direction: 'rtl',
          }}
        >
          קרבות מילים בזמן אמת
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '0 30px',
          }}
        >
          <PlayerHalf
            name="מלך_המילים"
            color={C.lime}
            score={s1}
            frame={frame}
            fps={fps}
            fromX={-400}
            mascotSrc="mascot/flexing.gif"
          />
          <div
            style={{
              transform: `scale(${vsIn * vsPulse})`,
              padding: '18px 30px',
              background: `linear-gradient(135deg, ${C.pink}, ${C.purple})`,
              border: `3px solid ${C.black}`,
              borderRadius: 14,
              boxShadow: `4px 4px 0px ${C.black}`,
              margin: '0 8px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontFamily: bangers,
                fontSize: 64,
                color: C.white,
                letterSpacing: '0.1em',
                lineHeight: 1,
                textAlign: 'center',
              }}
            >
              VS
            </div>
          </div>
          <PlayerHalf
            name="אימא_של_בוגל"
            color={C.cyan}
            score={s2}
            frame={frame}
            fps={fps}
            fromX={400}
            mascotSrc="mascot/onfire-nobg.gif"
          />
        </div>
        <div
          style={{
            fontFamily: heebo,
            fontSize: 28,
            fontWeight: 600,
            color: C.white,
            marginTop: 35,
            opacity: winO,
            direction: 'rtl',
          }}
        >
          מי ינצח?
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================================
// SCENE 4: STATS — "הצטרפו לקרב"
// ==============================================

const STATS_HE = [
  { label: '50K+', sub: 'שחקנים', color: C.lime },
  { label: '1M+', sub: 'מילים נמצאו', color: C.pink },
  { label: '4', sub: 'שפות', color: C.cyan },
];

const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 10, stiffness: 80 } });
  const mIn = spring({ frame: frame - 50, fps, config: { damping: 8, stiffness: 65 } });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.cyan}0D 0%, transparent 55%)`,
          filter: 'blur(50px)',
        }}
      />
      <div style={center}>
        <div style={{ transform: `scale(${titleIn})`, marginBottom: 80 }}>
          <div
            style={{
              fontFamily: heebo,
              fontSize: 80,
              fontWeight: 900,
              color: C.cyan,
              textShadow: `0 0 30px ${C.cyan}44`,
              textAlign: 'center',
              direction: 'rtl',
            }}
          >
            הצטרפו לקרב
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 45, alignItems: 'center' }}>
          {STATS_HE.map((stat, i) => {
            const delay = 14 + i * 14;
            const s = spring({ frame: frame - delay, fps, config: { damping: 7, stiffness: 70 } });
            const o = interpolate(frame - delay, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

            return (
              <div
                key={stat.label}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 24,
                  transform: `scale(${s})`,
                  opacity: o,
                  direction: 'rtl',
                }}
              >
                <div
                  style={{
                    fontFamily: bangers,
                    fontSize: 96,
                    color: stat.color,
                    textShadow: `0 0 25px ${stat.color}44`,
                    minWidth: 240,
                    textAlign: 'left',
                    lineHeight: 1,
                  }}
                >
                  {stat.label}
                </div>
                <div style={{ fontFamily: heebo, fontSize: 34, fontWeight: 500, color: `${C.white}CC` }}>
                  {stat.sub}
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            fontFamily: heebo,
            fontSize: 28,
            fontWeight: 500,
            color: `${C.white}AA`,
            textAlign: 'center',
            marginTop: 60,
            opacity: interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' }),
            direction: 'rtl',
          }}
        >
          בחינם · בלי פרסומות · רק כישרון
        </div>
        <div style={{ marginTop: 45, transform: `scale(${mIn})`, opacity: mIn > 0.01 ? mIn : 0 }}>
          <AnimatedImage
            src={staticFile('mascot/celebration.gif')}
            width={250}
            height={250}
            fit="contain"
            loopBehavior="loop"
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================================
// SCENE 5: CTA — same branding, Hebrew subtitle
// ==============================================

const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 5, stiffness: 40 } });
  const btnIn = spring({ frame: frame - 12, fps, config: { damping: 7, stiffness: 55 } });
  const btnPulse = 1 + Math.sin(frame * 0.35) * 0.02;
  const shimmerX = interpolate(frame, [22, 55], [-130, 230], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });
  const urlO = interpolate(frame, [18, 34], [0, 1], { extrapolateRight: 'clamp' });
  const glowSize = 35 + Math.sin(frame * 0.2) * 12;
  const mIn = spring({ frame: frame - 14, fps, config: { damping: 10, stiffness: 65 } });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div
        style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 500,
          background: `radial-gradient(ellipse, ${C.lime}10 0%, transparent 55%)`,
          filter: 'blur(60px)',
        }}
      />
      <div style={center}>
        {/* LEXICLASH stays in English — it's the brand name */}
        <div style={{ transform: `scale(${logoIn})` }}>
          <div
            style={{
              fontFamily: bangers,
              fontSize: 115,
              color: C.lime,
              letterSpacing: '0.18em',
              textShadow: `0 0 ${glowSize}px ${C.lime}66, 0 0 ${glowSize * 2}px ${C.lime}22`,
              textAlign: 'center',
              lineHeight: 1,
            }}
          >
            LEXICLASH
          </div>
        </div>
        <div style={{ height: 50 }} />
        <div
          style={{
            transform: `scale(${btnIn * btnPulse})`,
            padding: '28px 80px',
            background: `linear-gradient(135deg, ${C.pink}, ${C.purple})`,
            border: `3px solid ${C.black}`,
            borderRadius: 12,
            boxShadow: `5px 5px 0px ${C.black}`,
            fontFamily: heebo,
            fontSize: 48,
            fontWeight: 800,
            color: C.white,
            position: 'relative',
            overflow: 'hidden',
            direction: 'rtl',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${shimmerX}%`,
              width: 70,
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
              transform: 'skewX(-20deg)',
              pointerEvents: 'none',
            }}
          />
          שחקו בחינם
        </div>
        <div
          style={{
            fontFamily: sora,
            fontSize: 30,
            fontWeight: 600,
            color: C.lime,
            opacity: urlO,
            marginTop: 28,
            letterSpacing: '0.05em',
            textShadow: `0 0 12px ${C.lime}33`,
          }}
        >
          lexiclash.live
        </div>
        <div style={{ marginTop: 50, transform: `scale(${mIn})`, opacity: mIn }}>
          <AnimatedImage
            src={staticFile('mascot/waving.gif')}
            width={260}
            height={260}
            fit="contain"
            loopBehavior="loop"
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================================
// MAIN
// ==============================================

const T = 12;
const TOTAL_FRAMES = 462;

export const WordHuntPromoVideoHe: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Audio
        src={staticFile('music/bossa-arcade.mp3')}
        volume={(f) => {
          const fadeInEnd = 30;
          const fadeOutStart = TOTAL_FRAMES - 45;
          if (f < fadeInEnd) {
            return interpolate(f, [0, fadeInEnd], [0, 0.7], { extrapolateRight: 'clamp' });
          }
          if (f > fadeOutStart) {
            return interpolate(f, [fadeOutStart, TOTAL_FRAMES], [0.7, 0], { extrapolateRight: 'clamp' });
          }
          return 0.7;
        }}
        loop
      />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={105}>
          <HookScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-left' })}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={132}>
          <GridScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={102}>
          <VSScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={102}>
          <StatsScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={69}>
          <CTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

WordHuntPromoVideoHe.displayName = 'WordHuntPromoVideoHe';
