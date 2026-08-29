import React from 'react';

/**
 * Server-rendered playable shell for /en/boggle-word-shake-free.
 *
 * SinglePlayerView is loaded client-side (it depends on useSearchParams,
 * localStorage, etc.), but this shell renders the actual game chrome — header,
 * score/timer badges, word-forming area, and a static 4x4 letter grid — in the
 * initial HTML. Crawlers and no-JS visitors see a real Boggle board instead of a
 * spinner, and the interactive game hydrates on top without a jarring swap.
 */

const DEMO_GRID: string[][] = [
  ['T', 'R', 'A', 'P'],
  ['E', 'S', 'T', 'N'],
  ['O', 'L', 'I', 'A'],
  ['P', 'M', 'A', 'D'],
];

function HeaderButton({
  children,
  variant = 'neutral',
}: {
  children: React.ReactNode;
  variant?: 'neutral' | 'secondary';
}): React.JSX.Element {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-neo-black px-3 py-1.5 text-xs font-bold uppercase tracking-widest shadow-hard-sm select-none';
  const color =
    variant === 'secondary'
      ? 'bg-neo-cyan text-neo-black'
      : 'bg-neo-pink text-neo-white';
  return <div className={`${base} ${color}`}>{children}</div>;
}

function ScoreBadge({
  label,
  value,
  align,
}: {
  label: string;
  value: string | number;
  align: 'left' | 'right';
}): React.JSX.Element {
  return (
    <div
      className={`relative min-w-[80px] transform rounded-lg border-3 border-neo-black bg-neo-yellow px-3 py-1.5 shadow-hard ${align === 'left' ? '-rotate-1' : 'rotate-1 text-end'}`}
    >
      <div className="font-bold text-[9px] uppercase tracking-wider text-neo-black/60">
        {label}
      </div>
      <div className="font-black text-xl leading-none text-neo-black">{value}</div>
    </div>
  );
}

function CircularTimerShell(): React.JSX.Element {
  return (
    <div className="relative flex items-center justify-center">
      <svg width="80" height="80" className="-rotate-90 transform">
        <circle
          cx="40"
          cy="40"
          r="32"
          stroke="var(--neo-black)"
          strokeWidth="4"
          fill="transparent"
        />
        <circle
          cx="40"
          cy="40"
          r="32"
          stroke="var(--neo-lime)"
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={201.06}
          strokeDashoffset={0}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-black text-neo-black text-lg">
        2:00
      </div>
    </div>
  );
}

export default function StaticGameShell(): React.JSX.Element {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-neo-navy">
      {/* Subtle background pattern so the shell does not look blank */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, var(--neo-cyan) 0%, transparent 25%), radial-gradient(circle at 80% 70%, var(--neo-pink) 0%, transparent 25%)',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 pb-1 pt-3">
        <HeaderButton variant="neutral">← Quit</HeaderButton>
        <HeaderButton variant="secondary">Pause</HeaderButton>
      </header>

      {/* Stats row */}
      <div
        className="relative z-10 mx-auto mb-1 flex w-full max-w-md items-center justify-between px-4"
        role="status"
        aria-label="Game status"
      >
        <ScoreBadge label="Coins" value={0} align="left" />
        <ScoreBadge label="Score" value={0} align="right" />
      </div>

      {/* Timer + word-forming area */}
      <div className="relative z-10 mx-auto mb-2 flex w-full max-w-[440px] items-center justify-center gap-3 px-4">
        <CircularTimerShell />
        <div className="flex h-10 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-full border-2 border-neo-black bg-neo-white px-4 shadow-hard-sm">
          <span className="font-black text-lg uppercase tracking-widest text-neo-navy">
            WORD
          </span>
        </div>
      </div>

      {/* Words progress */}
      <div className="relative z-10 mb-1 flex items-center justify-center gap-2 px-8">
        <div className="h-[3px] flex-1 max-w-[160px] overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-0 bg-neo-cyan/50 rounded-full" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white tabular-nums">
          0/0
        </span>
      </div>

      {/* Static letter grid */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-4">
        <div
          className="grid aspect-square w-full max-w-[360px] grid-cols-4 gap-2 rounded-xl border-4 border-neo-black bg-neo-navy-elevated/50 p-3 shadow-hard"
          role="grid"
          aria-label="Boggle letter grid"
        >
          {DEMO_GRID.flatMap((row, rowIndex) =>
            row.map((letter, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                role="gridcell"
                className="flex aspect-square items-center justify-center rounded-lg border-2 border-neo-black bg-neo-yellow font-black text-2xl text-neo-black shadow-hard-sm sm:text-3xl"
              >
                {letter}
              </div>
            ))
          )}
        </div>

        <p className="mt-4 text-center text-sm font-bold text-neo-white/70">
          Drag across letters to form words. The live game starts automatically.
        </p>
      </div>
    </div>
  );
}
