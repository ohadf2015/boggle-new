'use client';

import { memo } from 'react';
import { EarthquakeWarning, FireRoundIndicator, FireBottomEffect } from '@/components/earthquake';
import TapToDragTooltip from '../../TapToDragTooltip';
import KeyboardHintTooltip from '../../KeyboardHintTooltip';
import { KeyboardShortcutsOverlay, KeyboardModeIndicator, KeyboardQuickTip } from '@/components/keyboard';
import DirectionHintOverlay from '../../DirectionHintOverlay';
import type { EarthquakeState, TranslationFn } from '../types';
import type { Language } from '@/shared/types/game';

interface GameOverlaysProps {
  // Earthquake/Fire Round
  earthquakeState: EarthquakeState;
  fireRoundActive: boolean;
  fireRoundRemaining: number;

  // Tap-to-drag guidance
  showDragTutorial: boolean;
  onDismissDragTutorial: () => void;

  // Keyboard features
  isPlaying: boolean;
  isDesktop: boolean;
  showQuickTip: boolean;
  onDismissQuickTip: () => void;
  isTypingMode: boolean;
  isHelpOpen: boolean;
  onCloseHelp: () => void;

  // Translations and direction
  t: TranslationFn;
  dir: 'rtl' | 'ltr';
  gameLanguage: Language;
}

/**
 * GameOverlays - Renders overlay elements for the game
 * Includes earthquake warning, fire round indicator, tooltips, and keyboard help
 */
export const GameOverlays = memo<GameOverlaysProps>(function GameOverlays({
  earthquakeState,
  fireRoundActive,
  fireRoundRemaining,
  showDragTutorial,
  onDismissDragTutorial,
  isPlaying,
  isDesktop,
  showQuickTip,
  onDismissQuickTip,
  isTypingMode,
  isHelpOpen,
  onCloseHelp,
  t,
  dir,
  gameLanguage,
}) {
  return (
    <>
      {/* Earthquake Warning Overlay */}
      <EarthquakeWarning isVisible={earthquakeState === 'warning'} />

      {/* Fire Round Indicator */}
      <FireRoundIndicator isActive={fireRoundActive} remainingSeconds={fireRoundRemaining} />

      {/* Pixelated fire effect at bottom of screen */}
      <FireBottomEffect isActive={fireRoundActive} />

      {/* Tap-to-drag guidance - shows when player taps single letter without dragging */}
      <TapToDragTooltip
        isVisible={showDragTutorial}
        onDismiss={onDismissDragTutorial}
        t={t}
        dir={dir}
        language={gameLanguage}
      />

      {/* Keyboard Input Hint - Desktop only (legacy fallback) */}
      {isPlaying && !showQuickTip && (
        <KeyboardHintTooltip delaySeconds={10} desktopOnly={true} t={t} />
      )}

      {/* Keyboard Quick Tip - Desktop only (immediate hint) */}
      {isPlaying && isDesktop && (
        <KeyboardQuickTip isVisible={showQuickTip} onDismiss={onDismissQuickTip} t={t} />
      )}

      {/* Keyboard Mode Indicator - Desktop only */}
      {isPlaying && isDesktop && (
        <KeyboardModeIndicator
          isNavigationMode={false}
          isTypingMode={isTypingMode}
          t={t}
          position="top-right"
        />
      )}

      {/* Keyboard Shortcuts Overlay - Desktop only */}
      {isDesktop && <KeyboardShortcutsOverlay isOpen={isHelpOpen} onClose={onCloseHelp} t={t} />}

      {/* Direction hint overlay - one-time tutorial for new players */}
      {isPlaying && <DirectionHintOverlay t={t} />}
    </>
  );
});
