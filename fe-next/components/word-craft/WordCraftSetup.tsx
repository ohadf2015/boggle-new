'use client';

import { useState } from 'react';
import { Bot, Play, Sparkles, Users } from 'lucide-react';
import { BOT_DIFFICULTIES } from '@/lib/word-craft/botDifficulty';
import { WORDCRAFT_MODIFIERS, modifierLabelKey, type WordCraftModifier } from '@/lib/word-craft/modifiers';
import type { WordCraftSetupChoice } from '@/lib/word-craft/setupPrefs';
import { cn } from '@/lib/utils';

type TFn = (path: string, fallback?: string) => string;

export interface WordCraftSetupProps {
  initial: WordCraftSetupChoice;
  onStart: (choice: WordCraftSetupChoice) => void;
  t: TFn;
}

/**
 * Pre-game setup screen: opponent (bot / pass-and-play), bot difficulty, and
 * the game "twist" (modifier) — everything that used to squat in the in-game
 * topbar, moved to its own calm moment so the game screen is board-first.
 *
 * Pure component: no storage or router side effects. The page persists the
 * choice and switches phase.
 */
export function WordCraftSetup({ initial, onStart, t }: WordCraftSetupProps) {
  const [choice, setChoice] = useState<WordCraftSetupChoice>(initial);
  const twists: Array<WordCraftModifier | 'surprise'> = [
    'surprise',
    ...WORDCRAFT_MODIFIERS.filter((m) => m !== 'none'),
  ];

  return (
    <div className="flex-1 min-h-0 w-full max-w-md mx-auto px-4 py-3 flex flex-col gap-4 overflow-y-auto">
      <h2 className="text-xl font-neo-display font-black text-neo-white text-center">
        {t('wordcraft.setup.title')}
      </h2>

      {/* Opponent */}
      <div role="radiogroup" aria-label={t('wordcraft.setup.opponent.label')} className="grid grid-cols-2 gap-3">
        <OpponentCard
          selected={choice.opponent === 'bot'}
          onSelect={() => setChoice((c) => ({ ...c, opponent: 'bot' }))}
          icon={<Bot className="w-7 h-7" strokeWidth={2.5} />}
          label={t('wordcraft.setup.opponent.bot')}
          desc={t('wordcraft.setup.opponent.botDesc')}
        />
        <OpponentCard
          selected={choice.opponent === 'hotseat'}
          onSelect={() => setChoice((c) => ({ ...c, opponent: 'hotseat' }))}
          icon={<Users className="w-7 h-7" strokeWidth={2.5} />}
          label={t('wordcraft.setup.opponent.hotseat')}
          desc={t('wordcraft.setup.opponent.hotseatDesc')}
        />
      </div>

      {/* Bot difficulty — only when there is a bot to tune */}
      {choice.opponent === 'bot' ? (
        <div
          role="radiogroup"
          aria-label={t('wordcraft.setup.difficulty.label')}
          className="flex flex-col gap-1.5"
        >
          <span className="text-[11px] font-neo-display font-black uppercase tracking-wider text-neo-white/70">
            {t('wordcraft.setup.difficulty.label')}
          </span>
          <div className="grid grid-cols-3 gap-2">
            {BOT_DIFFICULTIES.map((d) => (
              <Pill
                key={d}
                selected={choice.difficulty === d}
                onSelect={() => setChoice((c) => ({ ...c, difficulty: d }))}
                label={t(`wordcraft.difficulty.${d}`)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Twist (modifier) */}
      <div role="radiogroup" aria-label={t('wordcraft.setup.twist.label')} className="flex flex-col gap-1.5">
        <span className="text-[11px] font-neo-display font-black uppercase tracking-wider text-neo-white/70">
          {t('wordcraft.setup.twist.label')}
        </span>
        <div className="grid grid-cols-2 gap-2">
          {twists.map((m) => {
            const isSurprise = m === 'surprise';
            const label = isSurprise ? t('wordcraft.setup.twist.surprise') : t(modifierLabelKey(m));
            const desc = isSurprise ? undefined : t(`wordcraft.modifier.desc.${m}`);
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={choice.modifier === m}
                aria-label={label}
                title={desc}
                onClick={() => setChoice((c) => ({ ...c, modifier: m }))}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-neo border-neo-thick border-black text-start',
                  'transition-colors',
                  choice.modifier === m
                    ? 'bg-neo-purple text-white shadow-hard'
                    : 'bg-neo-navy-light text-neo-white/85 shadow-hard-sm hover:bg-neo-navy-light/70',
                )}
                data-twist={m}
              >
                {isSurprise ? <Sparkles className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden /> : null}
                <span className="flex flex-col min-w-0">
                  <span className="text-xs font-neo-display font-black truncate">{label}</span>
                  {desc ? <span className="text-[10px] font-neo-body opacity-75 truncate">{desc}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Start */}
      <button
        type="button"
        onClick={() => onStart(choice)}
        className={cn(
          'mt-auto h-14 shrink-0 rounded-neo border-neo-thick border-black',
          'bg-neo-lime text-neo-navy font-neo-display font-black text-lg uppercase tracking-wide',
          'shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed hover:-translate-y-0.5 transition-transform',
          'flex items-center justify-center gap-2',
        )}
      >
        <Play className="w-6 h-6" strokeWidth={3} aria-hidden />
        {t('wordcraft.setup.start')}
      </button>
      <p className="text-[11px] text-neo-white/55 font-neo-body text-center pb-[max(4px,env(safe-area-inset-bottom))]">
        {t('wordcraft.setup.challengeHint')}
      </p>
    </div>
  );
}

function OpponentCard({
  selected,
  onSelect,
  icon,
  label,
  desc,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        'flex flex-col items-center gap-1.5 px-3 py-4 rounded-neo border-neo-thick border-black transition-colors',
        selected
          ? 'bg-neo-purple text-white shadow-hard-lg'
          : 'bg-neo-navy-light text-neo-white/85 shadow-hard hover:bg-neo-navy-light/70',
      )}
    >
      {icon}
      <span className="text-sm font-neo-display font-black">{label}</span>
      <span className="text-[10px] font-neo-body opacity-75 text-center">{desc}</span>
    </button>
  );
}

function Pill({ selected, onSelect, label }: { selected: boolean; onSelect: () => void; label: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        'h-10 rounded-neo border-neo-thick border-black font-neo-display font-black text-sm transition-colors',
        selected
          ? 'bg-neo-cyan text-neo-navy shadow-hard'
          : 'bg-neo-navy-light text-neo-white/85 shadow-hard-sm hover:bg-neo-navy-light/70',
      )}
    >
      {label}
    </button>
  );
}
