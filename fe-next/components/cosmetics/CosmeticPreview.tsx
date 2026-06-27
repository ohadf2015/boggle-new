'use client';

import { useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { type Cosmetic, RARITY_COLORS, formatUnlockHint, localizeTierParams } from '@/lib/cosmetics';
import { X, Lock } from 'lucide-react';

interface CosmeticPreviewProps {
  cosmetic: Cosmetic;
  isUnlocked: boolean;
  onClose: () => void;
  onEquip?: (id: string) => void;
  onPurchase?: (id: string) => void;
}

export function CosmeticPreview({ cosmetic, isUnlocked, onClose, onEquip, onPurchase }: CosmeticPreviewProps) {
  const { t } = useLanguage();
  const rarityClass = RARITY_COLORS[cosmetic.rarity];
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t(cosmetic.name)}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={dialogRef} className={`relative w-full max-w-sm bg-neo-navy border-neo rounded-neo p-5 shadow-hard ${rarityClass}`}>
        {/* Close */}
        <button
          onClick={onClose}
          aria-label={t('cosmetics.close')}
          className="absolute top-2 inset-e-2 text-neo-white hover:text-neo-lime"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Preview */}
        <div className={`h-32 rounded-neo bg-neo-navy-light mb-4 flex items-center justify-center ${cosmetic.preview}`}>
          {!isUnlocked && <Lock className="w-10 h-10 text-gray-500" />}
        </div>

        {/* Info */}
        <h3 className="text-lg font-neo-display font-bold text-neo-white">{t(cosmetic.name)}</h3>
        <p className="text-sm text-gray-400 mb-2">{t(cosmetic.description)}</p>
        <p className={`text-xs font-bold mb-4 ${rarityClass}`}>
          {t(`cosmetics.rarity.${cosmetic.rarity}`)}
        </p>

        {/* Actions */}
        {isUnlocked && onEquip && (
          <button
            onClick={() => onEquip(cosmetic.id)}
            className="w-full py-2 bg-neo-cyan text-black font-bold rounded-neo border-neo shadow-hard-sm hover:shadow-hard-pressed"
          >
            {t('cosmetics.equip')}
          </button>
        )}

        {!isUnlocked && (() => {
          const hint = formatUnlockHint(cosmetic);
          return (
          <div>
            <p className="text-sm text-neo-white mb-2 font-neo-body">
              <span className="text-gray-500 me-1">🔒</span>
              {hint ? t(hint.key, localizeTierParams(hint.params, t)) : t('cosmetics.locked')}
            </p>
            {cosmetic.unlockCondition.type === 'purchase' && onPurchase && (
              <button
                onClick={() => onPurchase(cosmetic.id)}
                className="w-full py-2 bg-neo-lime text-black font-bold rounded-neo border-neo shadow-hard-sm"
              >
                {t('cosmetics.purchase', { cost: cosmetic.unlockCondition.cost })}
              </button>
            )}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
