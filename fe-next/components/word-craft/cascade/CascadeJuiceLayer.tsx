'use client';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

export interface CascadeJuiceLayerProps {
  /** Combo chain count this round. Layer flashes when it increases. */
  comboCount: number;
  /** Last submitted word score; layer pops a `+N` flash when it changes. */
  lastWordScore: number | null;
  /** Last submitted word, used for the score-pop subtitle. */
  lastWord: string | null;
  /** True when fire reached the top this round. */
  gameOver: boolean;
  /** Locale-aware text for combo labels ("DOUBLE", "TRIPLE", "ELECTRIC"). */
  comboLabels?: { double: string; triple: string; electric: string };
}

interface Flash {
  id: number;
  kind: 'combo' | 'score' | 'gameOver';
  text: string;
  subtext?: string;
}

const DEFAULT_LABELS = {
  double: 'DOUBLE!',
  triple: 'TRIPLE!',
  electric: 'ELECTRIC!',
};

function comboLabelFor(chainCount: number, labels = DEFAULT_LABELS): string {
  if (chainCount >= 4) return labels.electric;
  if (chainCount === 3) return labels.triple;
  return labels.double;
}

export function CascadeJuiceLayer({
  comboCount,
  lastWordScore,
  lastWord,
  gameOver,
  comboLabels = DEFAULT_LABELS,
}: CascadeJuiceLayerProps) {
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const nextIdRef = useRef(1);
  const prevComboRef = useRef(comboCount);
  const prevScoreRef = useRef(lastWordScore);
  const gameOverFiredRef = useRef(false);

  // Combo bump → flash
  useEffect(() => {
    if (comboCount > prevComboRef.current && comboCount >= 2) {
      const id = nextIdRef.current++;
      setFlashes((f) => [
        ...f,
        { id, kind: 'combo', text: comboLabelFor(comboCount, comboLabels) },
      ]);
      window.setTimeout(() => {
        setFlashes((f) => f.filter((x) => x.id !== id));
      }, 1100);
    }
    prevComboRef.current = comboCount;
  }, [comboCount, comboLabels]);

  // Score change → +N flash
  useEffect(() => {
    if (lastWordScore !== null && lastWordScore !== prevScoreRef.current && lastWordScore > 0) {
      const id = nextIdRef.current++;
      setFlashes((f) => [
        ...f,
        {
          id,
          kind: 'score',
          text: `+${lastWordScore}`,
          subtext: lastWord ?? undefined,
        },
      ]);
      window.setTimeout(() => {
        setFlashes((f) => f.filter((x) => x.id !== id));
      }, 900);
    }
    prevScoreRef.current = lastWordScore;
  }, [lastWordScore, lastWord]);

  // Game over → big flash, once
  useEffect(() => {
    if (gameOver && !gameOverFiredRef.current) {
      gameOverFiredRef.current = true;
      const id = nextIdRef.current++;
      setFlashes((f) => [...f, { id, kind: 'gameOver', text: 'BURNED OUT' }]);
      window.setTimeout(() => {
        setFlashes((f) => f.filter((x) => x.id !== id));
      }, 1800);
    } else if (!gameOver) {
      gameOverFiredRef.current = false;
    }
  }, [gameOver]);

  if (flashes.length === 0) return null;

  return (
    <div
      data-testid="cascade-juice-layer"
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      {flashes.map((flash) => (
        <div
          key={flash.id}
          data-flash-kind={flash.kind}
          className={clsx(
            'absolute flex flex-col items-center justify-center',
            'animate-neo-pop font-neo-display uppercase',
            flash.kind === 'combo' &&
              'rounded-neo border-neo-thick border-black bg-neo-pink px-4 py-2 text-2xl text-neo-cream shadow-hard-lg',
            flash.kind === 'score' &&
              'rounded-neo border-neo border-black bg-neo-lime px-3 py-1 text-xl text-neo-navy shadow-hard',
            flash.kind === 'gameOver' &&
              'rounded-neo border-neo-thick border-black bg-neo-red px-6 py-4 text-4xl text-neo-cream shadow-hard-lg animate-neo-shake',
          )}
        >
          <span>{flash.text}</span>
          {flash.subtext && (
            <span className="font-neo-body text-sm normal-case text-neo-navy/80">
              {flash.subtext}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
