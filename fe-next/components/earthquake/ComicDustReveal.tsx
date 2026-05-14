import { m, AnimatePresence } from 'framer-motion';
import { memo, useState, useEffect } from 'react';

interface ComicDustRevealProps {
  visible: boolean;
  phase: 'cover' | 'reveal' | 'idle';
  intensity?: 'low' | 'medium' | 'high';
}

interface DustCloud {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  rotation: number;
}

interface StarBurst {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

interface ActionLine {
  id: number;
  angle: number;
  length: number;
  delay: number;
}

interface DustParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  vx: number;
  vy: number;
}

/**
 * Comic Book Dust Reveal Effect
 *
 * Replaces the screen crack effect with a comic book-style dust reveal:
 * 1. Dust clouds sweep across and cover the board
 * 2. Dramatic "POOF!" reveal with action lines and star bursts
 * 3. Letters emerge through the clearing dust
 *
 * Performance optimizations:
 * - SVG-based for crisp rendering
 * - GPU-accelerated transforms
 * - Generated particle positions in useEffect to avoid impure renders
 */
const ComicDustReveal = memo(({ visible, phase, intensity = 'medium' }: ComicDustRevealProps) => {
  const [dustClouds, setDustClouds] = useState<DustCloud[]>([]);
  const [starBursts, setStarBursts] = useState<StarBurst[]>([]);
  const [actionLines, setActionLines] = useState<ActionLine[]>([]);
  const [dustParticles, setDustParticles] = useState<DustParticle[]>([]);

  // Generate all random positions in useEffect to avoid impure render
  useEffect(() => {
    // Dust clouds
    const cloudCount = intensity === 'high' ? 12 : intensity === 'medium' ? 8 : 5;
    setDustClouds(Array.from({ length: cloudCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 60 + Math.random() * 80,
      delay: i * 0.04,
      rotation: Math.random() * 360,
    })));

    // Star bursts
    const burstCount = intensity === 'high' ? 8 : intensity === 'medium' ? 5 : 3;
    setStarBursts(Array.from({ length: burstCount }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      size: 20 + Math.random() * 30,
      delay: i * 0.06,
    })));

    // Action lines
    setActionLines(Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i * 30) + Math.random() * 10,
      length: 80 + Math.random() * 40,
      delay: i * 0.02,
    })));

    // Dust particles
    const particleCount = intensity === 'high' ? 30 : intensity === 'medium' ? 20 : 12;
    setDustParticles(Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 3 + Math.random() * 6,
      delay: Math.random() * 0.3,
      vx: (Math.random() - 0.5) * 200,
      vy: (Math.random() - 0.5) * 200,
    })));
  }, [intensity]);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          className="absolute inset-0 pointer-events-none z-50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Phase 1: Dust clouds sweeping across to cover */}
          <AnimatePresence>
            {phase === 'cover' && (
              <>
                {/* Main dust cloud overlay */}
                {dustClouds.map((cloud) => (
                  <m.div
                    key={`cloud-${cloud.id}`}
                    className="absolute rounded-full"
                    style={{
                      left: `${cloud.x}%`,
                      top: `${cloud.y}%`,
                      width: cloud.size,
                      height: cloud.size,
                      background: `radial-gradient(circle,
                        rgba(139, 90, 43, 0.9) 0%,
                        rgba(160, 120, 60, 0.7) 30%,
                        rgba(180, 140, 80, 0.4) 60%,
                        transparent 80%)`,
                      filter: 'blur(8px)',
                      transform: `translate(-50%, -50%) rotate(${cloud.rotation}deg)`,
                    }}
                    initial={{
                      scale: 0,
                      opacity: 0,
                      x: -200,
                    }}
                    animate={{
                      scale: [0, 1.5, 2],
                      opacity: [0, 0.9, 0.95],
                      x: 0,
                    }}
                    exit={{
                      scale: 3,
                      opacity: 0,
                      x: 200,
                    }}
                    transition={{
                      duration: 0.5,
                      delay: cloud.delay,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  />
                ))}

                {/* Secondary dust layer for depth */}
                <m.div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(ellipse at center,
                      rgba(160, 120, 60, 0.95) 0%,
                      rgba(139, 90, 43, 0.9) 40%,
                      rgba(120, 80, 40, 0.85) 70%,
                      rgba(100, 70, 35, 0.8) 100%)`,
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                />

                {/* Swirling dust particles during cover */}
                {dustParticles.map((particle) => (
                  <m.div
                    key={`cover-particle-${particle.id}`}
                    className="absolute rounded-full bg-amber-200/80"
                    style={{
                      left: `${particle.x}%`,
                      top: `${particle.y}%`,
                      width: particle.size,
                      height: particle.size,
                    }}
                    initial={{
                      scale: 0,
                      opacity: 0,
                    }}
                    animate={{
                      scale: [0, 1.5, 1],
                      opacity: [0, 0.8, 0.6],
                      rotate: 360,
                    }}
                    transition={{
                      duration: 0.6,
                      delay: particle.delay,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Phase 2: Comic book reveal with action lines and star bursts */}
          <AnimatePresence>
            {phase === 'reveal' && (
              <>
                {/* Central "POOF!" burst */}
                <m.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.5, 1.2], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <svg
                    width="200"
                    height="200"
                    viewBox="0 0 200 200"
                    className="overflow-visible"
                  >
                    {/* Comic star burst */}
                    <defs>
                      <filter id="comicGlow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <radialGradient id="burstGradient">
                        <stop offset="0%" stopColor="#FFE135" />
                        <stop offset="50%" stopColor="#FF6B35" />
                        <stop offset="100%" stopColor="#FF3366" />
                      </radialGradient>
                    </defs>

                    {/* Star burst shape */}
                    <m.path
                      d="M100,10 L115,85 L190,100 L115,115 L100,190 L85,115 L10,100 L85,85 Z"
                      fill="url(#burstGradient)"
                      filter="url(#comicGlow)"
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: [0, 1.2, 1], rotate: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />

                    {/* Inner highlight */}
                    <m.circle
                      cx="100"
                      cy="100"
                      r="30"
                      fill="white"
                      opacity="0.9"
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.5, 0] }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    />
                  </svg>
                </m.div>

                {/* Action lines radiating from center */}
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {actionLines.map((line) => {
                    const angleRad = (line.angle * Math.PI) / 180;
                    const startX = 50 + Math.cos(angleRad) * 10;
                    const startY = 50 + Math.sin(angleRad) * 10;
                    const endX = 50 + Math.cos(angleRad) * line.length;
                    const endY = 50 + Math.sin(angleRad) * line.length;

                    return (
                      <m.line
                        key={`action-line-${line.id}`}
                        x1={startX}
                        y1={startY}
                        x2={endX}
                        y2={endY}
                        stroke="rgb(var(--neo-black))"
                        strokeWidth="0.8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 1, 0.5, 0] }}
                        transition={{
                          duration: 0.4,
                          delay: line.delay,
                          ease: 'easeOut',
                        }}
                      />
                    );
                  })}
                </svg>

                {/* Small star bursts scattered around */}
                {starBursts.map((star) => (
                  <m.div
                    key={`star-${star.id}`}
                    className="absolute"
                    style={{
                      left: `${star.x}%`,
                      top: `${star.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    initial={{ scale: 0, rotate: -30, opacity: 0 }}
                    animate={{ scale: [0, 1.3, 0], rotate: 0, opacity: [0, 1, 0] }}
                    transition={{ duration: 0.35, delay: star.delay, ease: 'easeOut' }}
                  >
                    <svg width={star.size} height={star.size} viewBox="0 0 24 24">
                      <path
                        d="M12,1 L14,9 L22,12 L14,15 L12,23 L10,15 L2,12 L10,9 Z"
                        fill="#FFE135"
                        stroke="rgb(var(--neo-black))"
                        strokeWidth="1"
                      />
                    </svg>
                  </m.div>
                ))}

                {/* Dust particles flying outward during reveal */}
                {dustParticles.map((particle) => (
                  <m.div
                    key={`reveal-particle-${particle.id}`}
                    className="absolute rounded-full"
                    style={{
                      left: '50%',
                      top: '50%',
                      width: particle.size,
                      height: particle.size,
                      background: `radial-gradient(circle,
                        rgba(180, 140, 80, 0.9) 0%,
                        rgba(139, 90, 43, 0.6) 50%,
                        transparent 100%)`,
                    }}
                    initial={{
                      scale: 0,
                      opacity: 1,
                      x: 0,
                      y: 0,
                    }}
                    animate={{
                      scale: [0, 1, 0.5],
                      opacity: [1, 0.8, 0],
                      x: particle.vx,
                      y: particle.vy,
                    }}
                    transition={{
                      duration: 0.6,
                      delay: particle.delay,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  />
                ))}

                {/* Circular reveal wipe */}
                <m.div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at center,
                      transparent 0%,
                      transparent 30%,
                      rgba(139, 90, 43, 0.3) 40%,
                      transparent 60%)`,
                  }}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: [0, 3], opacity: [1, 0] }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </>
            )}
          </AnimatePresence>
        </m.div>
      )}
    </AnimatePresence>
  );
});

ComicDustReveal.displayName = 'ComicDustReveal';

export default ComicDustReveal;
