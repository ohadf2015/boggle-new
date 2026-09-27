'use client';

import { memo } from 'react';
import { EarthquakeWarning, FireRoundIndicator, FireBottomEffect } from '@/components/earthquake';
import KeyboardHintTooltip from '../../KeyboardHintTooltip';
import { KeyboardShortcutsOverlay, KeyboardModeIndicator } from '@/components/keyboard';
import { RoundEventOverlay, type RoundEventState } from './RoundEventOverlay';
import { SpecialWordToast, type SpecialWordEvent } from './SpecialWordToast';
import type { EarthquakeState, TranslationFn } from '../types';

interface GameOverlaysProps {
  // Earthquake/Fire Round
  earthquakeState: EarthquakeState;
  fireRoundActive: boolean;
  fireRoundRemaining: number;

  // Keyboard features
  isPlaying: boolean;
  isDesktop: boolean;
  isTypingMode: boolean;
  isHelpOpen: boolean;
  onCloseHelp: () => void;

  // Round events
  roundEvent?: RoundEventState | null;

  // Special word
  specialWordEvent?: SpecialWordEvent | null;

  // Translations and direction
  t: TranslationFn;
}

/**
 * GameOverlays - Renders overlay elements for the game
 * Includes earthquake warning, fire round indicator, and keyboard help
 */
export const GameOverlays = memo<GameOverlaysProps>(function GameOverlays({
  earthquakeState,
  fireRoundActive,
  fireRoundRemaining,
  isPlaying,
  isDesktop,
  isTypingMode,
  isHelpOpen,
  onCloseHelp,
  roundEvent,
  specialWordEvent,
  t,
}) {
  return (
    <>
      {/* Earthquake Warning Overlay */}
      <EarthquakeWarning isVisible={earthquakeState === 'warning'} />

      {/* Fire Round Indicator */}
      <FireRoundIndicator isActive={fireRoundActive} remainingSeconds={fireRoundRemaining} />

      {/* Pixelated fire effect at bottom of screen */}
      <FireBottomEffect isActive={fireRoundActive} />

      {/* Keyboard Input Hint - Desktop only */}
      {isPlaying && (
        <KeyboardHintTooltip delaySeconds={10} desktopOnly={true} t={t} />
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

      {/* Keyboard Shortcuts Overlay - Desktop only (user-triggered) */}
      {isDesktop && <KeyboardShortcutsOverlay isOpen={isHelpOpen} onClose={onCloseHelp} t={t} />}

      {/* Round Event Overlay (blizzard / lightning / meteor) */}
      <RoundEventOverlay event={roundEvent ?? null} t={t} />

      {/* Special Word Toast */}
      <SpecialWordToast event={specialWordEvent ?? null} t={t} />
    </>
  );
});
