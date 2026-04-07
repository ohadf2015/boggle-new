'use client';

interface BlastBackgroundProps {
  /** Chain intensity level 0-5 */
  intensity: number;
}

/**
 * BlastBackground — simple neo-navy background matching the design system.
 * Intensity-reactive subtle vignette overlay for chain escalation feedback.
 */
export function BlastBackground({ intensity }: BlastBackgroundProps) {
  const clampedIntensity = Math.min(5, Math.max(0, Math.round(intensity)));

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none bg-neo-navy"
      data-testid="blast-background"
      aria-hidden="true"
    >
      {/* Subtle vignette that intensifies with chain level */}
      {clampedIntensity >= 1 && (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%)',
            opacity: Math.min(clampedIntensity * 0.2, 0.8),
            transition: 'opacity 0.6s ease',
          }}
        />
      )}
    </div>
  );
}
