import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface ShakeOffset {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  delay: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  size: number;
  color: string;
}

interface DustCloud {
  id: number;
  x: number;
  size: number;
  delay: number;
}

type EarthquakePhase = 'idle' | 'rumble' | 'quake' | 'settle';
type DustPhase = 'idle' | 'cover' | 'reveal';

interface UseEarthquakeAnimationProps {
  earthquakeShaking: boolean;
  grid: string[][];
  effectiveRenderMode: 'full' | 'reduced' | 'minimal';
  shouldDisableEarthquakeEffects: boolean;
  prefersReducedMotion: boolean;
  playEarthquakeRumble: () => void;
  playEarthquakeShake: () => void;
}

const PARTICLE_COLORS = ['#FFE135', '#FF6B35', '#FF3366', '#00FFFF', '#BFFF00'];

// Stable zero-offset reference. Returning a fresh `{x:0,y:0,...}` literal from
// getShakeOffset each render would defeat GridCell.memo (new ref per cell every
// render). Sharing one frozen object keeps prop identity stable across renders.
const ZERO_SHAKE_OFFSET: ShakeOffset = Object.freeze({ x: 0, y: 0, rotate: 0, scale: 1, delay: 0 });

/**
 * OPTIMIZED Earthquake Animation Hook
 *
 * Performance improvements:
 * - Reduced particle count: 30 → 12 (-60% render load)
 * - Reduced dust clouds: 8 → 4 (-50% blur operations)
 * - Optimized displacement: 600-1000px → 300-500px (-50% transform calculations)
 * - Removed 3D transforms (rotateX, rotateY) - GPU optimization
 * - Removed motion blur filter - Major performance gain
 * - Optimized spring physics: Lower mass, higher stiffness
 * - Memoized calculations with useMemo
 * - Batched state updates with useCallback
 */
export function useEarthquakeAnimation({
  earthquakeShaking,
  grid,
  effectiveRenderMode,
  shouldDisableEarthquakeEffects,
  prefersReducedMotion,
  playEarthquakeRumble,
  playEarthquakeShake,
}: UseEarthquakeAnimationProps) {
  const [earthquakePhase, setEarthquakePhase] = useState<EarthquakePhase>('idle');
  const [earthquakeParticles, setEarthquakeParticles] = useState<Particle[]>([]);
  const [earthquakeDust, setEarthquakeDust] = useState<DustCloud[]>([]);
  const [showCracks, setShowCracks] = useState(false);
  const [dustPhase, setDustPhase] = useState<DustPhase>('idle');

  // Stable shake offsets stored in ref to prevent recalculation
  const shakeOffsetsRef = useRef<Map<string, ShakeOffset>>(new Map());
  const prevEarthquakeShakingRef = useRef(false);

  // Check if enhanced mode should be used
  const useEnhancedMode = useMemo(() => {
    return effectiveRenderMode === 'full' &&
           !shouldDisableEarthquakeEffects &&
           !prefersReducedMotion;
  }, [effectiveRenderMode, shouldDisableEarthquakeEffects, prefersReducedMotion]);

  // Memoized grid dimensions
  const gridDimensions = useMemo(() => ({
    rows: grid.length,
    cols: grid[0]?.length || 0,
  }), [grid]);

  // Generate optimized shake offsets
  const generateShakeOffsets = useCallback(() => {
    const newOffsets = new Map<string, ShakeOffset>();
    const { rows, cols } = gridDimensions;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        newOffsets.set(`${i}-${j}`, {
          // REDUCED: Much gentler displacement for less jarring effect
          x: useEnhancedMode
            ? (Math.random() - 0.5) * (150 + Math.random() * 150) // ±75-150px
            : (Math.random() - 0.5) * 80,
          y: useEnhancedMode
            ? (Math.random() - 0.5) * (150 + Math.random() * 150) // ±75-150px
            : (Math.random() - 0.5) * 80,
          // REDUCED: 0.5-1 rotation instead of 2-3
          rotate: useEnhancedMode
            ? (Math.random() - 0.5) * (180 + Math.random() * 180) // ±90-180deg
            : (Math.random() - 0.5) * 90,
          // REDUCED: Tighter scale range for subtler effect
          scale: useEnhancedMode
            ? 0.8 + Math.random() * 0.4 // 0.8 to 1.2
            : 0.85 + Math.random() * 0.3,
          // Stagger animation slightly
          delay: (i + j) * 0.008, // Reduced from 0.01
        });
      }
    }

    return newOffsets;
  }, [gridDimensions, useEnhancedMode]);

  // Generate optimized particles (12 instead of 30)
  const generateParticles = useCallback((): Particle[] => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: 50,
      y: 50,
      vx: (Math.random() - 0.5) * 80, // Gentler particle movement
      vy: (Math.random() - 0.5) * 80,
      rotation: Math.random() * 360,
      size: 5 + Math.random() * 7, // 5-12px
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    }));
  }, []);

  // Generate optimized dust clouds (4 instead of 8)
  const generateDustClouds = useCallback((): DustCloud[] => {
    return Array.from({ length: 4 }, (_, i) => ({
      id: i,
      x: (i / 4) * 100 + (Math.random() - 0.5) * 15,
      size: 70 + Math.random() * 70, // 70-140px
      delay: i * 0.08, // Increased stagger
    }));
  }, []);

  // Main earthquake effect
  useEffect(() => {
    if (earthquakeShaking && !prevEarthquakeShakingRef.current) {
      // Earthquake just started - generate offsets
      shakeOffsetsRef.current = generateShakeOffsets();

      // Phase 1: Rumble warning
      setEarthquakePhase('rumble');
      playEarthquakeRumble();

      // Phase 2: Main quake (after 150ms) - dust covers the board
      const quakeTimeout = setTimeout(() => {
        setEarthquakePhase('quake');
        playEarthquakeShake();

        // Only generate particles/dust in enhanced mode
        if (useEnhancedMode) {
          setEarthquakeParticles(generateParticles());
          setEarthquakeDust(generateDustClouds());
          setShowCracks(true);
          setDustPhase('cover');
        }
      }, 150);

      // Phase 3: Settle (after 550ms) - comic reveal effect
      const settleTimeout = setTimeout(() => {
        setEarthquakePhase('settle');
        setEarthquakeParticles([]);
        setEarthquakeDust([]);
        if (useEnhancedMode) {
          setDustPhase('reveal');
        }
      }, 550);

      // Phase 4: Back to idle (after 850ms) - reduced from 1700ms
      const idleTimeout = setTimeout(() => {
        setEarthquakePhase('idle');
        setShowCracks(false);
        setDustPhase('idle');
      }, 850);

      prevEarthquakeShakingRef.current = earthquakeShaking;

      // Cleanup
      return () => {
        clearTimeout(quakeTimeout);
        clearTimeout(settleTimeout);
        clearTimeout(idleTimeout);
      };
    } else if (!earthquakeShaking) {
      setEarthquakePhase('idle');
      setShowCracks(false);
      setDustPhase('idle');
      prevEarthquakeShakingRef.current = earthquakeShaking;
    }

    // No cleanup needed for else branch
    return undefined;
  }, [
    earthquakeShaking,
    generateShakeOffsets,
    generateParticles,
    generateDustClouds,
    useEnhancedMode,
    playEarthquakeRumble,
    playEarthquakeShake,
  ]);

  // Get shake offset for a specific cell
  const getShakeOffset = useCallback((cellKey: string): ShakeOffset => {
    return earthquakeShaking
      ? shakeOffsetsRef.current.get(cellKey) || ZERO_SHAKE_OFFSET
      : ZERO_SHAKE_OFFSET;
  }, [earthquakeShaking]);

  // Memoized animation config for each phase
  const getPhaseAnimation = useMemo(() => ({
    rumble: {
      // Phase 1: Warning rumble (gentler)
      animate: {
        x: [0, -2, 2, -2, 2, -1, 1, 0],
        y: [0, -1, 1, -1, 1, -0.5, 0.5, 0],
        rotate: [0, -1, 1, -1, 1, 0],
        scale: 1,
        opacity: 1,
      },
      transition: {
        duration: 0.3,
        times: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 1],
        ease: 'easeInOut' as const,
      },
    },
    quake: {
      // Phase 2: Violent quake (OPTIMIZED - no 3D transforms, no blur)
      transition: {
        type: 'spring' as const,
        stiffness: 50, // Increased from 30 for faster settling
        damping: 8, // Increased from 6 for less oscillation
        mass: 1.2, // Reduced from 1.5 for lighter feel
      },
    },
    settle: {
      // Phase 3: Settling bounce
      animate: {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        opacity: 1,
      },
      transition: {
        type: 'spring' as const,
        stiffness: 180, // Increased from 150
        damping: 14, // Increased from 12
        bounce: 0.3, // Reduced from 0.4 for subtler bounce
      },
    },
  }), []);

  return {
    earthquakePhase,
    earthquakeParticles,
    earthquakeDust,
    showCracks,
    dustPhase,
    getShakeOffset,
    getPhaseAnimation,
    useEnhancedMode,
  };
}
