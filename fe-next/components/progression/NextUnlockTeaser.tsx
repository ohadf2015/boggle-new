'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { RARITY_TOKENS } from '@/lib/avatar/rarity';
import { revealPartNameKey } from '@/lib/avatar/revealTrigger';
import { getPendingLevelUp, subscribeLevelUp } from '@/lib/levelUp/levelUpBus';
import type { ResultsMode } from '@/lib/rivals/types';
import { LockedUnlockThumb } from './LockedUnlockThumb';
import { RarityChip } from './RarityChip';
import { XpMomentMeter } from './XpMomentMeter';
import { buildNextUnlockTeaser } from './nextUnlockModel';
import { buildXpMoment } from './xpMomentModel';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

/** XP this game earned; `total` is the server's new total XP when the response carried it. */
export interface ResultsXp {
  gained: number;
  total?: number | null;
}

export interface NextUnlockTeaserProps {
  mode?: ResultsMode;
  xp?: ResultsXp | null;
}

const none = () => null;

/**
 * Refresh the profile once per earned game so header rings catch up. Without a server total the
 * profile is the only source and may predate this game, so it is trusted only after that refresh.
 */
function useTrustedTotal(xp: ResultsXp | null | undefined, signedIn: boolean): number | null {
  const { profile, refreshProfile } = useAuth();
  const [refreshed, setRefreshed] = useState(false);
  const started = useRef(false);
  const earned = signedIn && !!xp && xp.gained > 0;
  const needsRefresh = earned && xp?.total == null;

  useEffect(() => {
    if (!earned || started.current) return;
    started.current = true;
    Promise.resolve(refreshProfile?.())
      .catch(() => undefined)
      .finally(() => setRefreshed(true));
  }, [earned, refreshProfile]);

  if (xp?.total != null) return xp.total;
  if (needsRefresh && refreshed) return profile?.total_xp ?? null;
  return null;
}

export function NextUnlockTeaser({ mode, xp }: NextUnlockTeaserProps = {}) {
  const { user, profile, loading } = useAuth();
  const { t, language } = useLanguage();
  const [authOpen, setAuthOpen] = useState(false);
  const levelUp = useSyncExternalStore(subscribeLevelUp, getPendingLevelUp, none);
  const signedIn = !loading && !!user;
  const trustedTotal = useTrustedTotal(xp, signedIn);

  if (mode === 'edu') return null;

  const gained = Math.max(0, xp?.gained ?? 0);
  let body: ReactNode = null;
  if (!loading && !user) {
    const xpText = gained.toLocaleString(language);
    body = (
      <>
        {gained > 0 && (
          <XpMomentMeter moment={buildXpMoment(gained, gained)} saved={false} />
        )}
        <button
          type="button"
          data-testid="next-unlock-guest"
          onClick={() => setAuthOpen(true)}
          className="flex w-full items-center gap-2 rounded-neo border-2 border-neo-black bg-neo-navy-light px-3 py-2 text-start text-sm font-bold text-neo-white shadow-hard-sm hover:-translate-y-px active:translate-y-px"
        >
          <LogIn className="h-4 w-4 shrink-0 text-neo-lime rtl:rotate-180" aria-hidden="true" />
          {gained > 0 ? t('progression.xp.signInToKeep', { xp: xpText }) : t('progression.unlock.signInToUnlock')}
        </button>
        {authOpen && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" />}
      </>
    );
  } else if (!loading && profile) {
    const total = trustedTotal ?? profile.total_xp ?? 0;
    const moment = gained > 0 && trustedTotal != null ? buildXpMoment(gained, trustedTotal) : null;
    const model = buildNextUnlockTeaser(total, levelUp?.newLevel);
    const hex = model ? RARITY_TOKENS[model.next.rarity].hex : null;
    body = (
      <>
        {moment && <XpMomentMeter moment={moment} />}
        {model && hex && (
          <div
            data-testid="next-unlock-teaser"
            className="flex items-center gap-3 rounded-neo border-2 border-neo-black bg-neo-navy-light px-3 py-2 shadow-hard-sm"
          >
            <LockedUnlockThumb unlock={model.next} config={profile.avatar_config} size={40} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-xs font-black text-neo-white">
                <span>{t('progression.unlock.levelPath', { from: model.level, to: model.next.level })}</span>
                <RarityChip rarity={model.next.rarity} size="xs" />
              </p>
              <p className="truncate text-[11px] font-bold text-neo-cream/70">
                {t('progression.unlock.unlocksItem', { item: t(revealPartNameKey(model.next)) })}
              </p>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={model.pct}
                aria-label={t('progression.unlock.xpToGo', { xp: model.xpToGo.toLocaleString(language) })}
                className="mt-1 h-2 overflow-hidden rounded-full border border-neo-black bg-neo-black/40"
              >
                <div className="h-full rounded-full" style={{ width: `${model.pct}%`, background: hex }} />
              </div>
              <p className="mt-0.5 text-[10px] font-bold text-neo-cream/60">
                <bdi>{t('progression.unlock.xpToGo', { xp: model.xpToGo.toLocaleString(language) })}</bdi>
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return body;
}

export default NextUnlockTeaser;
