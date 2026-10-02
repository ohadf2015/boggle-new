'use client';

import { useState } from 'react';
import { Dices, Pencil } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { getSeededAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { cn } from '@/lib/utils';

export const QUICK_PICK_COUNT = 4;

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface AvatarQuickPickProps {
  /** Seeds the dealt looks; defaults to a per-mount random seed. */
  seed?: number;
  onPick: (config: CustomAvatarConfig) => void;
  onOpenBuilder: () => void;
  t: Translate;
  className?: string;
}

/** One-tap looks for the waiting room: pick, shuffle for more, or open the full builder. */
export function AvatarQuickPick({ seed, onPick, onOpenBuilder, t, className }: AvatarQuickPickProps) {
  const [base, setBase] = useState(() => seed ?? Math.floor(Math.random() * 1_000_000));
  const [picked, setPicked] = useState<number | null>(null);
  const [spin, setSpin] = useState(0);
  const seeds = Array.from({ length: QUICK_PICK_COUNT }, (_, i) => base + i);

  return (
    <div
      data-testid="avatar-quick-pick"
      role="group"
      aria-label={t('eduStudent.lobby.pickLook')}
      className={cn('flex items-center justify-center gap-1.5', className)}
    >
      {seeds.map((s) => (
        <button
          key={s}
          type="button"
          data-testid="avatar-quick-option"
          data-seed={s}
          aria-pressed={picked === s}
          aria-label={t('eduStudent.lobby.pickLook')}
          onClick={() => {
            setPicked(s);
            onPick(getSeededAvatarConfig(s));
          }}
          className={cn(
            'size-11 shrink-0 overflow-hidden rounded-full border-[3px] [@media(max-height:700px)]:size-9 bg-neo-navy shadow-hard-sm transition-transform duration-150 active:scale-90 [&_svg]:h-full [&_svg]:w-full',
            'motion-safe:animate-[lc-pick-in_380ms_cubic-bezier(.34,1.56,.64,1)_both]',
            picked === s ? 'border-neo-lime ring-2 ring-neo-lime motion-safe:animate-[lc-pick-pop_420ms_cubic-bezier(.34,1.56,.64,1)]' : 'border-neo-cream'
          )}
        >
          <Avatar customAvatar={getSeededAvatarConfig(s)} size="md" disableEffects className="!h-full !w-full" />
        </button>
      ))}
      <button
        type="button"
        data-testid="avatar-quick-shuffle"
        aria-label={t('eduStudent.lobby.shuffleLooks')}
        title={t('eduStudent.lobby.shuffleLooks')}
        onClick={() => {
          setBase((b) => b + QUICK_PICK_COUNT);
          setPicked(null);
          setSpin((n) => n + 1);
        }}
        className="flex size-11 shrink-0 items-center justify-center rounded-neo border-[3px] border-neo-black bg-neo-yellow [@media(max-height:700px)]:size-9 text-neo-black shadow-hard-sm transition-transform active:translate-y-0.5 active:shadow-none"
      >
        <Dices
          key={spin}
          aria-hidden="true"
          className="size-6 motion-safe:animate-[lc-dice-roll_420ms_ease-out]"
          strokeWidth={2.5}
        />
      </button>
      <button
        type="button"
        data-testid="avatar-quick-build"
        aria-label={t('eduStudent.lobby.buildLook')}
        title={t('eduStudent.lobby.buildLook')}
        onClick={onOpenBuilder}
        className="flex size-11 shrink-0 items-center justify-center rounded-neo border-[3px] border-neo-black bg-neo-cyan [@media(max-height:700px)]:size-9 text-neo-black shadow-hard-sm transition-transform active:translate-y-0.5 active:shadow-none"
      >
        <Pencil aria-hidden="true" className="size-5" strokeWidth={2.5} />
      </button>
      <style>
        {'@keyframes lc-pick-in{0%{transform:scale(.4)}100%{transform:scale(1)}}' +
          '@keyframes lc-pick-pop{0%{transform:scale(1)}40%{transform:scale(1.25) rotate(-8deg)}100%{transform:scale(1)}}' +
          '@keyframes lc-dice-roll{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}'}
      </style>
    </div>
  );
}

export default AvatarQuickPick;
