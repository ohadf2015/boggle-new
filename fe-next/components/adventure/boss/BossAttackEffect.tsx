/**
 * BossAttackEffect — Per-boss unique attack visual effects
 *
 * Each boss has a distinct screen-level effect when using abilities:
 * - Ms. Grammar: Red pen slash marks
 * - Spelling Bee: Honey splash with buzzing particles
 * - Professor Thesaurus: Purple book pages swirl
 * - Captain Metaphor: Ocean wave crash
 * - Baron Buildaword: Gear explosion with sparks
 * - Puzzle Master: Purple puzzle piece scatter
 * - Reflection King: Ice crystal shatter
 * - Cosmic Wordsmith: Cosmic nebula burst
 * - Linguist Sage: Aurora wave sweep
 * - Lexicon Dragon: Golden fire breath
 */

'use client';

import { memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

// ==============================================
// TYPES
// ==============================================

interface BossAttackEffectProps {
  attackEffect: { abilityName: string | null; damage: number } | null;
  bossId?: string;
}

// ==============================================
// PER-BOSS EFFECT CONFIGS
// ==============================================

interface AttackEffectConfig {
  /** Flash overlay color */
  flashColor: string;
  /** Slash/effect core color */
  coreColor: string;
  /** Slash glow color */
  glowColor: string;
  /** CSS text-shadow for damage number */
  damageShadow: string;
  /** Damage number color class */
  damageColorClass: string;
  /** Unique effect type */
  effectType: 'slash' | 'radial' | 'wave' | 'scatter' | 'beam';
  /** Rotation of the slash effect */
  slashRotation: number;
  /** Second slash rotation (for X-shaped effects) */
  slashRotation2: number;
}

const BOSS_EFFECTS: Record<string, AttackEffectConfig> = {
  // W1: Red pen slash marks (X shape)
  msGrammar: {
    flashColor: 'rgba(255, 0, 0, 0.3)',
    coreColor: '#FF3366',
    glowColor: 'rgba(255, 51, 102, 0.6)',
    damageShadow: '0 0 20px rgba(255,0,0,0.9), 0 3px 6px rgba(0,0,0,0.9)',
    damageColorClass: 'text-neo-red',
    effectType: 'slash',
    slashRotation: -30,
    slashRotation2: 30,
  },
  // W2: Honey/amber sting slashes
  spellingBee: {
    flashColor: 'rgba(255, 193, 7, 0.3)',
    coreColor: '#FFC107',
    glowColor: 'rgba(255, 193, 7, 0.6)',
    damageShadow: '0 0 20px rgba(255,193,7,0.9), 0 3px 6px rgba(0,0,0,0.9)',
    damageColorClass: 'text-yellow-400',
    effectType: 'scatter',
    slashRotation: -20,
    slashRotation2: 50,
  },
  // W3: Purple etymology roots
  professorThesaurus: {
    flashColor: 'rgba(138, 43, 226, 0.25)',
    coreColor: '#8B5CF6',
    glowColor: 'rgba(138, 43, 226, 0.5)',
    damageShadow: '0 0 20px rgba(138,43,226,0.9), 0 3px 6px rgba(0,0,0,0.9)',
    damageColorClass: 'text-purple-400',
    effectType: 'radial',
    slashRotation: -45,
    slashRotation2: 45,
  },
  // W4: Ocean blue cutlass slashes
  captainMetaphor: {
    flashColor: 'rgba(0, 119, 190, 0.3)',
    coreColor: '#0077BE',
    glowColor: 'rgba(0, 119, 190, 0.6)',
    damageShadow: '0 0 20px rgba(0,119,190,0.9), 0 3px 6px rgba(0,0,0,0.9)',
    damageColorClass: 'text-blue-400',
    effectType: 'wave',
    slashRotation: -60,
    slashRotation2: 15,
  },
  // W5: Orange mechanical strike
  baronBuildaword: {
    flashColor: 'rgba(255, 140, 0, 0.3)',
    coreColor: '#FF8C00',
    glowColor: 'rgba(255, 140, 0, 0.6)',
    damageShadow: '0 0 20px rgba(255,140,0,0.9), 0 3px 6px rgba(0,0,0,0.9)',
    damageColorClass: 'text-orange-400',
    effectType: 'scatter',
    slashRotation: 0,
    slashRotation2: 90,
  },
  // W6: Magenta puzzle shatter
  puzzleMaster: {
    flashColor: 'rgba(219, 39, 119, 0.25)',
    coreColor: '#DB2777',
    glowColor: 'rgba(219, 39, 119, 0.5)',
    damageShadow: '0 0 20px rgba(219,39,119,0.9), 0 3px 6px rgba(0,0,0,0.9)',
    damageColorClass: 'text-pink-400',
    effectType: 'scatter',
    slashRotation: -15,
    slashRotation2: 75,
  },
  // W7: Icy blue crystal shatter
  reflectionKing: {
    flashColor: 'rgba(100, 200, 255, 0.3)',
    coreColor: '#64C8FF',
    glowColor: 'rgba(100, 200, 255, 0.6)',
    damageShadow: '0 0 20px rgba(100,200,255,0.9), 0 3px 6px rgba(0,0,0,0.9)',
    damageColorClass: 'text-cyan-300',
    effectType: 'radial',
    slashRotation: -45,
    slashRotation2: 45,
  },
  // W8: Cosmic purple beam
  cosmicWordsmith: {
    flashColor: 'rgba(138, 43, 226, 0.3)',
    coreColor: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    damageShadow: '0 0 24px rgba(168,85,247,0.9), 0 3px 6px rgba(0,0,0,0.9)',
    damageColorClass: 'text-violet-400',
    effectType: 'beam',
    slashRotation: -90,
    slashRotation2: 0,
  },
  // W9: Green aurora sweep
  linguistSage: {
    flashColor: 'rgba(0, 255, 128, 0.2)',
    coreColor: '#34D399',
    glowColor: 'rgba(52, 211, 153, 0.5)',
    damageShadow: '0 0 20px rgba(52,211,153,0.9), 0 3px 6px rgba(0,0,0,0.9)',
    damageColorClass: 'text-emerald-400',
    effectType: 'wave',
    slashRotation: 0,
    slashRotation2: 0,
  },
  // W10: Golden dragon fire
  lexiconDragon: {
    flashColor: 'rgba(255, 165, 0, 0.35)',
    coreColor: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.7)',
    damageShadow: '0 0 24px rgba(255,215,0,0.95), 0 0 40px rgba(255,100,0,0.5), 0 3px 6px rgba(0,0,0,0.9)',
    damageColorClass: 'text-yellow-300',
    effectType: 'beam',
    slashRotation: -30,
    slashRotation2: 30,
  },
};

const DEFAULT_EFFECT: AttackEffectConfig = BOSS_EFFECTS.msGrammar;

// ==============================================
// SUB-COMPONENTS
// ==============================================

/** Slash lines with glow layers */
function SlashEffect({ config, rotation }: { config: AttackEffectConfig; rotation: number }) {
  return (
    <AdaptiveMotion.div
      className="absolute top-1/2 left-0 w-full"
      style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}
    >
      {/* Glow base */}
      <AdaptiveMotion.div
        className="absolute top-1/2 left-0 w-full h-3 rounded-full -translate-y-1/2"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: [0, 1.1, 0.9], opacity: [0, 0.6, 0] }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{ background: config.glowColor, opacity: 0.6 }}
      />
      {/* Core */}
      <AdaptiveMotion.div
        className="absolute top-1/2 left-0 w-full h-[3px] rounded-full -translate-y-1/2"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: [0, 1, 0.85] }}
        transition={{ duration: 0.25, delay: 0.03, ease: 'easeOut' }}
        style={{ background: config.coreColor, boxShadow: `0 0 14px ${config.glowColor}` }}
      />
    </AdaptiveMotion.div>
  );
}

/** Radial burst (expanding ring) */
function RadialEffect({ config }: { config: AttackEffectConfig }) {
  return (
    <>
      <AdaptiveMotion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        initial={{ width: 0, height: 0, opacity: 0.8 }}
        animate={{ width: 200, height: 200, opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ border: `3px solid ${config.coreColor}`, boxShadow: `0 0 20px ${config.glowColor}` }}
      />
      <AdaptiveMotion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        initial={{ width: 0, height: 0, opacity: 0.5 }}
        animate={{ width: 280, height: 280, opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        style={{ border: `2px solid ${config.coreColor}`, boxShadow: `0 0 30px ${config.glowColor}` }}
      />
    </>
  );
}

/** Wave sweep (horizontal or vertical) */
function WaveEffect({ config }: { config: AttackEffectConfig }) {
  return (
    <AdaptiveMotion.div
      className="absolute inset-0"
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: '100%', opacity: [0, 0.7, 0] }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="h-full w-1/3"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${config.glowColor} 20%, ${config.coreColor} 50%, ${config.glowColor} 80%, transparent 100%)`,
        }}
      />
    </AdaptiveMotion.div>
  );
}

/** Scatter particles */
function ScatterEffect({ config }: { config: AttackEffectConfig }) {
  const particles = [
    { x: -60, y: -40, r: -15, delay: 0 },
    { x: 50, y: -50, r: 20, delay: 0.03 },
    { x: -30, y: 30, r: -25, delay: 0.06 },
    { x: 70, y: 20, r: 30, delay: 0.04 },
    { x: -50, y: -10, r: 10, delay: 0.07 },
    { x: 40, y: 40, r: -20, delay: 0.05 },
  ];
  return (
    <>
      {particles.map((p) => (
        <AdaptiveMotion.div
          key={`particle-${p.x}-${p.y}-${p.delay}`}
          className="absolute top-1/2 left-1/2 w-3 h-3 rounded-sm"
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.5, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: [0.5, 1.2, 0], rotate: p.r * 10 }}
          transition={{ duration: 0.5, delay: p.delay, ease: 'easeOut' }}
          style={{ background: config.coreColor, boxShadow: `0 0 8px ${config.glowColor}` }}
        />
      ))}
    </>
  );
}

/** Beam (vertical or diagonal energy beam) */
function BeamEffect({ config }: { config: AttackEffectConfig }) {
  return (
    <AdaptiveMotion.div
      className="absolute top-0 left-1/2 -translate-x-1/2 w-8"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: '100%', opacity: [0, 0.8, 0] }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: `linear-gradient(180deg, ${config.coreColor}, ${config.glowColor}, transparent)`,
        boxShadow: `0 0 30px ${config.glowColor}`,
      }}
    />
  );
}

// ==============================================
// MAIN COMPONENT
// ==============================================

const BossAttackEffect = memo<BossAttackEffectProps>(({ attackEffect, bossId }) => {
  const config = (bossId && BOSS_EFFECTS[bossId]) || DEFAULT_EFFECT;

  return (
    <AdaptiveAnimatePresence>
      {attackEffect && (
        <AdaptiveMotion.div
          className="fixed inset-0 z-50 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          data-testid="boss-attack-effect"
        >
          {/* Boss-specific flash color */}
          <AdaptiveMotion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 0.5 }}
            style={{ backgroundColor: config.flashColor }}
          />

          {/* Boss-specific effect */}
          <div className="absolute inset-0 overflow-hidden">
            {config.effectType === 'slash' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40">
                <SlashEffect config={config} rotation={config.slashRotation} />
                <SlashEffect config={config} rotation={config.slashRotation2} />
              </div>
            )}
            {config.effectType === 'radial' && <RadialEffect config={config} />}
            {config.effectType === 'wave' && <WaveEffect config={config} />}
            {config.effectType === 'scatter' && <ScatterEffect config={config} />}
            {config.effectType === 'beam' && <BeamEffect config={config} />}
          </div>

          {/* Damage number with boss-specific color */}
          {attackEffect.damage > 0 && (
            <AdaptiveMotion.div
              className="absolute top-1/3 left-1/2 -translate-x-1/2"
              initial={{ y: 0, opacity: 0, scale: 0.4 }}
              animate={{ y: -56, opacity: [0, 1, 1, 0], scale: [0.4, 1.5, 1.2] }}
              transition={{ duration: 0.85 }}
            >
              <span
                className={`font-neo-display text-5xl font-black ${config.damageColorClass}`}
                style={{ textShadow: config.damageShadow }}
              >
                -{attackEffect.damage}
              </span>
            </AdaptiveMotion.div>
          )}
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
});

BossAttackEffect.displayName = 'BossAttackEffect';

export default BossAttackEffect;
