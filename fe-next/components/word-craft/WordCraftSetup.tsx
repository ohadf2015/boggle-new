'use client';

import { useState } from 'react';
import { Bot, Play, Send, Sparkles, Users } from 'lucide-react';
import { BOT_DIFFICULTIES } from '@/lib/word-craft/botDifficulty';
import { WORDCRAFT_MODIFIERS, modifierLabelKey, type WordCraftModifier } from '@/lib/word-craft/modifiers';
import type { WordCraftSetupChoice } from '@/lib/word-craft/setupPrefs';
import { cn } from '@/lib/utils';

/**
 * Handle radiogroup keyboard navigation per WAI-ARIA 1.2.
 * Arrow keys (Right/Down advance, Left/Up go back) cycle through children.
 */
function handleRadiogroupKeyDown<T>(
  event: React.KeyboardEvent,
  currentValue: T,
  options: T[],
  onSelect: (value: T) => void
) {
  if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;

  event.preventDefault();
  const currentIndex = options.indexOf(currentValue);
  if (currentIndex === -1) return;

  let nextIndex = currentIndex;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    nextIndex = (currentIndex + 1) % options.length;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + options.length) % options.length;
  }

  onSelect(options[nextIndex]);
}

type TFn = (path: string, fallback?: string) => string;

export interface WordCraftSetupProps {
  initial: WordCraftSetupChoice;
  onStart: (choice: WordCraftSetupChoice) => void;
  t: TFn;
}

/**
 * Pre-game setup screen: opponent (bot / pass-and-play / remote friend
 * challenge), bot difficulty, and the game "twist" (modifier).
 *
 * NO-SCROLL CONTRACT: the whole screen must fit the small viewport —
 * compact paddings, and the secondary description lines drop out on short
 * viewports via max-height media variants instead of ever scrolling.
 * `overflow-y-auto` stays only as a failsafe for extreme (<520px) heights.
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
  // Hotseat has no bot to tune; bot + friend (async duel vs bot) both do.
  const showDifficulty = choice.opponent !== 'hotseat';

  return (
    <div
      className={cn(
        'flex-1 min-h-0 w-full max-w-md mx-auto px-4 py-2 flex flex-col gap-2.5 [@media(min-height:760px)]:gap-4 overflow-y-auto',
        // Landscape phones (~360px tall): two-column grid — opponent +
        // difficulty left, twists right, START across the bottom. Wider box,
        // title dropped (the page keeps its sr-only h1).
        '[@media(max-height:520px)]:grid [@media(max-height:520px)]:grid-cols-2 [@media(max-height:520px)]:content-start [@media(max-height:520px)]:max-w-2xl [@media(max-height:520px)]:gap-2',
      )}
    >
      <h2 className="text-lg [@media(min-height:700px)]:text-xl font-neo-display font-black text-neo-white text-center shrink-0 [@media(max-height:520px)]:hidden">
        {t('wordcraft.setup.title')}
      </h2>

      {/* Opponent */}
      <div
        role="radiogroup"
        aria-label={t('wordcraft.setup.opponent.label')}
        className="grid grid-cols-3 gap-2 shrink-0 [@media(max-height:520px)]:col-start-1 [@media(max-height:520px)]:row-start-1"
        onKeyDown={(e) => handleRadiogroupKeyDown(e, choice.opponent, ['bot', 'hotseat', 'friend'] as const, (opponent) => setChoice((c) => ({ ...c, opponent })))}
      >
        <OpponentCard
          selected={choice.opponent === 'bot'}
          onSelect={() => setChoice((c) => ({ ...c, opponent: 'bot' }))}
          icon={<Bot className="w-5 h-5 [@media(min-height:700px)]:w-6 [@media(min-height:700px)]:h-6" strokeWidth={2.5} />}
          label={t('wordcraft.setup.opponent.bot')}
          desc={t('wordcraft.setup.opponent.botDesc')}
        />
        <OpponentCard
          selected={choice.opponent === 'hotseat'}
          onSelect={() => setChoice((c) => ({ ...c, opponent: 'hotseat' }))}
          icon={<Users className="w-5 h-5 [@media(min-height:700px)]:w-6 [@media(min-height:700px)]:h-6" strokeWidth={2.5} />}
          label={t('wordcraft.setup.opponent.hotseat')}
          desc={t('wordcraft.setup.opponent.hotseatDesc')}
        />
        <OpponentCard
          selected={choice.opponent === 'friend'}
          onSelect={() => setChoice((c) => ({ ...c, opponent: 'friend' }))}
          icon={<Send className="w-5 h-5 [@media(min-height:700px)]:w-6 [@media(min-height:700px)]:h-6" strokeWidth={2.5} />}
          label={t('wordcraft.setup.opponent.friend')}
          desc={t('wordcraft.setup.opponent.friendDesc')}
        />
      </div>

      {/* Bot difficulty — only when there is a bot to tune */}
      {showDifficulty ? (
        <div
          role="radiogroup"
          aria-label={t('wordcraft.setup.difficulty.label')}
          className="flex flex-col gap-1 shrink-0 [@media(max-height:520px)]:col-start-1 [@media(max-height:520px)]:row-start-2"
          onKeyDown={(e) => handleRadiogroupKeyDown(e, choice.difficulty, BOT_DIFFICULTIES, (difficulty) => setChoice((c) => ({ ...c, difficulty })))}
        >
          <span className="text-[11px] font-neo-display font-black uppercase tracking-wider text-neo-white/70 [@media(max-height:520px)]:hidden">
            {t('wordcraft.setup.difficulty.label')}
          </span>
          <div className="grid grid-cols-3 gap-2 [@media(max-height:520px)]:gap-1.5">
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
      <div
        role="radiogroup"
        aria-label={t('wordcraft.setup.twist.label')}
        className="flex flex-col gap-1 shrink-0 [@media(max-height:520px)]:col-start-2 [@media(max-height:520px)]:row-start-1 [@media(max-height:520px)]:row-span-2"
        onKeyDown={(e) => handleRadiogroupKeyDown(e, choice.modifier, twists, (modifier) => setChoice((c) => ({ ...c, modifier })))}
      >
        <span className="text-[11px] font-neo-display font-black uppercase tracking-wider text-neo-white/70 [@media(max-height:520px)]:hidden">
          {t('wordcraft.setup.twist.label')}
        </span>
        <div className="grid grid-cols-2 gap-1.5 [@media(min-height:700px)]:gap-2 [@media(max-height:520px)]:grid-cols-3 [@media(max-height:520px)]:gap-1">
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
                  'flex items-center gap-2 px-3 py-1.5 [@media(min-height:700px)]:py-2 [@media(max-height:520px)]:py-1 rounded-neo border-neo-thick border-black text-start',
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
                  {desc ? (
                    <span className="hidden [@media(min-height:640px)]:block text-[10px] font-neo-body opacity-75 truncate">
                      {desc}
                    </span>
                  ) : null}
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
          'mt-auto h-12 [@media(min-height:700px)]:h-14 shrink-0 rounded-neo border-neo-thick border-black',
          '[@media(max-height:520px)]:col-span-2 [@media(max-height:520px)]:h-10 [@media(max-height:520px)]:mt-0',
          'bg-neo-lime text-neo-navy font-neo-display font-black text-lg uppercase tracking-wide',
          'shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed hover:-translate-y-0.5 transition-transform',
          'flex items-center justify-center gap-2',
        )}
      >
        <Play className="w-6 h-6" strokeWidth={3} aria-hidden />
        {t('wordcraft.setup.start')}
      </button>
      <p className="hidden [@media(min-height:700px)]:block text-[11px] text-neo-white/55 font-neo-body text-center shrink-0 pb-[max(4px,env(safe-area-inset-bottom))]">
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
        'flex flex-col items-center gap-1 px-2 py-2.5 [@media(min-height:700px)]:py-3.5 rounded-neo border-neo-thick border-black transition-colors min-w-0',
        // Landscape: icon+label in one slim row — no vertical stack to burn height.
        '[@media(max-height:520px)]:flex-row [@media(max-height:520px)]:justify-center [@media(max-height:520px)]:gap-1.5 [@media(max-height:520px)]:py-1.5',
        selected
          ? 'bg-neo-purple text-white shadow-hard-lg'
          : 'bg-neo-navy-light text-neo-white/85 shadow-hard hover:bg-neo-navy-light/70',
      )}
    >
      {icon}
      <span className="text-[11px] [@media(min-height:700px)]:text-xs font-neo-display font-black leading-tight text-center [@media(max-height:520px)]:truncate">
        {label}
      </span>
      <span className="hidden [@media(min-height:640px)]:block text-[9px] [@media(min-height:700px)]:text-[10px] font-neo-body opacity-75 text-center leading-tight">
        {desc}
      </span>
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
        'h-9 [@media(min-height:700px)]:h-10 [@media(max-height:520px)]:h-8 rounded-neo border-neo-thick border-black font-neo-display font-black text-sm transition-colors',
        selected
          ? 'bg-neo-cyan text-neo-navy shadow-hard'
          : 'bg-neo-navy-light text-neo-white/85 shadow-hard-sm hover:bg-neo-navy-light/70',
      )}
    >
      {label}
    </button>
  );
}
