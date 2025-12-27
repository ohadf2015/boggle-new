import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoundEffects } from '../contexts/SoundEffectsContext';

interface GoRipplesAnimationProps {
  onComplete?: () => void;
}

// Generate random particles for explosion effect
const generateParticles = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (i / count) * 360,
    distance: 80 + Math.random() * 120,
    size: 8 + Math.random() * 16,
    delay: Math.random() * 0.1,
    duration: 0.5 + Math.random() * 0.3,
  }));
};

/**
 * Exciting pre-game countdown with sound and visual effects
 * Shows dramatic 3-2-1 countdown with particles and smooth fade-out for "GO!"
 */
const GoRipplesAnimation: React.FC<GoRipplesAnimationProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [count, setCount] = useState(3);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const { playCountdownBeep } = useSoundEffects();

  // Memoize particles to prevent re-generation on each render - reduced count for cleaner animation
  const particles = useMemo(() => generateParticles(10), []);
  const goParticles = useMemo(() => generateParticles(16), []);

  // Play beep for each countdown number
  useEffect(() => {
    if (count > 0) {
      playCountdownBeep(count);
    }
  }, [count, playCountdownBeep]);

  // Countdown logic
  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    } else if (count === 0) {
      // Show "GO!" briefly then fade out smoothly
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 600);

      const completeTimer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 900);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(completeTimer);
      };
    }
    return undefined;
  }, [count, onComplete]);

  if (!isVisible) return null;

  const isGo = count === 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: isFadingOut ? 0 : 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Background pulse rings */}
      <AnimatePresence>
        {isGo && (
          <>
            {[0, 1, 2].map((ring) => (
              <motion.div
                key={`ring-${ring}`}
                initial={{ scale: 0.3, opacity: 0.8 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.8, delay: ring * 0.1, ease: "easeOut" }}
                className="absolute rounded-full border-4 border-neo-yellow"
                style={{ width: 150, height: 150 }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Particle explosion for numbers */}
      <AnimatePresence>
        {count > 0 && (
          <>
            {particles.map((particle) => (
              <motion.div
                key={`particle-${count}-${particle.id}`}
                initial={{
                  scale: 0,
                  opacity: 1,
                  x: 0,
                  y: 0
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [1, 0.8, 0],
                  x: Math.cos(particle.angle * Math.PI / 180) * particle.distance,
                  y: Math.sin(particle.angle * Math.PI / 180) * particle.distance
                }}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  ease: "easeOut"
                }}
                className="absolute rounded-full"
                style={{
                  width: particle.size,
                  height: particle.size,
                  background: 'linear-gradient(135deg, var(--neo-yellow), var(--neo-orange))',
                  boxShadow: '0 0 10px rgba(251, 213, 53, 0.6)'
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* GO! particle explosion - more intense */}
      <AnimatePresence>
        {isGo && (
          <>
            {goParticles.map((particle) => (
              <motion.div
                key={`go-particle-${particle.id}`}
                initial={{
                  scale: 0,
                  opacity: 1,
                  x: 0,
                  y: 0
                }}
                animate={{
                  scale: [0, 1.5, 0],
                  opacity: [1, 0.9, 0],
                  x: Math.cos(particle.angle * Math.PI / 180) * (particle.distance * 1.5),
                  y: Math.sin(particle.angle * Math.PI / 180) * (particle.distance * 1.5)
                }}
                transition={{
                  duration: particle.duration + 0.2,
                  delay: particle.delay,
                  ease: "easeOut"
                }}
                className="absolute rounded-full"
                style={{
                  width: particle.size * 1.2,
                  height: particle.size * 1.2,
                  background: particle.id % 3 === 0
                    ? 'linear-gradient(135deg, #FF3366, #FF6B35)'
                    : particle.id % 3 === 1
                    ? 'linear-gradient(135deg, #FFE135, #FF6B35)'
                    : 'linear-gradient(135deg, #00FFFF, #BFFF00)',
                  boxShadow: '0 0 15px rgba(255, 107, 53, 0.8)'
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Main countdown/GO text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0, opacity: 0, y: 20 }}
          animate={{
            scale: isGo ? [0, 1.15, 1.05] : [0, 1.2, 0.95, 1],
            opacity: 1,
            y: 0,
            rotate: isGo ? [5, -2, 0] : [0, 0, 0]
          }}
          exit={{ scale: 0.8, opacity: 0, y: -30 }}
          transition={{
            duration: isGo ? 0.4 : 0.35,
            times: isGo ? [0, 0.5, 1] : [0, 0.4, 0.7, 1],
            ease: [0.34, 1.56, 0.64, 1] // Custom spring-like easing for bounce
          }}
          className={`relative px-8 py-4 border-4 border-neo-black rounded-neo ${
            isGo
              ? 'bg-gradient-to-r from-neo-yellow via-neo-orange to-neo-yellow bg-[length:200%_100%]'
              : 'bg-neo-yellow'
          }`}
          style={{
            boxShadow: isGo
              ? '8px 8px 0px var(--neo-black), 0 0 40px rgba(251, 213, 53, 0.6), 0 0 80px rgba(255, 107, 53, 0.3)'
              : '6px 6px 0px var(--neo-black), 0 0 20px rgba(251, 213, 53, 0.3)'
          }}
        >
          {/* Subtle glow pulse for GO */}
          {isGo && (
            <motion.div
              className="absolute inset-0 rounded-neo"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0.3] }}
              transition={{ duration: 0.5, times: [0, 0.3, 1] }}
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
              }}
            />
          )}

          <motion.span
            animate={isGo ? {
              scale: [1, 1.05, 1],
            } : {
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: isGo ? 0.4 : 0.2,
              delay: 0.1,
              ease: "easeOut"
            }}
            className={`relative z-10 font-black text-neo-black ${
              isGo ? 'text-6xl sm:text-8xl' : 'text-5xl sm:text-7xl'
            }`}
            style={{ textShadow: '3px 3px 0px var(--neo-cyan)' }}
          >
            {count > 0 ? count : 'GO!'}
          </motion.span>
        </motion.div>
      </AnimatePresence>

      {/* Star burst effect for GO */}
      <AnimatePresence>
        {isGo && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`star-${i}`}
                initial={{ scale: 0, opacity: 1, rotate: i * 45 }}
                animate={{
                  scale: [0, 1.5],
                  opacity: [1, 0],
                  rotate: i * 45 + 15
                }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="absolute"
                style={{
                  width: 4,
                  height: 60,
                  background: 'linear-gradient(to top, transparent, var(--neo-yellow), transparent)',
                  transformOrigin: 'center 100px'
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GoRipplesAnimation;
