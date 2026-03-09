import { memo } from 'react';
import { motion } from 'framer-motion';
import type { ComboColors, PerformanceMode } from './types';

interface GridCellEffectsProps {
  isSelected: boolean;
  isFirstSelected: boolean;
  comboLevel: number;
  comboColors: ComboColors;
  effectiveRenderMode: PerformanceMode;
  reduceMotion: boolean;
}

/**
 * Renders ripple, glow, sparkle, and burst effects inside a selected grid cell.
 * Extracted from GridComponent to reduce file size.
 */
const GridCellEffects = memo<GridCellEffectsProps>(function GridCellEffects({
  isSelected,
  isFirstSelected,
  comboLevel,
  comboColors,
  effectiveRenderMode,
  reduceMotion,
}) {
  if (!isSelected || effectiveRenderMode === 'minimal') return null;

  return (
    <>
      {/* Primary ripple - shown in reduced and full modes */}
      <motion.div
        className="absolute inset-0"
        style={{
          borderRadius: '6px',
          background: comboColors.isRainbow
            ? 'radial-gradient(circle, rgba(255,51,102,0.7), rgba(0,255,255,0.4) 50%, transparent 75%)'
            : comboLevel >= 5
              ? 'radial-gradient(circle, rgba(255,107,53,0.7), rgba(255,51,102,0.4) 50%, transparent 75%)'
              : comboLevel >= 3
                ? 'radial-gradient(circle, rgba(255,150,50,0.6), transparent 70%)'
                : 'radial-gradient(circle, rgba(255,255,255,0.6), transparent 70%)',
        }}
        initial={{ scale: 0.3, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      />

      {/* Secondary glow pulse - only in full mode */}
      {effectiveRenderMode === 'full' && (
        <motion.div
          className="absolute inset-[-4px] pointer-events-none"
          style={{
            background: comboColors.isRainbow
              ? 'radial-gradient(circle at center, rgba(255, 51, 102, 0.9), rgba(0, 255, 255, 0.5) 40%, transparent 70%)'
              : comboLevel >= 5
                ? 'radial-gradient(circle at center, rgba(255, 107, 53, 0.9), rgba(255, 51, 102, 0.5) 40%, transparent 70%)'
                : comboLevel >= 3
                  ? 'radial-gradient(circle at center, rgba(255, 150, 50, 0.8), transparent 60%)'
                  : 'radial-gradient(circle at center, rgba(255, 255, 255, 0.95), transparent 60%)',
            filter: 'blur(4px)',
            borderRadius: '10px'
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: [0, 1.5, 1.8], opacity: [1, 0.7, 0] }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      )}

      {/* Combo level glow ring */}
      {comboLevel >= 3 && !reduceMotion && (
        <motion.div
          className="absolute inset-[-6px] pointer-events-none"
          style={{
            borderRadius: '12px',
            border: comboColors.isRainbow
              ? '3px solid rgba(255, 51, 102, 0.9)'
              : comboLevel >= 7
                ? '3px solid rgba(255, 51, 102, 0.8)'
                : comboLevel >= 5
                  ? '3px solid rgba(255, 107, 53, 0.8)'
                  : '2px solid rgba(255, 150, 50, 0.7)',
            boxShadow: comboColors.isRainbow
              ? '0 0 16px rgba(255, 51, 102, 0.7), inset 0 0 12px rgba(0, 255, 255, 0.4), 0 0 24px rgba(0, 255, 255, 0.3)'
              : comboLevel >= 7
                ? '0 0 14px rgba(255, 51, 102, 0.6), 0 0 20px rgba(255, 107, 53, 0.4)'
                : comboLevel >= 5
                  ? '0 0 12px rgba(255, 107, 53, 0.6), 0 0 18px rgba(255, 150, 50, 0.3)'
                  : '0 0 10px rgba(255, 150, 50, 0.5)',
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: [0.9, 1.15, 1.05],
            opacity: [0, 1, 0.8],
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      )}

      {/* Sparkle burst - first letter gets extra flair (full mode only) */}
      {isFirstSelected && !reduceMotion && effectiveRenderMode === 'full' && (
        <>
          {[...Array(6)].map((_, idx) => {
            const angle = (idx * 60) * (Math.PI / 180);
            const distance = 32;
            const colors = comboColors.isRainbow
              ? ['#FF3366', '#00FFFF', '#FFE135', '#FF1493', '#BFFF00', '#8B5CF6']
              : comboLevel >= 5
                ? ['#FF3366', '#FF6B35', '#FFE135', '#FF1493', '#FFA500', '#FFD700']
                : ['#FFD700', '#FF6B35', '#FF3366', '#FFA500', '#FFE135', '#FF9500'];
            return (
              <motion.div
                key={`first-burst-${idx}`}
                className="absolute pointer-events-none rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: colors[idx],
                  left: '50%',
                  top: '50%',
                  marginLeft: -4,
                  marginTop: -4,
                  boxShadow: `0 0 6px ${colors[idx]}`,
                }}
                initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0],
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                }}
                transition={{
                  duration: 0.45,
                  ease: 'easeOut',
                }}
              />
            );
          })}
        </>
      )}

      {/* Center burst particles - full mode only */}
      {!reduceMotion && effectiveRenderMode === 'full' && comboLevel >= 2 && (
        <>
          {[...Array(6)].map((_, idx) => {
            const angle = (idx * 60 + 30) * (Math.PI / 180);
            const distance = comboLevel >= 5 ? 24 : 20;
            const particleColors = comboColors.isRainbow
              ? ['#FF1493', '#00FFFF', '#FFE135', '#BFFF00', '#FF3366', '#8B5CF6']
              : comboLevel >= 5
                ? ['#FF3366', '#FF6B35', '#FFE135', '#FF1493', '#FFA500', '#FFD700']
                : ['#FF6B35', '#FFE135', '#FF3366', '#FFA500', '#FFD700', '#FF9500'];
            const particleColor = particleColors[idx % particleColors.length];
            return (
              <motion.div
                key={`burst-${idx}`}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 6,
                  height: 6,
                  background: particleColor,
                  left: '50%',
                  top: '50%',
                  marginLeft: -3,
                  marginTop: -3,
                  boxShadow: `0 0 4px ${particleColor}`,
                }}
                initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1.3, 0],
                  opacity: [0, 1, 0],
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance
                }}
                transition={{
                  duration: 0.4,
                  ease: 'easeOut',
                }}
              />
            );
          })}
        </>
      )}
    </>
  );
});

export default GridCellEffects;
