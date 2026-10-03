'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { HQ_ACCENT_TEXT, hqModeFacts, type HqMode } from '../hq/hqModes';

export interface PlayNowNextRowProps {
  mode: HqMode | null;
  list: { title: string; count: number } | null;
  expanded: boolean;
  onToggle: () => void;
  panelId: string;
}

export function PlayNowNextRow({ mode, list, expanded, onToggle, panelId }: PlayNowNextRowProps) {
  const { t } = useLanguage();
  const Icon = mode?.icon;
  return (
    <div data-testid="play-now-next" className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="relative flex size-14 shrink-0 items-end justify-center rounded-full bg-neo-white/10 sm:size-16"
      >
        {mode ? (
          <>
            <Image
              src={hqModeFacts(mode.id).poster}
              alt=""
              width={96}
              height={96}
              className="absolute -inset-x-1 -top-2 bottom-0 size-[calc(100%+0.5rem)] select-none object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,0.55)]"
            />
            {Icon ? (
              <span
                className={cn(
                  'absolute -bottom-1 -end-1 flex size-6 items-center justify-center rounded-full border-2 border-neo-cream/60 bg-neo-navy-light',
                  HQ_ACCENT_TEXT[mode.accent],
                )}
              >
                <Icon className="size-3.5" strokeWidth={3} />
              </span>
            ) : null}
          </>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          data-testid="play-now-next-mode"
          className={cn(
            'truncate font-neo-display text-lg font-black uppercase leading-tight tracking-wide sm:text-xl',
            mode ? HQ_ACCENT_TEXT[mode.accent] : 'text-neo-white/40',
          )}
        >
          {mode ? t(mode.labelKey, mode.labelFallback) : ' '}
        </span>
        {list ? (
          <span data-testid="play-now-next-list" className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 font-neo-body text-sm font-bold text-neo-white/75">
            <bdi className="min-w-0 truncate">{list.title}</bdi>
            <span className="shrink-0 text-neo-white/50">·</span>
            <span className="shrink-0 tabular-nums text-neo-white/60">{t('teacher.lesson.words', { count: list.count })}</span>
          </span>
        ) : (
          <span aria-hidden="true" className="block h-4 w-32 animate-pulse rounded bg-neo-white/10 motion-reduce:animate-none" />
        )}
      </span>
      <button
        type="button"
        data-testid="play-now-change"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-neo px-2.5 font-neo-body text-sm font-bold text-neo-cyan underline decoration-1 underline-offset-4 transition-colors hover:text-neo-white focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
      >
        {expanded ? t('hqCalm.done') : t('hqCalm.change')}
        <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
  );
}

export default PlayNowNextRow;
