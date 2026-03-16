/**
 * WordHuntPromoVideo — Instagram Reel (1080×1920, 9:16, 30fps, ~15s)
 *
 * v4 — Improvements:
 *  - Bangers (display) + Sora (body) font pairing for gaming energy
 *  - Clean hook scene (no noisy bg texture)
 *  - BG-removed grid asset + animated float/glow
 *  - VS asset with mix-blend-mode: screen (black bg = transparent)
 *  - All images have motion (float, scale pulse, rotation)
 *  - Tighter, more polished layout filling portrait frame
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
import { loadFont as loadBangers } from '@remotion/google-fonts/Bangers';
import { loadFont as loadSora } from '@remotion/google-fonts/Sora';

// ==============================================
// FONTS
// ==============================================

const { fontFamily: bangers } = loadBangers('normal', {
  weights: ['400'],
  subsets: ['latin'],
});

const { fontFamily: sora } = loadSora('normal', {
  weights: ['400', '500', '600', '700'],
  subsets: ['latin'],
});

// ==============================================
// DESIGN TOKENS
// ==============================================

const C = {
  navy: '#0f0f23',
  navyLight: '#1a1a2e',
  lime: '#BFFF00',
  pink: '#FF1493',
  cyan: '#00FFFF',
  purple: '#8B5CF6',
  white: '#FFFFFF',
  black: '#000000',
} as const;

// ==============================================
// SCENE 1: HOOK — Clean, bold, no noise
// ==============================================

const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Gentle background pulse
  const bgPulse = 0.15 + Math.sin(frame * 0.05) * 0.05;

  // Line 1
  const l1 = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const l1Y = interpolate(l1, [0, 1], [80, 0]);

  // Line 2 — delayed, punchy overshoot
  const l2 = spring({ frame, fps, delay: 20, config: { damping: 5, stiffness: 45 } });
  const l2Y = interpolate(l2, [0, 1], [140, 0]);

  // Impact shake
  const shakeI = interpolate(frame, [26, 42], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const sx = Math.sin(frame * 2.6) * shakeI;
  const sy = Math.cos(frame * 3.3) * shakeI * 0.5;

  // Mascot slide up
  const mY = interpolate(frame, [15, 40], [350, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.exp),
  });
  const mO = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' });

  // Decorative accent line
  const lineW = interpolate(frame, [35, 60], [0, 600], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.navy }}>
      {/* Subtle radial glow — no texture */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 1000,
          height: 1000,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.pink}${Math.round(bgPulse * 255).toString(16).padStart(2, '0')} 0%, transparent 60%)`,
          filter: 'blur(80px)',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translate(${sx}px, ${sy}px)`,
          paddingBottom: 80,
        }}
      >
        {/* Line 1 */}
        <div style={{ transform: `translateY(${l1Y}px)`, opacity: l1 }}>
          <div
            style={{
              fontFamily: sora,
              fontSize: 52,
              fontWeight: 600,
              color: `${C.white}DD`,
              textAlign: 'center',
              letterSpacing: '0.06em',
            }}
          >
            Think You&apos;re Smart?
          </div>
        </div>

        <div style={{ height: 20 }} />

        {/* Line 2 — PROVE IT */}
        <div style={{ transform: `translateY(${l2Y}px) scale(${l2})`, opacity: l2 }}>
          <div
            style={{
              fontFamily: bangers,
              fontSize: 150,
              fontWeight: 400,
              color: C.lime,
              textAlign: 'center',
              letterSpacing: '0.12em',
              textShadow: `0 0 60px ${C.lime}66, 0 0 120px ${C.lime}33`,
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
            marginTop: 20,
            borderRadius: 2,
          }}
        />

        {/* Mascot */}
        <div
          style={{
            marginTop: 50,
            transform: `translateY(${mY}px)`,
            opacity: mO,
          }}
        >
          <AnimatedImage
            src={staticFile('mascot/play-nobg.gif')}
            width={300}
            height={300}
            fit="contain"
            loopBehavior="loop"
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================================
// SCENE 2: GRID — Animated floating grid
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

  // Grid entrance — scale + fade
  const gridIn = spring({ frame, fps, config: { damping: 10, stiffness: 70 } });
  const gridO = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });

  // Grid float animation — gentle up/down bob + subtle rotation
  const floatY = Math.sin(frame * 0.08) * 12;
  const floatRotate = Math.sin(frame * 0.06) * 1.5;

  // Grid glow pulse
  const glowPulse = 30 + Math.sin(frame * 0.12) * 15;

  // Title
  const titleIn = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });

  return (
    <AbsoluteFill style={{ backgroundColor: C.navy }}>
      {/* Grid glow behind */}
      <div
        style={{
          position: 'absolute',
          top: '32%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.lime}18 0%, transparent 55%)`,
          filter: `blur(${glowPulse}px)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 120,
        }}
      >
        {/* Title */}
        <div style={{ transform: `scale(${titleIn})`, marginBottom: 30 }}>
          <div
            style={{
              fontFamily: bangers,
              fontSize: 80,
              color: C.pink,
              letterSpacing: '0.18em',
              textShadow: `0 0 30px ${C.pink}55`,
              textAlign: 'center',
            }}
          >
            WORD HUNT
          </div>
        </div>

        {/* Grid — floating, animated */}
        <div
          style={{
            transform: `scale(${gridIn}) translateY(${floatY}px) rotate(${floatRotate}deg)`,
            opacity: gridO,
            filter: `drop-shadow(0 0 ${glowPulse}px ${C.lime}44)`,
          }}
        >
          <Img
            src={staticFile('images/promo/promo-grid-v2-nobg.png')}
            style={{
              width: 680,
              height: 680,
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Word reveals */}
        <div style={{ width: 820, marginTop: 20, padding: '0 30px' }}>
          {WORDS.map((w, i) => {
            const delay = 25 + i * 11;
            const s = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, stiffness: 150 },
            });
            const x = interpolate(s, [0, 1], [700, 0]);
            const o = interpolate(frame - delay, [0, 6], [0, 1], {
              extrapolateRight: 'clamp',
            });
            const scorePop = spring({
              frame: frame - delay - 4,
              fps,
              config: { damping: 5, stiffness: 90 },
            });

            return (
              <div
                key={w.word}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 32px',
                  marginBottom: 10,
                  background: `${w.color}10`,
                  border: `2px solid ${w.color}88`,
                  borderRadius: 10,
                  boxShadow: `0 0 20px ${w.color}15`,
                  transform: `translateX(${x}px)`,
                  opacity: o,
                }}
              >
                <span
                  style={{
                    fontFamily: bangers,
                    fontSize: 42,
                    color: w.color,
                    letterSpacing: '0.12em',
                    textShadow: `0 0 10px ${w.color}44`,
                  }}
                >
                  {w.word}
                </span>
                <span
                  style={{
                    fontFamily: sora,
                    fontSize: 34,
                    fontWeight: 700,
                    color: C.white,
                    transform: `scale(${scorePop})`,
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
// SCENE 3: VS BATTLE — animated clash
// ==============================================

const VSScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // VS image entrance — slam in with overshoot
  const vsIn = spring({ frame: frame - 8, fps, config: { damping: 5, stiffness: 55 } });

  // VS image animation — pulse scale + subtle sway
  const vsPulse = 1 + Math.sin(frame * 0.15) * 0.03;
  const vsRotate = Math.sin(frame * 0.1) * 1;

  // Score counters — race up
  const s1 = Math.min(Math.floor(frame * 22), 1350);
  const s2 = Math.min(Math.floor(frame * 16), 980);

  // Player slide-ins
  const pIn = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const p1X = interpolate(pIn, [0, 1], [-500, 0]);
  const p2X = interpolate(pIn, [0, 1], [500, 0]);

  // Shake
  const shakeAmt = interpolate(frame, [10, 26], [18, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const shakeX = Math.sin(frame * 3) * shakeAmt;

  // Mascot
  const mScale = spring({ frame: frame - 25, fps, config: { damping: 9, stiffness: 70 } });

  return (
    <AbsoluteFill style={{ backgroundColor: C.navy, transform: `translateX(${shakeX}px)` }}>
      {/* Center glow */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 1000,
          height: 600,
          background: `radial-gradient(ellipse, ${C.pink}20 0%, transparent 60%)`,
          filter: 'blur(50px)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 100,
        }}
      >
        {/* Label */}
        <div
          style={{
            fontFamily: sora,
            fontSize: 30,
            fontWeight: 600,
            color: `${C.white}AA`,
            letterSpacing: '0.22em',
            marginBottom: 40,
            opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          REAL-TIME MULTIPLAYER
        </div>

        {/* Player 1 */}
        <div style={{ transform: `translateX(${p1X}px)`, textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-block',
              padding: '10px 32px',
              background: `${C.lime}15`,
              border: `2px solid ${C.lime}55`,
              borderRadius: 999,
              fontFamily: sora,
              fontSize: 28,
              fontWeight: 600,
              color: C.lime,
            }}
          >
            WordNinja42
          </div>
          <div
            style={{
              fontFamily: bangers,
              fontSize: 110,
              color: C.white,
              textShadow: `0 0 40px ${C.lime}55`,
              marginTop: 4,
              lineHeight: 1,
            }}
          >
            {s1}
          </div>
        </div>

        {/* VS Image — mix-blend-mode: screen makes black transparent */}
        <div
          style={{
            transform: `scale(${vsIn * vsPulse}) rotate(${vsRotate}deg)`,
            margin: '8px 0',
          }}
        >
          <Img
            src={staticFile('images/promo/promo-vs-v2.png')}
            style={{
              width: 980,
              height: 490,
              objectFit: 'contain',
              mixBlendMode: 'screen',
              filter: `drop-shadow(0 0 30px ${C.pink}44)`,
            }}
          />
        </div>

        {/* Player 2 */}
        <div style={{ transform: `translateX(${p2X}px)`, textAlign: 'center', marginTop: 24 }}>
          <div
            style={{
              display: 'inline-block',
              padding: '10px 32px',
              background: `${C.cyan}15`,
              border: `2px solid ${C.cyan}55`,
              borderRadius: 999,
              fontFamily: sora,
              fontSize: 28,
              fontWeight: 600,
              color: C.cyan,
            }}
          >
            LexiQueen99
          </div>
          <div
            style={{
              fontFamily: bangers,
              fontSize: 110,
              color: C.white,
              textShadow: `0 0 40px ${C.cyan}55`,
              marginTop: 4,
              lineHeight: 1,
            }}
          >
            {s2}
          </div>
        </div>

        {/* Mascot — onfire */}
        <div
          style={{
            marginTop: 30,
            transform: `scale(${mScale})`,
            opacity: interpolate(frame, [25, 40], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <AnimatedImage
            src={staticFile('mascot/onfire-nobg.gif')}
            width={240}
            height={240}
            fit="contain"
            loopBehavior="loop"
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================================
// SCENE 4: SOCIAL PROOF
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
  const mScale = spring({ frame: frame - 50, fps, config: { damping: 8, stiffness: 65 } });

  return (
    <AbsoluteFill style={{ backgroundColor: C.navy }}>
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.cyan}12 0%, transparent 55%)`,
          filter: 'blur(50px)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Title */}
        <div style={{ transform: `scale(${titleIn})`, marginBottom: 90 }}>
          <div
            style={{
              fontFamily: bangers,
              fontSize: 88,
              color: C.cyan,
              textShadow: `0 0 35px ${C.cyan}55`,
              letterSpacing: '0.1em',
              textAlign: 'center',
            }}
          >
            Join the Battle
          </div>
        </div>

        {/* Stats — vertical for portrait, big numbers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 55, alignItems: 'center' }}>
          {STATS.map((stat, i) => {
            const delay = 14 + i * 14;
            const s = spring({
              frame: frame - delay,
              fps,
              config: { damping: 6, stiffness: 70 },
            });
            const o = interpolate(frame - delay, [0, 14], [0, 1], {
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={stat.label}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 28,
                  transform: `scale(${s})`,
                  opacity: o,
                }}
              >
                <div
                  style={{
                    fontFamily: bangers,
                    fontSize: 100,
                    color: stat.color,
                    textShadow: `0 0 30px ${stat.color}44`,
                    minWidth: 260,
                    textAlign: 'right',
                    lineHeight: 1,
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontFamily: sora,
                    fontSize: 36,
                    fontWeight: 500,
                    color: `${C.white}CC`,
                  }}
                >
                  {stat.sub}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: sora,
            fontSize: 30,
            fontWeight: 500,
            color: `${C.white}BB`,
            textAlign: 'center',
            marginTop: 70,
            opacity: interpolate(frame, [50, 68], [0, 1], { extrapolateRight: 'clamp' }),
            letterSpacing: '0.05em',
          }}
        >
          Free to play · No ads · Pure skill
        </div>

        {/* Mascot — celebration */}
        <div
          style={{
            marginTop: 50,
            transform: `scale(${mScale})`,
            opacity: interpolate(frame, [50, 62], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <AnimatedImage
            src={staticFile('mascot/celebration-nobg.gif')}
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
// SCENE 5: CTA
// ==============================================

const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 5, stiffness: 40 } });
  const btnIn = spring({ frame: frame - 12, fps, config: { damping: 7, stiffness: 55 } });
  const btnPulse = 1 + Math.sin(frame * 0.35) * 0.025;

  // Shimmer
  const shimmerX = interpolate(frame, [22, 55], [-130, 230], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });

  const urlO = interpolate(frame, [18, 34], [0, 1], { extrapolateRight: 'clamp' });

  // Mascot
  const mY = interpolate(frame, [10, 34], [280, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.exp),
  });

  // Logo glow pulse
  const glowSize = 40 + Math.sin(frame * 0.2) * 15;

  return (
    <AbsoluteFill style={{ backgroundColor: C.navy }}>
      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 900,
          height: 500,
          background: `radial-gradient(ellipse, ${C.lime}15 0%, transparent 55%)`,
          filter: 'blur(60px)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* LEXICLASH */}
        <div style={{ transform: `scale(${logoIn})` }}>
          <div
            style={{
              fontFamily: bangers,
              fontSize: 120,
              color: C.lime,
              letterSpacing: '0.2em',
              textShadow: `0 0 ${glowSize}px ${C.lime}77, 0 0 ${glowSize * 2}px ${C.lime}33`,
              textAlign: 'center',
              lineHeight: 1,
            }}
          >
            LEXICLASH
          </div>
        </div>

        <div style={{ height: 55 }} />

        {/* CTA Button */}
        <div
          style={{
            transform: `scale(${btnIn * btnPulse})`,
            padding: '30px 85px',
            background: `linear-gradient(135deg, ${C.pink}, ${C.purple})`,
            border: `4px solid ${C.black}`,
            borderRadius: 14,
            boxShadow: `6px 6px 0px ${C.black}, 0 0 50px ${C.pink}22`,
            fontFamily: bangers,
            fontSize: 52,
            color: C.white,
            letterSpacing: '0.1em',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${shimmerX}%`,
              width: 80,
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              transform: 'skewX(-20deg)',
              pointerEvents: 'none',
            }}
          />
          PLAY FREE NOW
        </div>

        {/* URL */}
        <div
          style={{
            fontFamily: sora,
            fontSize: 32,
            fontWeight: 600,
            color: C.lime,
            opacity: urlO,
            marginTop: 32,
            letterSpacing: '0.06em',
            textShadow: `0 0 15px ${C.lime}33`,
          }}
        >
          lexiclash.live
        </div>

        {/* Mascot — waving */}
        <div
          style={{
            marginTop: 55,
            transform: `translateY(${mY}px)`,
            opacity: interpolate(frame, [10, 28], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <AnimatedImage
            src={staticFile('mascot/waving-nobg.gif')}
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
// MAIN COMPOSITION
// ==============================================

const T = 12;

export const WordHuntPromoVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.navy }}>
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
