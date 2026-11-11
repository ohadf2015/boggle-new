'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { Swords, Bell } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { TitleBadge } from '@/components/progression/TitleBadge';
import { RecordHolderCrown } from '@/components/records/RecordHolderCrown';
import { useLanguage } from '@/contexts/LanguageContext';
import posthog from '@/lib/analytics/lazyPosthog';
import type { ResultsMode, RivalSummary } from '@/lib/rivals/types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { RivalPingButton } from './RivalPingButton';

const MODE_ACCENT: Record<ResultsMode, string> = {
  daily: 'border-neo-yellow',
  quickPlay: 'border-neo-cyan',
  multiplayer: 'border-neo-pink',
  blast: 'border-neo-orange',
  tower: 'border-neo-cyan',
  single: 'border-neo-lime',
  edu: 'border-neo-purple',
};

type T = (key: string, params?: Record<string, string | number>) => string;

function headline(rival: RivalSummary, t: T): string {
  const gap = rival.gap;
  if (rival.kind === 'self') {
    return gap != null && gap > 0 ? t('rivals.selfChase', { gap: Math.round(gap) }) : t('rivals.selfBeat');
  }
  if (gap != null && gap > 0) return t('rivals.beatBy', { name: rival.name, gap: Math.round(gap) });
  if (gap != null) return t('rivals.youBeat', { name: rival.name });
  return t('rivals.yourRival', { name: rival.name });
}

function countryName(code: string | undefined, language: string): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(code.toUpperCase()) ?? null;
  } catch {
    return null;
  }
}

function whyLabel(rival: RivalSummary, t: T, language: string): string | null {
  const why = rival.why;
  if (!why) return null;
  if (why.kind === 'sameCountry') {
    const country = countryName(why.country, language);
    return country ? t('rivals.why.sameCountry', { country }) : null;
  }
  if (why.kind === 'playedTogether') return t('rivals.why.playedTogether', { count: why.count ?? 1 });
  return t(`rivals.why.${why.kind}`);
}

export interface RivalCardProps {
  rival: RivalSummary;
  mode: ResultsMode;
  onRematch?: () => void;
}

export function RivalCard({ rival, mode, onRematch }: RivalCardProps) {
  const { t, language } = useLanguage();

  useEffect(() => {
    posthog.capture('rival_card_viewed', { mode, kind: rival.kind, why: rival.why?.kind ?? null });
  }, [mode, rival.kind, rival.why?.kind]);

  const avatarProps = typeof rival.avatar === 'string'
    ? { avatarImage: rival.avatar }
    : { customAvatar: (rival.avatar as CustomAvatarConfig | undefined) ?? undefined };
  const canPing = !!rival.userId && mode !== 'edu';
  const why = whyLabel(rival, t as T, language);
  const name = rival.kind === 'self' ? t('rivals.yourBest') : rival.name;
  const nameEl = <span dir="auto" className="font-black text-neo-white truncate">{name}</span>;

  return (
    <m.section
      data-testid="rival-card"
      initial={{ scale: 0.94, y: 10 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
      className={`flex flex-col gap-2 p-3 rounded-neo border-3 ${MODE_ACCENT[mode]} bg-neo-navy shadow-hard`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden border-2 border-neo-black bg-neo-navy-elevated">
          <Avatar {...avatarProps} userId={rival.userId ?? rival.name} size="lg" className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Swords aria-hidden className="w-4 h-4 shrink-0 text-neo-yellow" />
            {rival.userId ? (
              <Link href={`/${language}/player/${encodeURIComponent(rival.userId)}`} className="min-w-0 truncate hover:underline">
                {nameEl}
              </Link>
            ) : nameEl}
            {rival.userId && <RecordHolderCrown userId={rival.userId} />}
            <TitleBadge title={rival.title} />
          </div>
          <p className="font-neo-display font-black text-base text-neo-yellow leading-tight">{headline(rival, t as T)}</p>
          {why && (
            <span data-testid="rival-why" dir="auto" className="mt-1 inline-block px-2 py-0.5 rounded-full border-2 border-neo-black bg-neo-cyan text-neo-black text-[11px] font-black">
              {why}
            </span>
          )}
        </div>
        {rival.pingedMeAt && (
          <span className="inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full border-2 border-neo-black bg-neo-pink text-neo-black text-[11px] font-black">
            <Bell aria-hidden className="w-3 h-3" />
            {t('rivals.pingedYou')}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {rival.record ? (
          <div data-testid="rival-record" className="flex items-center gap-1 text-xs font-black tabular-nums">
            <span className="px-1.5 py-0.5 rounded-neo bg-neo-lime text-neo-black">{t('rivals.wins', { count: rival.record.wins })}</span>
            <span className="px-1.5 py-0.5 rounded-neo bg-neo-red text-neo-white">{t('rivals.losses', { count: rival.record.losses })}</span>
            {rival.record.draws > 0 && (
              <span className="px-1.5 py-0.5 rounded-neo bg-neo-navy-elevated text-neo-white">{t('rivals.draws', { count: rival.record.draws })}</span>
            )}
          </div>
        ) : <span />}
        <div className="flex items-center gap-2 shrink-0">
          {onRematch && (
            <button
              type="button"
              data-testid="rival-rematch"
              onClick={onRematch}
              className="min-h-11 px-3 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black text-xs font-black uppercase shadow-hard-sm"
            >
              {t('mpUi.results.rematch')}
            </button>
          )}
          {canPing && <RivalPingButton targetUserId={rival.userId!} targetName={rival.name} context={mode} />}
        </div>
      </div>
    </m.section>
  );
}

export default RivalCard;
