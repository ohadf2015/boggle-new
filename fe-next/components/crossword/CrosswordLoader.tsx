'use client';

// A self-contained "setting the grid" loader. Deliberately CSS-only (no JS timers): the keyframe
// animation runs on the compositor, so it keeps animating smoothly even while the main thread is
// briefly busy generating a puzzle (the inline CSP fill). That's what lets generation run inline
// without a Web Worker yet still feel responsive.

export interface CrosswordLoaderProps {
  label: string;
  /** Render as a full-screen overlay above an existing board (freeplay regeneration). */
  overlay?: boolean;
}

export function CrosswordLoader({ label, overlay = false }: CrosswordLoaderProps) {
  return (
    <div
      className={
        overlay
          ? 'fixed inset-0 z-[60] grid place-items-center bg-neo-navy/80 backdrop-blur-[1px]'
          : 'grid min-h-[100dvh] place-items-center bg-neo-navy texture-halftone'
      }
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        {/* A 3×3 of paper cells that fill in sequence — a crossword being penciled. */}
        <div className="grid grid-cols-3 gap-1 rounded-none border-[3px] border-black bg-black p-1 shadow-hard-lg">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="cw-loader-cell size-7 bg-neo-cream"
              style={{ animationDelay: `${(i % 3) * 0.12 + Math.floor(i / 3) * 0.12}s` }}
            />
          ))}
        </div>
        <p className="font-neo-display font-bold text-sm uppercase tracking-wide text-neo-cream">
          {label}
        </p>
      </div>

      <style jsx>{`
        .cw-loader-cell {
          animation: cw-loader-pulse 1.1s ease-in-out infinite;
        }
        @keyframes cw-loader-pulse {
          0%,
          100% {
            opacity: 0.25;
            transform: scale(0.85);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .cw-loader-cell {
            animation: none;
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
}
