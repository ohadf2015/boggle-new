'use client';

import React, { useState } from 'react';
import { Languages, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  SUPPORTED_LANGUAGES,
  MAX_CURATOR_TIER,
} from '@/lib/curator/curatorScope';
import type { CuratorAssignmentRow } from './playerManagerTypes';
import { CuratorTierBadge } from './CuratorTierBadge';

interface PlayerCuratorControlProps {
  isAdmin?: boolean;
  assignments: CuratorAssignmentRow[];
  /** Grant/raise an assignment for a language. */
  onAssign: (language: string, tier: number) => void;
  /** Revoke the assignment for a language. */
  onRevoke: (language: string) => void;
  /** `${language}` currently mutating (disables that row), or 'new' while assigning. */
  busyKey: string | null;
}

/**
 * Inline "native-speaker / Language Curator" management for one player row.
 *
 * Replaces the copy-paste-a-UUID friction of the standalone /admin/curators
 * form: the admin assigns straight from the player they're looking at, sees the
 * player's CURRENT curator languages (with tier badges), and can revoke in one
 * tap. Posts go through the existing POST /api/admin/curators (handlers passed
 * down from PlayerManager), so the assign also fires the curator-assigned
 * notification for free.
 */
export function PlayerCuratorControl({
  isAdmin,
  assignments,
  onAssign,
  onRevoke,
  busyKey,
}: PlayerCuratorControlProps) {
  const { t } = useLanguage();
  const [adding, setAdding] = useState(false);

  // Default the language picker to the first language not yet curated.
  const assignedLangs = new Set(assignments.map((a) => a.language));
  const firstFree = SUPPORTED_LANGUAGES.find((l) => !assignedLangs.has(l)) ?? SUPPORTED_LANGUAGES[0];
  const [language, setLanguage] = useState<string>(firstFree);
  const [tier, setTier] = useState(1);

  const fieldClass =
    'rounded-neo border-neo border-black bg-white dark:bg-neo-navy px-2 py-1 text-xs text-black dark:text-neo-white';

  return (
    <div className="flex w-full flex-col items-start gap-1.5 sm:items-end">
      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-neo-lime">
        <Languages className="h-3.5 w-3.5" />
        {t('curator.assignInline.heading')}
      </div>

      {/* Admins are curators everywhere — say so instead of offering an assign. */}
      {isAdmin ? (
        <span className="text-[11px] text-slate-500">{t('curator.levels.admin.scope')}</span>
      ) : (
        <>
          {/* Current curator languages */}
          {assignments.length > 0 ? (
            <ul className="flex flex-wrap justify-end gap-1">
              {assignments.map((a) => (
                <li key={a.language} className="inline-flex items-center gap-1">
                  <span className="text-[10px] uppercase text-slate-400">{a.language}</span>
                  <CuratorTierBadge tier={a.trust_tier} showLabel={false} />
                  <button
                    type="button"
                    aria-label={`${t('curator.assignInline.revoke')} ${a.language}`}
                    onClick={() => onRevoke(a.language)}
                    disabled={busyKey === a.language}
                    className="rounded-full p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-900/30"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-[11px] text-slate-400">{t('curator.assignInline.none')}</span>
          )}

          {/* Assign form */}
          {adding ? (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <select
                aria-label={t('curator.assignInline.languageLabel')}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={fieldClass}
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <select
                aria-label={t('curator.assignInline.tierLabel')}
                value={tier}
                onChange={(e) => setTier(Number(e.target.value))}
                className={fieldClass}
              >
                {Array.from({ length: MAX_CURATOR_TIER }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{t('curator.assignInline.tierLabel')} {n}</option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={() => onAssign(language, tier)}
                disabled={busyKey === 'new' || busyKey === language}
                className="h-7 bg-neo-lime px-2 text-xs text-black hover:bg-neo-lime/90"
              >
                {t('curator.assignInline.assign')}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAdding(false)}>
                {t('curator.assignInline.cancel')}
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdding(true)}
              className="h-7 border-emerald-300 px-2 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-neo-lime/40 dark:text-neo-lime dark:hover:bg-neo-lime/10"
            >
              <Languages className="me-1 h-3.5 w-3.5" />
              {t('curator.assignInline.make')}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
