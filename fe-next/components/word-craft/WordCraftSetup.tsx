'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Bot, Play, Send, Sparkles, Users } from 'lucide-react';
import { BOT_DIFFICULTIES } from '@/lib/word-craft/botDifficulty';
import { WORDCRAFT_MODIFIERS, modifierLabelKey, type WordCraftModifier } from '@/lib/word-craft/modifiers';
import type { WordCraftSetupChoice } from '@/lib/word-craft/setupPrefs';
import { cn } from '@/lib/utils';
import { readDaily, todayUtc, type DailyState } from '@/lib/word-craft/daily';

/**
 * Handle radiogroup keyboard navigation per WAI-ARIA 1.2.
 * Arrow keys (Right/Down advance, Left/Up go back) cycle through children.
 */
function handleRadiogroupKeyDown<T>(
  event: React.KeyboardEvent,
  currentValue: T,
  options: readonly T[],
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
  /** One-tap start of today's shared board vs the bot. */
  onStartDaily?: () => void;
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
export function WordCraftSetup({ initial, onStart, onStartDaily, t }: WordCraftSetupProps) {
  const [choice, setChoice] = useState<WordCraftSetupChoice>(initial);
  // localStorage resolves after mount; render nothing until then so SSR and first paint agree.
  const [daily, setDaily] = useState<DailyState | null>(null);
  const [playedToday, setPlayedToday] = useState(false);
  useEffect(() => {
    const today = todayUtc();
    const d = readDaily(today);
    setDaily(d);
    setPlayedToday(d.lastDate === today);
  }, []);
  const setOpponent = useCallback((opponent: WordCraftSetupChoice['opponent']) => {
    setChoice((c) => ({
      ...c,
      opponent,
      // Solo vs Rival always starts on easy; friend/hotseat keep the current tune.
      difficulty: opponent === 'bot' ? 'easy' : c.difficulty,
    }));
  }, []);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const twists: Array<WordCraftModifier | 'surprise'> = [
    'surprise',
    ...WORDCRAFT_MODIFIERS.filter((m) => m !== 'none'),
  ];
  // Solo vs Rival shortcut: selecting the bot defaults to easy and hides the
  // advanced tuning (difficulty + twist) for a one-tap start. Hotseat has no
  // bot to tune; friend (async duel vs bot) keeps the full tuning surface.
  const isSoloRival = choice.opponent === 'bot';
  const showDifficulty = choice.opponent === 'friend';
  const showAdvancedOptions = !isSoloRival;

  return (
    <div
      className={cn(
        'flex-1 min-h-0 w-full max-w-md mx-auto px-4 py-3 [@media(min-height:760px)]:py-5 flex flex-col gap-4 [@media(min-height:760px)]:gap-6 [@media(min-height:760px)]:overflow-visible overflow-y-auto',
      )}
    >
      <div className="text-center shrink-0 space-y-1">
        <h2 className="text-xl [@media(min-height:700px)]:text-2xl font-neo-display font-black text-neo-white leading-tight">
          {t('wordcraft.setup.title')}
        </h2>
        <p className="text-sm [@media(min-height:700px)]:text-base text-neo-white/60 font-neo-body">
          {t('wordcraft.setup.tagline', 'Place words. Claim territory. Outsmart the bot.')}
        </p>
      </div>

      {onStartDaily && daily ? (
        <button
          type="button"
          onClick={onStartDaily}
          data-wc-daily
          className="wc-rise shrink-0 flex items-center gap-3 px-3 py-2 rounded-neo border-neo-thick border-black bg-neo-yellow text-neo-navy shadow-hard-lg text-start active:translate-y-0.5 active:shadow-hard-pressed transition-transform"
        >
          <Image src="/word-craft/calendar.webp" alt="" width={338} height={384} className="h-11 w-auto" />
          <span className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-neo-display font-black uppercase tracking-wide leading-tight">{t('wordcraft.daily.title')}</span>
            <span className="text-[11px] font-neo-body font-bold opacity-80 truncate">
              {playedToday ? t('wordcraft.daily.done') : t('wordcraft.daily.play')}
            </span>
          </span>
          {daily.streak > 0 ? (
            <span className="flex items-center gap-1 shrink-0">
              <Image src="/word-craft/flame.webp" alt="" width={302} height={384} className="h-8 w-auto wc-flicker" />
              <span className="text-lg font-neo-display font-black leading-none" aria-label={t('wordcraft.daily.streak', { n: daily.streak })}>{daily.streak}</span>
            </span>
          ) : null}
        </button>
      ) : null}

      <div className="flex-1 min-h-0 flex items-center justify-center [@media(max-height:640px)]:hidden" aria-hidden>
        <Image
          src="/word-craft/flag.webp"
          alt=""
          width={282}
          height={512}
          priority
          className="wc-float h-52 w-auto object-contain drop-shadow-[0_6px_0_rgba(0,0,0,0.6)]"
        />
      </div>

      {/* Opponent */}
      <div
        role="radiogroup"
        aria-label={t('wordcraft.setup.opponent.label')}
        className="grid grid-cols-3 gap-2.5 shrink-0"
        onKeyDown={(e) => handleRadiogroupKeyDown(e, choice.opponent, ['bot', 'hotseat', 'friend'] as const, (opponent) => setOpponent(opponent))}
      >
        <OpponentCard
          selected={choice.opponent === 'bot'}
          onSelect={() => setOpponent('bot')}
          icon={<Bot className="w-5 h-5 [@media(min-height:700px)]:w-6 [@media(min-height:700px)]:h-6" strokeWidth={2.5} />}
          label={t('wordcraft.setup.opponent.bot')}
          desc={t('wordcraft.setup.opponent.botDesc')}
        />
        <OpponentCard
          selected={choice.opponent === 'hotseat'}
          onSelect={() => setOpponent('hotseat')}
          icon={<Users className="w-5 h-5 [@media(min-height:700px)]:w-6 [@media(min-height:700px)]:h-6" strokeWidth={2.5} />}
          label={t('wordcraft.setup.opponent.hotseat')}
          desc={t('wordcraft.setup.opponent.hotseatDesc')}
        />
        <OpponentCard
          selected={choice.opponent === 'friend'}
          onSelect={() => setOpponent('friend')}
          icon={<Send className="w-5 h-5 [@media(min-height:700px)]:w-6 [@media(min-height:700px)]:h-6" strokeWidth={2.5} />}
          label={t('wordcraft.setup.opponent.friend')}
          desc={t('wordcraft.setup.opponent.friendDesc')}
        />
      </div>

      {/* Advanced options — collapsed behind the disclosure, and not rendered at
          all in the Solo vs Rival shortcut. Unmounted rather than hidden there:
          a `hidden` class still leaves the radiogroups in the accessibility tree
          and reachable, which is not what "one-tap start" means. */}
      {showAdvancedOptions ? (
      <div className={cn('flex flex-col gap-3 shrink-0', !showAdvanced && 'hidden')}>
        {/* Bot difficulty — only for friend duels where the bot tuning matters */}
        {showDifficulty ? (
          <div
            role="radiogroup"
            aria-label={t('wordcraft.setup.difficulty.label')}
            className="flex flex-col gap-1.5"
            onKeyDown={(e) => handleRadiogroupKeyDown(e, choice.difficulty, BOT_DIFFICULTIES, (difficulty) => setChoice((c) => ({ ...c, difficulty })))}
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

        <div
          role="radiogroup"
          aria-label={t('wordcraft.setup.twist.label')}
          className="flex flex-col gap-1.5"
          onKeyDown={(e) => handleRadiogroupKeyDown(e, choice.modifier, twists, (modifier) => setChoice((c) => ({ ...c, modifier })))}
        >
          <span className="text-[11px] font-neo-display font-black uppercase tracking-wider text-neo-white/70">
            {t('wordcraft.setup.twist.label')}
          </span>
          <div className="grid grid-cols-2 gap-1.5 [@media(min-height:700px)]:gap-2">
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
                    {desc ? (
                      <span className="text-[10px] font-neo-body opacity-75 truncate">
                        {desc}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      ) : null}

      {/* Solo vs Rival is meant to be one tap, so the disclosure itself goes
          away there rather than offering a panel with nothing worth tuning. */}
      {showAdvancedOptions ? (
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="text-xs text-neo-white/50 font-neo-body underline decoration-dotted underline-offset-4 self-center shrink-0 hover:text-neo-white/75"
        >
          {showAdvanced ? t('wordcraft.setup.hideAdvanced', 'Hide advanced') : t('wordcraft.setup.showAdvanced', 'Advanced options')}
        </button>
      ) : null}

      {/* Start */}
      <button
        type="button"
        onClick={() => onStart(choice)}
        className={cn(
          'mt-auto h-14 [@media(min-height:700px)]:h-16 shrink-0 rounded-neo border-neo-thick border-black',
          'bg-neo-lime text-neo-navy font-neo-display font-black text-xl uppercase tracking-wide',
          'shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed hover:-translate-y-0.5 transition-transform',
          'flex items-center justify-center gap-2',
        )}
      >
        <Play className="w-7 h-7" strokeWidth={3} aria-hidden />
        {t('wordcraft.setup.start')}
      </button>
      <p className="text-[11px] text-neo-white/55 font-neo-body text-center shrink-0 pb-[max(4px,env(safe-area-inset-bottom))]">
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
