'use client';

import { useContext } from 'react';
import { TutorialContext, TutorialContextValue } from './TutorialProvider';

/**
 * useTutorial - Hook to access the tutorial context
 * Provides access to tutorial state and controls
 *
 * @example
 * const { isActive, nextStep, skipTutorial } = useTutorial();
 *
 * // Check if tutorial is running
 * if (isActive) {
 *   // Disable certain interactions during tutorial
 * }
 *
 * // Manually start the tutorial
 * const handleShowTutorial = () => startTutorial();
 */
export const useTutorial = (): TutorialContextValue => {
  const context = useContext(TutorialContext);

  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }

  return context;
};

export default useTutorial;
