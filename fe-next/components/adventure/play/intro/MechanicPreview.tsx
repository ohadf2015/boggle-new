'use client';

/**
 * A 3x3 looping mini-board that SHOWS the level's rule before you play
 * (Balatro states the blind; we also demo it). Pure CSS keyframes in
 * intro.css; prefers-reduced-motion freezes on the explanatory frame.
 */
import type { LevelKind } from '@/lib/adventure/play/levels';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { Bomb, Check, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import './intro.css';

// Per-kind demo: which tiles form the "word" (in order), and per-tile roles.
const PATHS: Partial<Record<LevelKind, number[]>> = {
  classic: [0, 4, 8],
  hunt: [2, 4, 6],
  chain: [0, 1, 2, 5, 8],
  fog: [3, 4, 5],
  bomb: [6, 7, 4],
  elite: [0, 4, 8],
  boss: [0, 4, 8],
};

export default function MechanicPreview({ kind, big }: { kind: LevelKind; big?: boolean }) {
  const { t } = useLanguageSafe();
  const letters = Array.from(t('adventurePlay.variety.demoLetters')).slice(0, 9);
  while (letters.length < 9) letters.push('•');
  const path = PATHS[kind] ?? [];
  return (
    <div className={cn('mech-preview', big && 'mech-preview-lg', `mech-${kind}`)} aria-hidden data-testid="mechanic-preview">
      {letters.map((ch, i) => {
        const step = path.indexOf(i);
        return (
          <span key={i} className={cn('mech-tile', step >= 0 && 'mech-on', kind === 'fog' && Math.abs((i % 3) - 1) + Math.abs(Math.floor(i / 3) - 1) > 1 && 'mech-far')}
            style={{ ['--step' as string]: step }}>
            {ch}
            {kind === 'bomb' && i === 7 && <Bomb className="mech-bomb-icon" strokeWidth={2.75} />}
            {kind === 'chain' && i === 2 && <Link2 className="mech-link" strokeWidth={3} />}
          </span>
        );
      })}
      {kind === 'fog' && <span className="mech-cloud" />}
      {kind === 'hunt' && <span className="mech-stamp"><Check className="w-7 h-7" strokeWidth={4} /></span>}
    </div>
  );
}
