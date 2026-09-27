'use client';

/** Skin Vault — one tile skin per world, won from its boss, equippable in every grid mode. */
import { Lock, Check, X } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { getWorldConfig } from '@/lib/adventure/worldConfig';
import { getBossConfig } from '@/lib/adventure/bossConfig';
import { WORLD_SKIN_WORLDS } from '@/lib/adventure/play/worldSkins';
import SkinSwatch from './SkinSwatch';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  unlocked: Set<number>;
  equippedWorld: number | null;
  onEquip: (world: number) => void;
}

export default function SkinVault({ isOpen, onClose, unlocked, equippedWorld, onEquip }: Props) {
  const { t } = useLanguageSafe();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="skin-vault-title" data-adv-overlay="SkinVault">
      <div className="w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border-[3px] border-black bg-[#1a1a2e] text-neo-cream shadow-[6px_6px_0_#000] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="skin-vault-title" className="font-neo-display text-2xl font-bold">{t('adventurePlay.skinVault')}</h2>
            <p className="text-sm opacity-80 mt-0.5">{t('adventurePlay.skinVaultHint')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')}
            className="rounded-xl border-[3px] border-black bg-neo-cream text-black p-1.5 shadow-[3px_3px_0_#000]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-3">
          {WORLD_SKIN_WORLDS.map((w) => {
            const open = unlocked.has(w);
            const cfg = getWorldConfig(w);
            const boss = getBossConfig(w);
            const on = equippedWorld === w;
            return (
              <li key={w}
                className={cn('relative rounded-2xl border-[3px] border-black p-3 overflow-hidden',
                  on ? 'bg-neo-lime text-black' : 'bg-black/40')}
                style={{ backgroundImage: open && !on ? `linear-gradient(rgba(10,16,40,.72),rgba(10,16,40,.9)), url(/images/adventure/play/world-${w}.webp)` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className={cn('flex justify-center', !open && 'opacity-60')}>
                  <SkinSwatch world={w} letters={['W', 'O', 'R'].join('')} />
                </div>
                <div className="mt-2 text-sm font-bold leading-tight truncate">{cfg ? t(`adventure.worlds.${cfg.name}`) : w}</div>
                {open ? (
                  <button type="button" onClick={() => onEquip(w)} disabled={on}
                    className={cn('mt-2 w-full rounded-lg border-2 border-black font-bold text-sm py-1.5 inline-flex items-center justify-center gap-1',
                      on ? 'bg-black text-neo-lime' : 'bg-neo-yellow text-black active:translate-y-0.5')}>
                    {on ? (<><Check className="w-4 h-4" /> {t('adventurePlay.equipped')}</>) : t('adventurePlay.equipSkin')}
                  </button>
                ) : (
                  <div className="mt-2 flex items-center gap-1 text-xs opacity-80">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t('adventurePlay.beatBoss', { boss: boss ? t(boss.displayName) : '' })}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
