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
 * Shows dramatic 3-2-1 countdown with particles and screen flash for "GO!"
 */
const GoRipplesAnimation: React.FC<GoRipplesAnimationProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [count, setCount] = useState(3);
  const [showFlash, setShowFlash] = useState(false);
  const { playCountdownBeep } = useSoundEffects();

  // Memoize particles to prevent re-generation on each render
  const particles = useMemo(() => generateParticles(16), []);
  const goParticles = useMemo(() => generateParticles(24), []);

  // Play beep for each countdown number
  useEffect(() => {
    if (count > 0) {
      playCountdownBeep(count);
    }
  }, [count, playCountdownBeep]);

  // Countdown logic
  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 700);
      return () => clearTimeout(timer);
    } else if (count === 0) {
      // Flash effect for GO!
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 150);

      // Show "GO!" briefly then complete
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [count, onComplete]);

  if (!isVisible) return null;

  const isGo = count === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Screen flash effect for GO! */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-white z-40"
          />
        )}
      </AnimatePresence>

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
          initial={{ scale: 0, opacity: 0, rotate: -10 }}
          animate={{
            scale: isGo ? [0, 1.3, 1.1] : [0, 1.15, 1],
            opacity: 1,
            rotate: isGo ? [10, -5, 0] : [5, -2, 0]
          }}
          exit={{ scale: 1.5, opacity: 0, rotate: 5 }}
          transition={{
            duration: isGo ? 0.4 : 0.25,
            times: [0, 0.6, 1],
            ease: "easeOut"
          }}
          className={`relative px-8 py-4 border-4 border-neo-black rounded-neo ${
            isGo
              ? 'bg-gradient-to-r from-neo-yellow via-neo-orange to-neo-yellow bg-[length:200%_100%] animate-pulse'
              : 'bg-neo-yellow'
          }`}
          style={{
            boxShadow: isGo
              ? '8px 8px 0px var(--neo-black), 0 0 40px rgba(251, 213, 53, 0.6), 0 0 80px rgba(255, 107, 53, 0.4)'
              : '6px 6px 0px var(--neo-black)'
          }}
        >
          {/* Inner glow for GO */}
          {isGo && (
            <motion.div
              className="absolute inset-0 rounded-neo"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.3, repeat: 2 }}
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
              }}
            />
          )}

          <motion.span
            animate={isGo ? {
              scale: [1, 1.05, 1],
              textShadow: [
                '3px 3px 0px var(--neo-cyan)',
                '4px 4px 0px var(--neo-cyan), 0 0 20px rgba(0, 255, 255, 0.8)',
                '3px 3px 0px var(--neo-cyan)'
              ]
            } : {}}
            transition={{ duration: 0.2, repeat: isGo ? 2 : 0 }}
            className={`relative z-10 font-black text-neo-black ${
              isGo ? 'text-6xl sm:text-8xl' : 'text-5xl sm:text-7xl'
            }`}
            style={{ textShadow: '3px 3px 0px var(--neo-cyan)' }}
          >
            {count > 0 ? count : 'GO!'}
          </motion.span>

          {/* Shake effect for numbers */}
          {count > 0 && (
            <motion.div
              className="absolute inset-0"
              animate={{ x: [0, -2, 2, -2, 0], y: [0, 1, -1, 1, 0] }}
              transition={{ duration: 0.1, delay: 0.15 }}
            />
          )}
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
    </div>
  );
};

export default GoRipplesAnimation;
