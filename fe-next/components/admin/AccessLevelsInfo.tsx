'use client';

import React, { useState } from 'react';
import { ChevronDown, Shield, GraduationCap, Languages, Trophy, Coins } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CURATOR_TIER_CAPABILITIES,
  CURATOR_RANKS,
  CURATOR_COIN_MILESTONES,
} from '@/lib/curator/curatorScope';
import { CuratorTierBadge } from './CuratorTierBadge';

/**
 * Explains what each access level grants. Deliberately framed as THREE
 * INDEPENDENT ROLES (admin / teacher / curator), not a single ladder — a user
 * can hold any combination, and an admin who reads it as a hierarchy would
 * mis-assign. Curator power (capability tier) and curator rewards (prestige)
 * are shown as separate sections because they are separate axes.
 *
 * All capability/reward data is pulled from lib/curator/curatorScope so the
 * explanation always matches what the server actually enforces and awards.
 *
 * Collapsible: starts closed so it never clutters the dense players list.
 */
export function AccessLevelsInfo({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(defaultOpen);

  const axes = [
    { key: 'admin', Icon: Shield, accent: 'text-neo-pink' },
    { key: 'teacher', Icon: GraduationCap, accent: 'text-neo-cyan' },
    { key: 'curator', Icon: Languages, accent: 'text-neo-lime' },
  ] as const;

  return (
    <div className="rounded-neo border-neo border-black bg-neo-navy-light text-neo-white shadow-hard-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start font-neo-display"
      >
        <span>{t('curator.levels.toggle')}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-5 px-4 pb-4">
          <p className="font-neo-body text-sm text-neo-cream">{t('curator.levels.subtitle')}</p>

          {/* Three orthogonal roles */}
          <div className="grid gap-3 sm:grid-cols-3">
            {axes.map(({ key, Icon, accent }) => (
              <div key={key} className="rounded-neo border-neo border-black bg-neo-navy p-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${accent}`} />
                  <h4 className="font-neo-display text-neo-white">{t(`curator.levels.${key}.title`)}</h4>
                </div>
                <span className="mt-1 inline-block rounded-full border-neo border-black bg-neo-navy-light px-2 py-0.5 text-[10px] uppercase tracking-wide text-neo-cream">
                  {t(`curator.levels.${key}.scope`)}
                </span>
                <p className="mt-2 font-neo-body text-xs leading-relaxed text-neo-cream">
                  {t(`curator.levels.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>

          {/* Curator capability tiers (power) */}
          <div>
            <h4 className="mb-2 font-neo-display text-sm text-neo-lime">
              {t('curator.levels.capabilityHeading')}
            </h4>
            <ul className="flex flex-col gap-2">
              {CURATOR_TIER_CAPABILITIES.map((cap) => (
                <li key={cap.tier} className="flex items-start gap-3 rounded-neo border-neo border-black bg-neo-navy p-2">
                  <CuratorTierBadge tier={cap.tier} />
                  <p className="font-neo-body text-xs leading-relaxed text-neo-cream">
                    {t(`curator.tier.${cap.tier}.desc`)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Curator prestige rewards (earned, cosmetic) */}
          <div>
            <h4 className="mb-1 font-neo-display text-sm text-neo-yellow">
              {t('curator.levels.rewardsHeading')}
            </h4>
            <p className="mb-2 font-neo-body text-xs text-neo-cream">{t('curator.levels.rewardsDesc')}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-neo border-neo border-black bg-neo-navy p-2">
                <div className="mb-1 flex items-center gap-1.5 font-neo-display text-xs text-neo-white">
                  <Trophy className="h-4 w-4 text-neo-yellow" />
                  {t('curator.levels.ranksLabel')}
                </div>
                <ul className="font-neo-body text-xs text-neo-cream">
                  {CURATOR_RANKS.map((r) => (
                    <li key={r.key} className="flex justify-between gap-2 py-0.5">
                      <span>{t(r.titleKey)}</span>
                      <span className="font-mono text-neo-cream/70">{r.minPoints}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-neo border-neo border-black bg-neo-navy p-2">
                <div className="mb-1 flex items-center gap-1.5 font-neo-display text-xs text-neo-white">
                  <Coins className="h-4 w-4 text-neo-yellow" />
                  {t('curator.levels.coinsLabel')}
                </div>
                <ul className="font-neo-body text-xs text-neo-cream">
                  {CURATOR_COIN_MILESTONES.map((m) => (
                    <li key={m.points} className="py-0.5">
                      {t('curator.levels.coinMilestone', { points: m.points, coins: m.coins })}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <p className="rounded-neo border-neo border-black bg-neo-navy p-2 font-neo-body text-xs italic text-neo-cream">
            {t('curator.levels.note')}
          </p>
        </div>
      )}
    </div>
  );
}
