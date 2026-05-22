import { memo } from 'react';
import { m } from 'framer-motion';
import type { ComboColors, PerformanceMode } from './types';
import type { SelectionEscalation } from './selectionEscalation';
import VFXTileEffect from './VFXTileEffect';

interface GridCellEffectsProps {
  isSelected: boolean;
  isFirstSelected: boolean;
  comboLevel: number;
  comboColors: ComboColors;
  effectiveRenderMode: PerformanceMode;
  reduceMotion: boolean;
  /** 0-based index of this tile in the selection order */
  selectionIndex: number;
  /** Pre-computed escalation from parent. Stable ref per (depth, tier, combo)
   *  via getSelectionEscalation cache → memo holds across drag steps within a tier. */
  escalation: SelectionEscalation | null;
  /** Active drag flag — when true we suppress heavy paint (blurred glow, WebGL
   *  shader, large particle bursts). Drag-time effects must stay cheap; full
   *  juice fires post-release when the word is committed. */
  isDragging?: boolean;
}

/**
 * Ripple gradient picks the HIGHER of escalation tier vs combo level,
 * so the two systems compound rather than fighting.
 */
function getRippleGradient(tier: number, comboLevel: number, isRainbow: boolean): string {
  // Use the maximum "intensity source" between tier and combo
  const effectiveIntensity = Math.max(tier, comboLevel >= 7 ? 3 : comboLevel >= 5 ? 2 : comboLevel >= 3 ? 1 : 0);

  if (effectiveIntensity >= 3 || isRainbow) {
    return 'radial-gradient(circle, rgba(0,255,255,0.7), rgba(255,51,102,0.4) 50%, transparent 75%)';
  }
  if (effectiveIntensity >= 2) {
    return 'radial-gradient(circle, rgba(255,20,147,0.7), rgba(255,107,53,0.4) 50%, transparent 75%)';
  }
  if (effectiveIntensity >= 1) {
    return 'radial-gradient(circle, rgba(255,107,53,0.6), rgba(255,225,53,0.3) 50%, transparent 70%)';
  }
  return 'radial-gradient(circle, rgba(255,255,255,0.6), transparent 70%)';
}

function getGlowGradient(tier: number, comboLevel: number, isRainbow: boolean): string {
  const effectiveIntensity = Math.max(tier, comboLevel >= 7 ? 3 : comboLevel >= 5 ? 2 : comboLevel >= 3 ? 1 : 0);

  if (effectiveIntensity >= 3 || isRainbow) {
    return 'radial-gradient(circle at center, rgba(0,255,255,0.9), rgba(255,51,102,0.5) 40%, transparent 70%)';
  }
  if (effectiveIntensity >= 2) {
    return 'radial-gradient(circle at center, rgba(255,20,147,0.9), rgba(255,107,53,0.4) 40%, transparent 70%)';
  }
  if (effectiveIntensity >= 1) {
    return 'radial-gradient(circle at center, rgba(255,107,53,0.8), rgba(255,225,53,0.3) 40%, transparent 60%)';
  }
  return 'radial-gradient(circle at center, rgba(255,255,255,0.95), transparent 60%)';
}

/**
 * Renders ripple, glow, sparkle, and burst effects inside a selected grid cell.
 * Effects compound from both combo level AND selection depth (letter count).
 */
const GridCellEffects = memo<GridCellEffectsProps>(function GridCellEffects({
  isSelected,
  isFirstSelected,
  comboLevel,
  comboColors,
  effectiveRenderMode,
  reduceMotion,
  selectionIndex,
  escalation,
  isDragging = false,
}) {
  if (!isSelected || effectiveRenderMode === 'minimal' || !escalation) return null;
  // Drag-time render mode: keep the primary ripple (instant feedback for the
  // newly-joined cell) but drop the heavier secondary glow (`filter: blur()`),
  // glow ring border-shadow, escalation bursts, and the WebGL shader. Those
  // re-mount when the cell stays selected after the user releases — combo
  // bursts fire post-submit anyway.
  const fullMode = effectiveRenderMode === 'full' && !isDragging;

  // Compound intensity: max of escalation tier and combo-derived intensity
  const compoundTier = Math.max(
    escalation.tier,
    comboLevel >= 7 ? 3 : comboLevel >= 5 ? 2 : comboLevel >= 3 ? 1 : 0,
  );

  const rippleGradient = getRippleGradient(escalation.tier, comboLevel, !!comboColors.isRainbow);
  const glowGradient = getGlowGradient(escalation.tier, comboLevel, !!comboColors.isRainbow);

  return (
    <>
      {/* Primary ripple — color compounds from both systems */}
      <m.div
        className="absolute inset-0"
        style={{ borderRadius: '6px', background: rippleGradient }}
        initial={{ scale: 0.3, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.5 + compoundTier * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      />

      {/* Secondary glow pulse — full mode, compounds */}
      {fullMode && (
        <m.div
          className="absolute inset-[-4px] pointer-events-none"
          style={{
            background: glowGradient,
            filter: `blur(${3 + compoundTier}px)`,
            borderRadius: '10px',
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 1.5 + compoundTier * 0.15, 1.8 + compoundTier * 0.1],
            opacity: [1, 0.7, 0],
          }}
          transition={{ duration: 0.6 + compoundTier * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      )}

      {/* Glow ring — appears when EITHER system triggers (tier 1+ or combo 3+).
          fullMode-gated so its blurred box-shadow (redundant with the cell's own
          escalation glow) is dropped mid-drag, per this component's render-mode
          contract; it re-mounts on release. */}
      {compoundTier >= 1 && !reduceMotion && fullMode && (
        <m.div
          className="absolute inset-[-6px] pointer-events-none"
          style={{
            borderRadius: '12px',
            border: `${1.5 + compoundTier * 0.5}px solid ${escalation.borderColor}`,
            boxShadow: escalation.glow,
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: [0.9, 1.1 + compoundTier * 0.05, 1.0 + compoundTier * 0.03],
            opacity: [0, 1, 0.7 + compoundTier * 0.08],
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      )}

      {/* Sparkle burst — first letter gets extra flair (full mode only) */}
      {isFirstSelected && !reduceMotion && fullMode && (
        <>
          {[...Array(6)].map((_, idx) => {
            const angle = (idx * 60) * (Math.PI / 180);
            const distance = 32;
            const colors = escalation.particleColors;
            const color = colors[idx % colors.length];
            return (
              <m.div
                key={`first-burst-${idx}`}
                className="absolute pointer-events-none rounded-full"
                style={{
                  width: 8, height: 8,
                  background: color,
                  left: '50%', top: '50%',
                  marginLeft: -4, marginTop: -4,
                  boxShadow: `0 0 6px ${color}`,
                }}
                initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0],
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />
            );
          })}
        </>
      )}

      {/* Escalation burst particles — compounds: more particles, bigger, further at high combo */}
      {/* Variable ratio: 20% chance of 1.5x particle count for surprise "extra juice" */}
      {escalation.showBurst && !reduceMotion && fullMode && !isFirstSelected && (
        <>
          {[...Array(Math.round(escalation.particleCount * (selectionIndex % 5 === 3 ? 1.5 : 1)))].map((_, idx) => {
            const angle = (idx * (360 / escalation.particleCount) + 30) * (Math.PI / 180);
            const color = escalation.particleColors[idx % escalation.particleColors.length];
            return (
              <m.div
                key={`esc-burst-${idx}`}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: escalation.particleSize,
                  height: escalation.particleSize,
                  background: color,
                  left: '50%', top: '50%',
                  marginLeft: -escalation.particleSize / 2,
                  marginTop: -escalation.particleSize / 2,
                  boxShadow: `0 0 ${3 + compoundTier * 2}px ${color}`,
                }}
                initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1.2 + compoundTier * 0.2, 0],
                  opacity: [0, 1, 0],
                  x: Math.cos(angle) * escalation.particleDistance,
                  y: Math.sin(angle) * escalation.particleDistance,
                }}
                transition={{
                  duration: 0.35 + compoundTier * 0.05,
                  ease: 'easeOut',
                }}
              />
            );
          })}
        </>
      )}

      {/* Combo-only burst — when short word (tier 0) but combo is active */}
      {escalation.tier === 0 && !reduceMotion && fullMode && comboLevel >= 2 && (
        <>
          {[...Array(6)].map((_, idx) => {
            const angle = (idx * 60 + 30) * (Math.PI / 180);
            const distance = comboLevel >= 5 ? 24 : 20;
            const pColors = comboColors.isRainbow
              ? ['#FF1493', '#00FFFF', '#FFE135', '#BFFF00', '#FF3366', '#8B5CF6']
              : comboLevel >= 5
                ? ['#FF3366', '#FF6B35', '#FFE135', '#FF1493', '#FFA500', '#FFD700']
                : ['#FF6B35', '#FFE135', '#FF3366', '#FFA500', '#FFD700', '#FF9500'];
            const pColor = pColors[idx % pColors.length];
            return (
              <m.div
                key={`combo-burst-${idx}`}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 6, height: 6,
                  background: pColor,
                  left: '50%', top: '50%',
                  marginLeft: -3, marginTop: -3,
                  boxShadow: `0 0 4px ${pColor}`,
                }}
                initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1.3, 0],
                  opacity: [0, 1, 0],
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            );
          })}
        </>
      )}
      {/* WebGL shader overlay for high combos — skip during drag to keep the
          pointer-move path off the GPU compositor. */}
      {!isDragging && (
        <VFXTileEffect
          comboLevel={comboLevel}
          isSelected={isSelected}
          reduceMotion={reduceMotion}
        />
      )}
    </>
  );
});

export default GridCellEffects;
