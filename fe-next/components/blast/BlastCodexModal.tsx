'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CODEX_COMBOS, CODEX_COMBO_COUNT } from './utils/blastComboScaling';
import type { BlastComboType } from './utils/blastCombos';

// ==================== Types ====================

export interface BlastCodexModalProps {
  discoveredCombos: Set<BlastComboType>;
  isOpen: boolean;
  onClose: () => void;
}

// ==================== Component ====================

/**
 * BlastCodexModal — shows all 31 codex-eligible combo pairs.
 * Discovered combos show their translated name; undiscovered show ???.
 * Accessible via Codex button on BlastReadyScreen.
 */
export function BlastCodexModal({ discoveredCombos, isOpen, onClose }: BlastCodexModalProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const discoveredCount = CODEX_COMBOS.filter((c) => discoveredCombos.has(c)).length;

  return (
    <AnimatePresence>
      <motion.div
        key="codex-backdrop"
        className="fixed inset-0 z-40 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />

        {/* Modal card */}
        <motion.div
          data-testid="combo-codex-modal"
          className="relative border-neo border-black bg-neo-navy shadow-hard-lg rounded-neo w-full max-w-sm max-h-[80vh] flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-3 border-black/30 shrink-0">
            <div>
              <h2 className="font-neo-display font-black text-lg text-white uppercase tracking-wide">
                {t('blast.comboCodex')}
              </h2>
              <p className="text-xs text-white/60 mt-0.5">
                {t('blast.codexProgress', { discovered: discoveredCount, total: CODEX_COMBO_COUNT })}
              </p>
            </div>
            <button
              data-testid="codex-close-button"
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-neo border-neo border-black/40 bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="close"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Scrollable grid */}
          <div className="overflow-y-auto p-3 grid grid-cols-2 gap-2 flex-1">
            {CODEX_COMBOS.map((comboType) => {
              const isDiscovered = discoveredCombos.has(comboType);
              return (
                <div
                  key={comboType}
                  className={[
                    'px-3 py-2 rounded-neo border-3 text-center transition-colors',
                    isDiscovered
                      ? 'bg-neo-yellow/20 border-neo-yellow/60 text-neo-yellow'
                      : 'bg-gray-800/50 border-gray-600/40 text-white/30',
                  ].join(' ')}
                >
                  <p className="font-neo-display font-black text-xs uppercase leading-tight">
                    {isDiscovered ? t(`blast.combo.${comboType}`) : t('blast.codexLocked')}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
