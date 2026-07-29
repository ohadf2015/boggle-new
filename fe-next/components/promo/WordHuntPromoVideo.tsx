/**
 * WordHuntPromoVideo — Instagram Reel (1080×1920, 9:16, 30fps, ~15s)
 *
 * v6:
 *  - No shake on hook — zoom-punch + flash burst instead
 *  - All screens centered vertically
 *  - Multiplayer emphasized: split-screen 1v1 with two grids + racing scores
 *  - Clean bg-removed flat 2D grid asset
 *  - Bangers + Sora fonts
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
import {
  TransitionSeries,
  linearTiming,
} from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { Audio } from '@remotion/media';
import { loadFont as loadBangers } from '@remotion/google-fonts/Bangers';
import { loadFont as loadSora } from '@remotion/google-fonts/Sora';

const { fontFamily: bangers } = loadBangers('normal', {
  weights: ['400'],
  subsets: ['latin'],
});
const { fontFamily: sora } = loadSora('normal', {
  weights: ['400', '500', '600', '700'],
  subsets: ['latin'],
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
// SCENE 1: HOOK — zoom-punch + flash, no shake
// ==============================================

const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Soft bg pulse
  const bgA = Math.round((0.12 + Math.sin(frame * 0.05) * 0.04) * 255)
    .toString(16).padStart(2, '0');

  // Line 1 — smooth entrance
  const l1 = spring({ frame, fps, config: { damping: 200 } });
  const l1Y = interpolate(l1, [0, 1], [50, 0]);

  // Line 2 — zoom-punch: starts big, lands at normal scale with overshoot
  const l2Raw = spring({ frame, fps, delay: 16, config: { damping: 8, stiffness: 80 } });
  const l2Scale = interpolate(l2Raw, [0, 1], [2.5, 1]);
  const l2O = interpolate(frame, [16, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Flash burst on impact (frame ~22-30)
  const flashO = interpolate(frame, [20, 22, 30], [0, 0.6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Accent line wipe
  const lineW = interpolate(frame, [28, 50], [0, 500], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  // Mascot
  const mIn = spring({ frame: frame - 20, fps, config: { damping: 10, stiffness: 70 } });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* Bg glow */}
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

      {/* Flash burst overlay */}
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
        {/* Line 1 */}
        <div style={{ transform: `translateY(${l1Y}px)`, opacity: l1 }}>
          <div
            style={{
              fontFamily: sora,
              fontSize: 50,
              fontWeight: 600,
              color: `${C.white}DD`,
              textAlign: 'center',
              letterSpacing: '0.05em',
            }}
          >
            Think You&apos;re Smart?
          </div>
        </div>

        <div style={{ height: 16 }} />

        {/* PROVE IT — zoom-punch entrance */}
        <div style={{ transform: `scale(${l2Scale})`, opacity: l2O }}>
          <div
            style={{
              fontFamily: bangers,
              fontSize: 140,
              color: C.lime,
              textAlign: 'center',
              letterSpacing: '0.1em',
              textShadow: `0 0 50px ${C.lime}55, 0 0 100px ${C.lime}22`,
              lineHeight: 1,
            }}
          >
            PROVE IT.
          </div>
        </div>

        {/* Accent line */}
        <div
          style={{
            width: lineW,
            height: 4,
            background: `linear-gradient(90deg, transparent, ${C.lime}, transparent)`,
            marginTop: 16,
            borderRadius: 2,
          }}
        />

        {/* Mascot */}
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
// SCENE 2: GRID GAMEPLAY
// ==============================================

const WORDS = [
  { word: 'HUNT', pts: 120, color: C.lime },
  { word: 'CLASH', pts: 250, color: C.pink },
  { word: 'LEXI', pts: 180, color: C.cyan },
  { word: 'UNLEASH', pts: 480, color: C.lime },
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
        {/* Title */}
        <div style={{ transform: `scale(${titleIn})`, marginBottom: 24 }}>
          <div
            style={{
              fontFamily: bangers,
              fontSize: 76,
              color: C.pink,
              letterSpacing: '0.16em',
              textShadow: `0 0 25px ${C.pink}44`,
              textAlign: 'center',
            }}
          >
            WORD HUNT
          </div>
        </div>

        {/* Grid — floating */}
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

        {/* Words */}
        <div style={{ width: 780, marginTop: 16, padding: '0 20px' }}>
          {WORDS.map((w, i) => {
            const delay = 24 + i * 10;
            const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 150 } });
            const x = interpolate(s, [0, 1], [700, 0]);
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
                }}
              >
                <span style={{ fontFamily: bangers, fontSize: 38, color: w.color, letterSpacing: '0.1em' }}>
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
// SCENE 3: 1v1 MULTIPLAYER — split-screen battle
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
      {/* Mascot avatar */}
      <AnimatedImage
        src={staticFile(mascotSrc)}
        width={140}
        height={140}
        fit="contain"
        loopBehavior="loop"
      />

      {/* Name pill */}
      <div
        style={{
          marginTop: 12,
          padding: '8px 24px',
          background: `${color}12`,
          border: `2px solid ${color}44`,
          borderRadius: 999,
          fontFamily: sora,
          fontSize: 22,
          fontWeight: 600,
          color,
        }}
      >
        {name}
      </div>

      {/* Score */}
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

      {/* Mini grid */}
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

  // VS badge
  const vsIn = spring({ frame: frame - 8, fps, config: { damping: 6, stiffness: 55 } });
  const vsPulse = 1 + Math.sin(frame * 0.15) * 0.02;

  // Header
  const headerO = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  // "Who will win?" text
  const winO = interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* Center glow */}
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
        {/* Header */}
        <div
          style={{
            fontFamily: bangers,
            fontSize: 56,
            color: C.pink,
            letterSpacing: '0.12em',
            textShadow: `0 0 20px ${C.pink}44`,
            textAlign: 'center',
            marginBottom: 8,
            opacity: headerO,
          }}
        >
          1v1 MULTIPLAYER
        </div>
        <div
          style={{
            fontFamily: sora,
            fontSize: 24,
            fontWeight: 500,
            color: `${C.white}88`,
            letterSpacing: '0.15em',
            marginBottom: 30,
            opacity: headerO,
          }}
        >
          REAL-TIME WORD BATTLES
        </div>

        {/* Split screen: Player 1 | VS | Player 2 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '0 30px',
          }}
        >
          <PlayerHalf
            name="xX_WordLord_Xx"
            color={C.lime}
            score={s1}
            frame={frame}
            fps={fps}
            fromX={-400}
            mascotSrc="mascot/flexing.gif"
          />

          {/* VS badge */}
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
            name="VocabMom69"
            color={C.cyan}
            score={s2}
            frame={frame}
            fps={fps}
            fromX={400}
            mascotSrc="mascot/onfire-nobg.gif"
          />
        </div>

        {/* "Who will win?" */}
        <div
          style={{
            fontFamily: sora,
            fontSize: 28,
            fontWeight: 600,
            color: C.white,
            marginTop: 35,
            opacity: winO,
            letterSpacing: '0.06em',
            textShadow: `0 0 15px ${C.pink}33`,
          }}
        >
          Who will win?
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================================
// SCENE 4: STATS
// ==============================================

const STATS = [
  { label: '50K+', sub: 'Players', color: C.lime },
  { label: '1M+', sub: 'Words Found', color: C.pink },
  { label: '4', sub: 'Languages', color: C.cyan },
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
              fontFamily: bangers,
              fontSize: 84,
              color: C.cyan,
              textShadow: `0 0 30px ${C.cyan}44`,
              letterSpacing: '0.08em',
              textAlign: 'center',
            }}
          >
            Join the Battle
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 45, alignItems: 'center' }}>
          {STATS.map((stat, i) => {
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
                }}
              >
                <div
                  style={{
                    fontFamily: bangers,
                    fontSize: 96,
                    color: stat.color,
                    textShadow: `0 0 25px ${stat.color}44`,
                    minWidth: 240,
                    textAlign: 'right',
                    lineHeight: 1,
                  }}
                >
                  {stat.label}
                </div>
                <div style={{ fontFamily: sora, fontSize: 34, fontWeight: 500, color: `${C.white}CC` }}>
                  {stat.sub}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: sora,
            fontSize: 28,
            fontWeight: 500,
            color: `${C.white}AA`,
            textAlign: 'center',
            marginTop: 60,
            opacity: interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' }),
            letterSpacing: '0.04em',
          }}
        >
          Free to play · No pay-to-win · Pure skill
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
// SCENE 5: CTA
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
            fontFamily: bangers,
            fontSize: 50,
            color: C.white,
            letterSpacing: '0.08em',
            position: 'relative',
            overflow: 'hidden',
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
          PLAY FOR FREE
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

export const WordHuntPromoVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* Background music — in_game.mp3 with fade in/out */}
      <Audio
        src={staticFile('music/bossa-arcade.mp3')}
        volume={(f) => {
          const fadeInEnd = 30; // 1s fade in
          const fadeOutStart = TOTAL_FRAMES - 45; // 1.5s fade out
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
          presentation={slide({ direction: 'from-right' })}
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

WordHuntPromoVideo.displayName = 'WordHuntPromoVideo';
