'use client';

import { useState, useEffect } from 'react';

/**
 * Hook that listens for gift modal open/close events
 * Returns true when gift modal is open, allowing games to pause
 *
 * The Header component dispatches 'giftModalStateChange' custom events
 * when the admin gift modal opens or closes.
 */
export function useGiftModalPause(): boolean {
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleGiftModalChange = (event: CustomEvent<{ isOpen: boolean }>) => {
      setIsGiftModalOpen(event.detail.isOpen);
    };

    window.addEventListener('giftModalStateChange', handleGiftModalChange as EventListener);

    return () => {
      window.removeEventListener('giftModalStateChange', handleGiftModalChange as EventListener);
    };
  }, []);

  return isGiftModalOpen;
}
