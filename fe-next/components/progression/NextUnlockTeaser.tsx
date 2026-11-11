'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { RARITY_TOKENS } from '@/lib/avatar/rarity';
import { revealPartNameKey } from '@/lib/avatar/revealTrigger';
import { getPendingLevelUp, subscribeLevelUp } from '@/lib/levelUp/levelUpBus';
import type { ResultsMode } from '@/lib/rivals/types';
import { LevelUpWatcher } from './LevelUpWatcher';
import { LockedUnlockThumb } from './LockedUnlockThumb';
import { RarityChip } from './RarityChip';
import { buildNextUnlockTeaser } from './nextUnlockModel';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

export interface NextUnlockTeaserProps {
  mode?: ResultsMode;
}

const none = () => null;

export function NextUnlockTeaser({ mode }: NextUnlockTeaserProps = {}) {
  const { user, profile, loading } = useAuth();
  const { t, language } = useLanguage();
  const [authOpen, setAuthOpen] = useState(false);
  const levelUp = useSyncExternalStore(subscribeLevelUp, getPendingLevelUp, none);

  if (mode === 'edu') return null;

  let body: ReactNode = null;
  if (!loading && !user) {
    body = (
      <>
        <button
          type="button"
          data-testid="next-unlock-guest"
          onClick={() => setAuthOpen(true)}
          className="flex w-full items-center gap-2 rounded-neo border-2 border-neo-black bg-neo-navy-light px-3 py-2 text-start text-sm font-bold text-neo-white shadow-hard-sm hover:-translate-y-px active:translate-y-px"
        >
          <LogIn className="h-4 w-4 shrink-0 text-neo-lime rtl:rotate-180" aria-hidden="true" />
          {t('progression.unlock.signInToUnlock')}
        </button>
        {authOpen && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" />}
      </>
    );
  } else if (!loading && profile) {
    const model = buildNextUnlockTeaser(profile.total_xp ?? 0, levelUp?.newLevel);
    if (model) {
      const hex = RARITY_TOKENS[model.next.rarity].hex;
      body = (
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
          </div>
        </div>
      );
    }
  }

  return (
    <>
      {body}
      <LevelUpWatcher />
    </>
  );
}

export default NextUnlockTeaser;
