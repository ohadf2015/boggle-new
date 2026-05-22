'use client';

import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useKonamiCode } from '@/hooks/useKonamiCode';
import { fireFireworks } from '@/utils/confettiUtils';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Global, render-free easter egg: the Konami code triggers a fireworks burst
 * and a celebratory toast. Purely cosmetic — no gameplay/economy effect — so it
 * can live safely at the app root. Mounted once in providers.
 */
export default function EasterEggListener(): null {
  const { t } = useLanguage();
  // Brief cooldown so a key-repeat or double-entry doesn't stack bursts.
  const lastFiredRef = useRef(0);

  const onUnlock = useCallback(() => {
    const now = Date.now();
    if (now - lastFiredRef.current < 3000) return;
    lastFiredRef.current = now;
    fireFireworks(4, 2600);
    toast(t('easterEgg.konami'), { icon: '🕹️', duration: 4000 });
  }, [t]);

  useKonamiCode(onUnlock);
  return null;
}
