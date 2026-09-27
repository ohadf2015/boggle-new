import { memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';

export interface EarthquakeParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
}

export interface EarthquakeDust {
  id: number;
  x: number;
  size: number;
  delay: number;
}

interface EarthquakeEffectsProps {
  particles: EarthquakeParticle[];
  dust: EarthquakeDust[];
}

/**
 * Renders earthquake particle debris and dust cloud effects.
 * Extracted from GridComponent to reduce file size.
 */
const EarthquakeEffects = memo<EarthquakeEffectsProps>(function EarthquakeEffects({
  particles,
  dust,
}) {
  return (
    <>
      {/* Earthquake Particle Debris */}
      <AnimatePresence>
        {particles.map((particle) => (
          <m.div
            key={particle.id}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              border: '2px solid rgb(var(--neo-black))',
              boxShadow: `0 0 ${particle.size}px ${particle.color}40`,
            }}
            initial={{
              scale: 0,
              opacity: 1,
              x: 0,
              y: 0,
              rotate: 0,
            }}
            animate={{
              scale: [0, 1.5, 1, 0],
              opacity: [0, 1, 0.8, 0],
              x: particle.vx,
              y: particle.vy,
              rotate: particle.rotation + 720,
            }}
            exit={{
              opacity: 0,
              scale: 0,
            }}
            transition={{
              duration: 0.8,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          />
        ))}
      </AnimatePresence>

      {/* Earthquake Dust Clouds */}
      <AnimatePresence>
        {dust.map((d) => (
          <m.div
            key={d.id}
            className="absolute pointer-events-none"
            style={{
              left: `${d.x}%`,
              bottom: '-10%',
              width: d.size,
              height: d.size,
              background: 'radial-gradient(circle, rgba(139, 69, 19, 0.4) 0%, rgba(139, 69, 19, 0.2) 40%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(8px)',
            }}
            initial={{
              scale: 0,
              opacity: 0,
              y: 0,
            }}
            animate={{
              scale: [0, 1.2, 1.5],
              opacity: [0, 0.6, 0],
              y: -200 - d.size,
            }}
            exit={{
              opacity: 0,
              scale: 0.5,
            }}
            transition={{
              duration: 1.2,
              delay: d.delay,
              ease: 'easeOut',
            }}
          />
        ))}
      </AnimatePresence>
    </>
  );
});

export default EarthquakeEffects;
