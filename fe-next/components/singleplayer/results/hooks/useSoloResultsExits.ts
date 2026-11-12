import { useCallback, useState } from 'react';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { readGamesCompletedCount } from '@/utils/gamesCompletedCount';

interface Options {
  onPlayAgain: () => void;
  onBackToLobby: () => void;
  onStartPreset?: (presetId: string) => void;
}

/** Every exit from the solo results screen waits for the interstitial once, never over the score reveal. */
export function useSoloResultsExits({ onPlayAgain, onBackToLobby, onStartPreset }: Options) {
  const [showTomorrowPreview, setShowTomorrowPreview] = useState(false);
  const { showInterstitial } = useInterstitialAd();

  const gateWithInterstitial = useCallback(async () => {
    try {
      await showInterstitial('singleplayer-complete');
    } catch {
      /* never block the exit */
    }
  }, [showInterstitial]);

  const handleBackToLobby = useCallback(() => {
    void gateWithInterstitial().then(() => {
      // First-session players already see the persistent TomorrowCard; the banner would duplicate it.
      if (readGamesCompletedCount() <= 1) {
        onBackToLobby();
        return;
      }
      setShowTomorrowPreview(true);
    });
  }, [onBackToLobby, gateWithInterstitial]);

  const handlePlayAgainGated = useCallback(() => {
    void gateWithInterstitial().then(onPlayAgain);
  }, [gateWithInterstitial, onPlayAgain]);

  const handleStartPresetGated = useCallback((presetId: string) => {
    if (!onStartPreset) return;
    void gateWithInterstitial().then(() => onStartPreset(presetId));
  }, [gateWithInterstitial, onStartPreset]);

  const handleTomorrowDismiss = useCallback(() => {
    setShowTomorrowPreview(false);
    onBackToLobby();
  }, [onBackToLobby]);

  return {
    gateWithInterstitial,
    handleBackToLobby,
    handlePlayAgainGated,
    handleStartPresetGated,
    handleTomorrowDismiss,
    showTomorrowPreview,
  };
}
