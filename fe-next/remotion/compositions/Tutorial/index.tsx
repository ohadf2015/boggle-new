import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TutorialStep } from './TutorialStep';
import { TutorialSchema, tutorialTranslations, type TutorialProps } from './types';

// Re-export schema and types for composition registration
export { TutorialSchema } from './types';
export type { TutorialProps } from './types';

// Constants for tutorial timing
const FPS = 30;
const STEP_DURATION_FRAMES = 180; // 6 seconds per step at 30fps
const TOTAL_DURATION_FRAMES = STEP_DURATION_FRAMES * 3; // 18 seconds total

/**
 * Tutorial composition - 18-second onboarding video showing:
 * 1. Swipe gesture (0-6s)
 * 2. Word validation (6-12s)
 * 3. Scoring pattern (12-18s)
 *
 * Each step displays a pulsing highlight box with localized instruction text.
 * Fully skippable from frame 0 (first frame has valid content).
 */
export const Tutorial: React.FC<TutorialProps> = ({ locale = 'en' }) => {
  // Validate locale against schema, fallback to 'en' if invalid
  const parsedLocale = TutorialSchema.shape.locale.safeParse(locale);
  const safeLocale = parsedLocale.success ? parsedLocale.data : 'en';

  const translations = tutorialTranslations[safeLocale];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a2e', // Neo-navy background
      }}
    >
      {/* Step 1: Swipe gesture instruction (frames 0-180) */}
      <Sequence from={0} durationInFrames={STEP_DURATION_FRAMES}>
        <AbsoluteFill>
          <TutorialStep
            text={translations.step1}
            locale={safeLocale}
            highlightType="swipe"
          />
        </AbsoluteFill>
      </Sequence>

      {/* Step 2: Word validation instruction (frames 180-360) */}
      <Sequence from={STEP_DURATION_FRAMES} durationInFrames={STEP_DURATION_FRAMES}>
        <AbsoluteFill>
          <TutorialStep
            text={translations.step2}
            locale={safeLocale}
            highlightType="word"
          />
        </AbsoluteFill>
      </Sequence>

      {/* Step 3: Scoring instruction (frames 360-540) */}
      <Sequence from={STEP_DURATION_FRAMES * 2} durationInFrames={STEP_DURATION_FRAMES}>
        <AbsoluteFill>
          <TutorialStep
            text={translations.step3}
            locale={safeLocale}
            highlightType="score"
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

// Export constants for external use (e.g., Root.tsx composition registration)
export const TUTORIAL_DURATION_FRAMES = TOTAL_DURATION_FRAMES;
export const TUTORIAL_FPS = FPS;
