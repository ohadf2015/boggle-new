import { motion, AnimatePresence } from 'framer-motion';
import { memo } from 'react';

interface ScreenCracksProps {
  visible: boolean;
  intensity?: 'low' | 'medium' | 'high';
}

/**
 * Screen Crack Effect Component
 *
 * Displays realistic glass crack patterns during earthquake effects.
 * Uses SVG paths for crisp rendering at any resolution.
 *
 * Performance optimizations:
 * - Single SVG element (not multiple overlays)
 * - Pure CSS opacity animations
 * - Memoized to prevent re-renders
 * - GPU-accelerated transforms
 */
const ScreenCracks = memo(({ visible, intensity = 'medium' }: ScreenCracksProps) => {
  // Define crack patterns based on intensity
  const getCrackPaths = () => {
    switch (intensity) {
      case 'low':
        return [
          // Single diagonal crack
          'M 20,10 Q 35,25 50,50 Q 65,75 80,90',
          'M 80,20 Q 65,35 50,50 Q 35,65 20,80',
        ];
      case 'high':
        return [
          // Main diagonal cracks
          'M 10,5 Q 25,20 50,50 Q 75,80 95,95',
          'M 90,5 Q 75,20 50,50 Q 25,80 5,95',
          // Secondary cracks
          'M 50,5 L 50,50 Q 55,65 70,80',
          'M 5,50 L 50,50 Q 65,55 80,70',
          // Branching cracks
          'M 30,30 Q 40,45 50,50',
          'M 70,70 Q 60,55 50,50',
          'M 50,50 Q 45,35 35,20',
          'M 50,50 Q 55,65 65,80',
        ];
      case 'medium':
      default:
        return [
          // Main cracks
          'M 15,8 Q 30,25 50,50 Q 70,75 85,92',
          'M 85,8 Q 70,25 50,50 Q 30,75 15,92',
          // Secondary branches
          'M 50,10 L 50,50 Q 52,62 65,75',
          'M 10,50 L 50,50 Q 62,52 75,65',
        ];
    }
  };

  const crackPaths = getCrackPaths();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* SVG overlay with crack patterns */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.3))',
            }}
          >
            <defs>
              {/* Gradient for crack depth effect */}
              <linearGradient id="crackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
                <stop offset="50%" stopColor="rgba(0,0,0,0.6)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
              </linearGradient>

              {/* Glow effect for cracks */}
              <filter id="crackGlow">
                <feGaussianBlur stdDeviation="0.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Render crack paths */}
            <g filter="url(#crackGlow)">
              {crackPaths.map((path, index) => (
                <motion.path
                  key={index}
                  d={path}
                  stroke="url(#crackGradient)"
                  strokeWidth="0.4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    pathLength: {
                      duration: 0.3,
                      delay: index * 0.05,
                      ease: [0.43, 0.13, 0.23, 0.96], // Crack spreading easing
                    },
                    opacity: {
                      duration: 0.2,
                      delay: index * 0.05,
                    },
                  }}
                />
              ))}

              {/* White highlight on one side of cracks for 3D effect */}
              {crackPaths.map((path, index) => (
                <motion.path
                  key={`highlight-${index}`}
                  d={path}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="0.2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    pathLength: {
                      duration: 0.3,
                      delay: index * 0.05,
                      ease: [0.43, 0.13, 0.23, 0.96],
                    },
                    opacity: {
                      duration: 0.2,
                      delay: index * 0.05,
                    },
                  }}
                  style={{
                    transform: 'translate(0.5px, 0.5px)',
                  }}
                />
              ))}
            </g>
          </svg>

          {/* Subtle glass shatter particle effect at crack intersections */}
          {intensity === 'high' && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  className="absolute rounded-full bg-white/40"
                  style={{
                    left: `${50 + (Math.random() - 0.5) * 30}%`,
                    top: `${50 + (Math.random() - 0.5) * 30}%`,
                    width: 3 + Math.random() * 4,
                    height: 3 + Math.random() * 4,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.5, 0],
                    opacity: [0, 0.8, 0],
                    x: (Math.random() - 0.5) * 40,
                    y: (Math.random() - 0.5) * 40,
                  }}
                  transition={{
                    duration: 0.6,
                    delay: 0.2 + i * 0.05,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ScreenCracks.displayName = 'ScreenCracks';

export default ScreenCracks;
