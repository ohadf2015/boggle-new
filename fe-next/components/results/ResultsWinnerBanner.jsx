import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaCrown, FaTrophy } from 'react-icons/fa';
import { useLanguage } from '../../contexts/LanguageContext';
import gsap from 'gsap';

const celebrationImages = [
  '/winner-celebration/trophy-confetti.png',
  '/winner-celebration/crown-sparkles.png',
  '/winner-celebration/medal-stars.png',
  '/winner-celebration/fireworks-burst.png',
  '/winner-celebration/champion-ribbon.png',
  '/winner-celebration/laurel-wreath.png',
  '/winner-celebration/celebration-balloons.png',
  '/winner-celebration/winner-podium.png',
  '/winner-celebration/star-burst.png',
  '/winner-celebration/thumbs-up.png',
];

const ResultsWinnerBanner = ({ winner, isCurrentUserWinner }) => {
  const { t } = useLanguage();
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef(null);
  const glassShineRef = useRef(null);
  const sparkleRefs = useRef([]);
  const particlesRef = useRef(null);

  // Randomly select a celebration image (once per winner)
  const randomImage = useMemo(() => {
    return celebrationImages[Math.floor(Math.random() * celebrationImages.length)];
  }, [winner?.username]);

  // GSAP animations for GPU-accelerated performance
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Glass shine animation - GPU accelerated with transform
      if (glassShineRef.current) {
        gsap.to(glassShineRef.current, {
          x: '100%',
          duration: 2.5,
          ease: 'power2.inOut',
          repeat: -1,
          repeatDelay: 1,
        });
      }

      // Sparkle animations with stagger
      sparkleRefs.current.forEach((sparkle, i) => {
        if (sparkle) {
          gsap.to(sparkle, {
            opacity: 0.9,
            scale: 1.3,
            duration: 1.2,
            ease: 'power2.inOut',
            repeat: -1,
            yoyo: true,
            delay: i * 0.5,
          });
        }
      });

      // Particles animation - reduced count for performance
      if (particlesRef.current) {
        const particles = particlesRef.current.children;
        gsap.fromTo(
          particles,
          { y: 0, opacity: 0.8, scale: 1 },
          {
            y: -400,
            opacity: 0,
            scale: 0.3,
            duration: 4,
            ease: 'power1.out',
            stagger: 0.6,
            repeat: -1,
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [winner]);

  if (!winner) return null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ scale: 0, rotateY: 180, y: -100 }}
      animate={{ scale: 1, rotateY: 0, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
        delay: 0.3
      }}
      className="mb-4 sm:mb-6 md:mb-8 relative w-full"
      style={{ willChange: 'transform' }}
    >
      {/* Outer Glow Effects - minimal blur for better visibility */}
      <div
        className="absolute inset-0 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,140,0,0.25) 50%, rgba(255,215,0,0.2) 100%)',
          filter: 'blur(8px)',
          willChange: 'opacity',
        }}
      />

      {/* Main Container with Hero Background Image - 3D Glass Frame */}
      <div
        className="relative rounded-3xl overflow-hidden min-h-[400px] md:min-h-[500px]"
        style={{
          boxShadow: `
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            inset 0 -1px 0 rgba(0, 0, 0, 0.1)
          `,
          transform: 'perspective(1000px) rotateX(2deg)',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        {/* Enhanced 3D Glass Frame Border with stronger visibility */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none z-20"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 30%, transparent 50%, rgba(0,0,0,0.15) 100%)',
            boxShadow: `
              inset 3px 3px 6px rgba(255, 255, 255, 0.4),
              inset -3px -3px 6px rgba(0, 0, 0, 0.25),
              inset 0 0 30px rgba(255, 255, 255, 0.15)
            `,
          }}
        />

        {/* Hero Background Image */}
        <div className="absolute inset-0">
          {!imageError ? (
            <motion.img
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              src={randomImage}
              alt="celebration"
              onError={() => setImageError(true)}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                filter: 'brightness(1.15) saturate(1.4) contrast(1.1)',
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-purple-600" />
          )}

          {/* GPU-Accelerated Glass Shine - using transform instead of background-position */}
          <div
            ref={glassShineRef}
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: 'linear-gradient(105deg, transparent 0%, transparent 35%, rgba(255,255,255,0.6) 45%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.6) 55%, transparent 65%, transparent 100%)',
              transform: 'translateX(-100%)',
              willChange: 'transform',
            }}
          />

          {/* Enhanced Sparkle Effects - Positioned for glass corners */}
          <div
            ref={(el) => (sparkleRefs.current[0] = el)}
            className="absolute top-[15%] left-[20%] w-16 h-16 pointer-events-none z-10"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 30%, transparent 70%)',
              opacity: 0.4,
              willChange: 'transform, opacity',
            }}
          />
          <div
            ref={(el) => (sparkleRefs.current[1] = el)}
            className="absolute bottom-[20%] right-[15%] w-20 h-20 pointer-events-none z-10"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.25) 35%, transparent 70%)',
              opacity: 0.3,
              willChange: 'transform, opacity',
            }}
          />
          <div
            ref={(el) => (sparkleRefs.current[2] = el)}
            className="absolute top-[40%] right-[25%] w-12 h-12 pointer-events-none z-10"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 60%)',
              opacity: 0.5,
              willChange: 'transform, opacity',
            }}
          />

          {/* Strong Glass Glare Overlay */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none z-10"
            style={{
              background: `
                linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.15) 25%, transparent 50%),
                linear-gradient(225deg, rgba(255,255,255,0.2) 0%, transparent 30%)
              `,
            }}
          />

          {/* 3D depth shadow at edges */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              boxShadow: `
                inset 5px 5px 10px rgba(255, 255, 255, 0.25),
                inset -5px -5px 10px rgba(0, 0, 0, 0.2),
                inset 0 0 50px rgba(0, 0, 0, 0.1)
              `,
            }}
          />
        </div>

        {/* Optimized Floating Particles - reduced from 12 to 6 for performance */}
        <div ref={particlesRef} className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${6 + (i % 3) * 4}px`,
                height: `${6 + (i % 3) * 4}px`,
                left: `${(i * 16) + 8}%`,
                bottom: 0,
                background: 'rgba(255, 255, 255, 0.8)',
                boxShadow: '0 0 6px rgba(255, 255, 255, 0.6)',
                willChange: 'transform, opacity',
              }}
            />
          ))}
        </div>

        {/* Central Glassmorphic Winner Card - Enhanced */}
        <div className="relative z-10 flex items-center justify-center min-h-[400px] md:min-h-[500px] p-6 sm:p-8 md:p-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 150,
              damping: 20,
              delay: 0.5
            }}
            className="relative max-w-3xl w-full"
          >
            {/* Enhanced Glassmorphic Card with visible backdrop blur */}
            <div className="relative rounded-2xl overflow-hidden">
              {/* Strong Glass Effect - increased opacity and blur */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(16px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  boxShadow: `
                    0 8px 32px rgba(0, 0, 0, 0.35),
                    inset 0 2px 0 rgba(255, 255, 255, 0.5),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                  `,
                }}
              />

              {/* Prominent Glass Glare Effect */}
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{
                  background: `
                    linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.2) 30%, transparent 60%),
                    linear-gradient(315deg, rgba(255,255,255,0.15) 0%, transparent 40%)
                  `,
                }}
              />

              {/* Animated Border Glow */}
              <motion.div
                animate={{
                  opacity: [0.5, 0.85, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.5), rgba(255,140,0,0.5), rgba(255,215,0,0.5))',
                  filter: 'blur(10px)',
                  zIndex: -1,
                  willChange: 'opacity',
                }}
              />

              {/* Card Content */}
              <div className="relative p-6 sm:p-8 md:p-12 text-center">
                {/* Animated Crown */}
                <motion.div
                  initial={{ y: -30, opacity: 0, rotate: -20 }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    rotate: 0
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 12,
                    delay: 0.7
                  }}
                >
                  <motion.div
                    animate={{
                      rotate: [0, -8, 8, -8, 8, 0],
                      y: [0, -12, 0],
                      scale: [1, 1.15, 1]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 2,
                      ease: 'easeInOut'
                    }}
                    className="inline-block mb-4 sm:mb-6"
                    style={{ willChange: 'transform' }}
                  >
                    <FaCrown className="text-6xl sm:text-7xl md:text-8xl text-yellow-300 drop-shadow-[0_0_30px_rgba(255,215,0,0.8)]"
                             style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }} />
                  </motion.div>
                </motion.div>

                {/* You Won! Message for current user */}
                {isCurrentUserWinner && (
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
                    className="mb-2"
                  >
                    <motion.p
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-3xl sm:text-4xl md:text-5xl font-black text-yellow-300"
                      style={{
                        textShadow: '0 0 30px rgba(255,215,0,1), 0 0 60px rgba(255,215,0,0.8), 0 4px 12px rgba(0,0,0,0.5)',
                        willChange: 'transform',
                      }}
                    >
                      {t('results.youWon')}
                    </motion.p>
                  </motion.div>
                )}

                {/* Winner Announcement Text */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4"
                  style={{
                    textShadow: '0 0 20px rgba(255,255,255,0.6), 0 0 40px rgba(255,215,0,0.5), 0 4px 12px rgba(0,0,0,0.5)',
                    letterSpacing: '0.05em'
                  }}
                >
                  {t('results.winnerAnnouncement')}
                </motion.h2>

                {/* Winner Name - Giant Gradient Text */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 180,
                    damping: 15,
                    delay: 1.1
                  }}
                  className="mb-4 sm:mb-6"
                >
                  <motion.h1
                    animate={{
                      scale: [1, 1.03, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black relative"
                    style={{ lineHeight: 1.2, willChange: 'transform' }}
                  >
                    {/* Glow Layer */}
                    <span className="absolute inset-0 blur-xl opacity-80"
                          style={{
                            background: 'linear-gradient(135deg, #FFD700, #FFA500, #FFD700)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}>
                      {winner.username}!
                    </span>
                    {/* Main Text */}
                    <span className="relative"
                          style={{
                            background: 'linear-gradient(135deg, #FFFFFF 0%, #FFE066 20%, #FFD700 40%, #FFA500 60%, #FFD700 80%, #FFFFFF 100%)',
                            backgroundSize: '200% 200%',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: '0 0 40px rgba(255,215,0,0.8), 0 0 80px rgba(255,165,0,0.6), 0 8px 16px rgba(0,0,0,0.4)',
                            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
                            animation: 'gradient-x 4s ease infinite'
                          }}>
                      {winner.username}!
                    </span>
                  </motion.h1>
                </motion.div>

                {/* Score Display */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                  className="flex items-center justify-center gap-3 sm:gap-4"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.15, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    style={{ willChange: 'transform' }}
                  >
                    <FaTrophy className="text-3xl sm:text-4xl md:text-5xl text-yellow-300 drop-shadow-lg" />
                  </motion.div>
                  <motion.p
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    className="text-3xl sm:text-4xl md:text-5xl font-black text-white"
                    style={{
                      textShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,215,0,0.6), 0 4px 12px rgba(0,0,0,0.5)',
                      willChange: 'transform',
                    }}
                  >
                    {winner.score} {t('results.points')}
                  </motion.p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default ResultsWinnerBanner;
