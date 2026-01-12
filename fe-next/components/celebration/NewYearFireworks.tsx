'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { memo, useState, useEffect } from 'react';

interface NewYearFireworksProps {
  /** Whether to show fireworks */
  active: boolean;
  /** Number of firework bursts (default: 8) */
  count?: number;
  /** Duration of the show in milliseconds (default: 5000) */
  duration?: number;
}

interface FireworkData {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
  size: number;
}

/**
 * Neo-Brutalist Fireworks Component
 *
 * Creates bold, colorful firework bursts using your brand colors.
 * Uses hard shadows and thick strokes instead of soft glows.
 * Optimized for performance with GPU acceleration.
 */
const NewYearFireworks = memo(({ active, count = 8, duration = 5000 }: NewYearFireworksProps) => {
  // Generate random firework positions and colors in useEffect to avoid impure render
  const [fireworks, setFireworks] = useState<FireworkData[]>([]);

  useEffect(() => {
    if (active) {
      setFireworks(
        Array.from({ length: count }, (_, i) => ({
          id: i,
          x: 20 + Math.random() * 60, // 20-80% of screen width
          y: 20 + Math.random() * 40, // 20-60% of screen height
          color: ['neo-lime', 'neo-pink', 'neo-cyan', 'neo-purple'][i % 4],
          delay: (i * duration) / (count * 2), // Stagger launches
          size: 80 + Math.random() * 60, // 80-140px diameter
        }))
      );
    }
  }, [active, count, duration]);

  return (
    <AnimatePresence>
      {active && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {fireworks.map((firework) => (
            <Firework
              key={firework.id}
              x={firework.x}
              y={firework.y}
              color={firework.color}
              delay={firework.delay}
              size={firework.size}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
});

NewYearFireworks.displayName = 'NewYearFireworks';

interface FireworkProps {
  x: number; // Position in percentage (0-100)
  y: number; // Position in percentage (0-100)
  color: string; // Tailwind color name (e.g., 'neo-yellow')
  delay: number; // Delay before launch in ms
  size: number; // Diameter of burst in px
}

/**
 * Individual Firework Burst
 * Neo-brutalist style with hard edges and bold colors
 */
const Firework = memo(({ x, y, color, delay, size }: FireworkProps) => {
  // Number of particles in the burst
  const particleCount = 16;

  // Generate particle angles (evenly distributed in circle)
  // Use deterministic rotation based on index instead of Math.random()
  const particles = Array.from({ length: particleCount }, (_, i) => {
    const angle = (i / particleCount) * Math.PI * 2;
    const distance = size / 2;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotation: (i * 22.5) % 360, // Deterministic rotation based on index
    };
  });

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: delay / 1000 }}
    >
      {/* Center flash */}
      <motion.div
        className={`absolute w-4 h-4 rounded-full bg-${color} border-3 border-neo-black shadow-hard-sm`}
        style={{
          left: -8,
          top: -8,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 3, 0],
          opacity: [0, 1, 0],
        }}
        transition={{
          delay: delay / 1000,
          duration: 0.6,
          ease: 'easeOut',
        }}
      />

      {/* Particles bursting outward */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute bg-${color} border-3 border-neo-black shadow-hard`}
          style={{
            width: 12,
            height: 12,
            left: -6,
            top: -6,
            borderRadius: '2px',
          }}
          initial={{
            x: 0,
            y: 0,
            scale: 0,
            rotate: particle.rotation,
            opacity: 0,
          }}
          animate={{
            x: particle.x,
            y: particle.y,
            scale: [0, 1.5, 0.8, 0],
            opacity: [0, 1, 1, 0],
            rotate: particle.rotation + 180,
          }}
          transition={{
            delay: delay / 1000 + 0.1,
            duration: 1.2,
            ease: [0.34, 1.56, 0.64, 1], // Bounce easing
          }}
        />
      ))}

      {/* Trailing sparks */}
      {particles.slice(0, 8).map((particle) => (
        <motion.div
          key={`trail-${particle.id}`}
          className={`absolute bg-${color} border-2 border-neo-black`}
          style={{
            width: 6,
            height: 6,
            left: -3,
            top: -3,
            borderRadius: '1px',
          }}
          initial={{
            x: 0,
            y: 0,
            scale: 0,
            opacity: 0,
          }}
          animate={{
            x: particle.x * 1.3,
            y: particle.y * 1.3,
            scale: [0, 1, 0],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            delay: delay / 1000 + 0.3,
            duration: 0.8,
            ease: 'easeOut',
          }}
        />
      ))}
    </motion.div>
  );
});

Firework.displayName = 'Firework';

export default NewYearFireworks;
