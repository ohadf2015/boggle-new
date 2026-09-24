'use client';

/**
 * Shown over the stage while a LOCKED part is tried on: what it is (rarity),
 * how to get it (play to Lv N / buy with gold), and a way to take it off.
 * Replaces the old full-screen purchase confirmation — the avatar wearing the
 * part IS the preview, so the decision happens in context.
 */
import { Coins, Lock, X } from 'lucide-react';
import { RARITY_TOKENS } from '@/lib/avatar/rarity';
import { getSetProgress, getSetsForPart } from '@/lib/avatar/avatarSets';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import type { PartLockInfo, LockPremium } from './partLock';

type T = (key: string, a?: string | Record<string, string | number>, b?: Record<string, string | number>) => string;

interface UnlockPanelProps {
  rarityCategory: string;
  partId: string;
  categoryLabel: string;
  info: PartLockInfo;
  premium: LockPremium & { isPurchasing?: boolean };
  ownedKeys: readonly string[];
  onBuy: () => void;
  onTakeOff: () => void;
  t: T;
  language: string;
}

export default function UnlockPanel({
  rarityCategory,
  partId,
  categoryLabel,
  info,
  premium,
  ownedKeys,
  onBuy,
  onTakeOff,
  t,
  language,
}: UnlockPanelProps) {
  const tok = RARITY_TOKENS[info.rarity];
  const fancy = info.rarity === 'epic' || info.rarity === 'legendary';
  const set = getSetsForPart(rarityCategory, partId)[0];
  const setProg = set
    ? getSetProgress(set, [
        // Same predicate as the grid (bought, legacy-mapped or level-granted), so the
        // set count can never disagree with what the player can already wear.
        ...set.parts.filter(k => ownedKeys.includes(k) || premium.isPartUnlocked(k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1))),
        `${rarityCategory}:${partId}`,
      ])
    : null;
  const canBuy = info.price > 0 && info.affordable && !premium.isPurchasing;

  const levelPath = info.path === 'level' && info.unlockLevel != null;
  const hint = !info.affordable && info.price > 0
    ? t('avatarBuilder.editor.needMoreGold', { amount: safeToLocaleString(info.goldShort, language) })
    : levelPath && info.price > 0
      ? t('avatarBuilder.editor.orKeepPlaying')
      : null;

  // Compact two-column strip (≈72px) between the grid and the action bar:
  // what it is + how to get it on the start side, the buy button on the end side.
  return (
    <div
      data-testid="editor-unlock-panel"
      data-rarity={info.rarity}
      role="region"
      aria-live="polite"
      aria-label={t('avatarBuilder.editor.tryingOn')}
      className="relative w-full rounded-neo-lg border-[3px] bg-neo-navy-light shadow-hard p-2 ps-2.5 overflow-hidden motion-safe:animate-in motion-safe:slide-in-from-bottom-2 duration-200"
      style={{ borderColor: tok.hex }}
    >
      {fancy && <span aria-hidden="true" className="avatar-editor-foil" />}
      <div className="relative flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider leading-none">
            <span className="shrink-0 inline-block w-2.5 h-2.5 rotate-45 border-2 border-black" style={{ background: tok.hex }} aria-hidden="true" />
            <span style={{ color: tok.hex }}>{t(tok.labelKey)}</span>
            <span className="text-neo-white/60 truncate">· {categoryLabel}</span>
          </p>
          <p className="mt-1 font-neo-display text-neo-white text-[15px] font-bold leading-tight truncate">
            {levelPath ? t('avatarBuilder.editor.unlocksAtLevel', { level: info.unlockLevel as number }) : t('avatarBuilder.editor.goldOnly')}
            {levelPath && typeof premium.level === 'number' && (
              <span className="ms-1.5 text-[11px] font-bold text-neo-white/60">{t('avatarBuilder.editor.youAreLevel', { level: premium.level })}</span>
            )}
          </p>
          {(set && setProg) || hint ? (
            <div className="mt-1 flex items-center gap-2 min-w-0 text-[10px] font-bold leading-none">
              {set && setProg && (
                <span data-testid="set-progress" className="min-w-0 inline-flex items-center gap-1" style={{ color: set.color }}>
                  <span className="min-w-0 truncate font-black uppercase tracking-wider">{t(`avatarBuilder.sets.${set.id}`, set.name)}</span>
                  <span className="flex gap-0.5" aria-hidden="true">
                    {Array.from({ length: setProg.total }, (_, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rotate-45 border rounded-[1px]"
                        style={{ borderColor: set.color, background: i < setProg.owned ? set.color : 'transparent' }}
                      />
                    ))}
                  </span>
                  <span className="font-black tabular-nums">{`${setProg.owned}/${setProg.total}`}</span>
                </span>
              )}
              {hint && <span className="min-w-0 truncate shrink-[0.2] text-neo-white/60">{hint}</span>}
            </div>
          ) : null}
        </div>

        {info.price > 0 && (
          <button
            type="button"
            data-testid="editor-unlock-buy"
            onClick={onBuy}
            disabled={!canBuy}
            className="shrink-0 inline-flex items-center gap-1 h-10 px-2.5 rounded-neo border-2 border-black bg-neo-yellow text-neo-black text-sm font-black tabular-nums shadow-hard-sm active:translate-x-px active:translate-y-px active:shadow-none disabled:bg-neo-navy disabled:text-neo-white/50 disabled:shadow-none transition-transform"
          >
            {canBuy ? <Coins size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
            <span>{t('avatarBuilder.editor.buyFor', { price: safeToLocaleString(info.price, language) })}</span>
          </button>
        )}
        <button
          type="button"
          data-testid="editor-unlock-takeoff"
          onClick={onTakeOff}
          aria-label={t('avatarBuilder.editor.takeOff')}
          title={t('avatarBuilder.editor.takeOff')}
          className="shrink-0 self-start w-7 h-7 rounded-neo border-2 border-black bg-neo-navy text-neo-white flex items-center justify-center active:scale-90 transition-transform"
        >
          <X size={14} strokeWidth={3} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
