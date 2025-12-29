'use client';

import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import {
  tutorialSteps,
  TutorialStep,
  TUTORIAL_STORAGE_KEY,
  isTutorialCompleted,
  markTutorialCompleted,
} from './tutorialSteps';

export interface TutorialContextValue {
  /** Whether the tutorial is currently active */
  isActive: boolean;
  /** Current step index */
  currentStepIndex: number;
  /** Current step data */
  currentStep: TutorialStep | null;
  /** Total number of steps */
  totalSteps: number;
  /** Start the tutorial */
  startTutorial: () => void;
  /** End the tutorial (complete or skip) */
  endTutorial: (completed?: boolean) => void;
  /** Go to the next step */
  nextStep: () => void;
  /** Go to the previous step */
  prevStep: () => void;
  /** Go to a specific step */
  goToStep: (index: number) => void;
  /** Skip the tutorial entirely */
  skipTutorial: () => void;
  /** Whether the tutorial has been completed before */
  hasCompletedBefore: boolean;
  /** Reset tutorial state (show again) */
  resetTutorial: () => void;
}

export const TutorialContext = createContext<TutorialContextValue | null>(null);

interface TutorialProviderProps {
  children: ReactNode;
  /** Auto-start the tutorial for new users */
  autoStart?: boolean;
}

/**
 * TutorialProvider - Context provider for the interactive tutorial system
 * Manages tutorial state, progression, and localStorage persistence
 */
export const TutorialProvider: React.FC<TutorialProviderProps> = ({
  children,
  autoStart = true,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasCompletedBefore, setHasCompletedBefore] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check localStorage on mount to determine if tutorial should auto-start
  useEffect((): void | (() => void) => {
    const completed = isTutorialCompleted();
    setHasCompletedBefore(completed);
    setIsInitialized(true);

    // Auto-start for new users after a short delay
    if (autoStart && !completed) {
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  const currentStep = useMemo(() => {
    if (currentStepIndex >= 0 && currentStepIndex < tutorialSteps.length) {
      return tutorialSteps[currentStepIndex];
    }
    return null;
  }, [currentStepIndex]);

  const startTutorial = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const endTutorial = useCallback((completed = true) => {
    setIsActive(false);
    setCurrentStepIndex(0);
    if (completed) {
      markTutorialCompleted();
      setHasCompletedBefore(true);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < tutorialSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Tutorial complete
      endTutorial(true);
    }
  }, [currentStepIndex, endTutorial]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < tutorialSteps.length) {
      setCurrentStepIndex(index);
    }
  }, []);

  const skipTutorial = useCallback(() => {
    endTutorial(true);
  }, [endTutorial]);

  const resetTutorialState = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    }
    setHasCompletedBefore(false);
    setCurrentStepIndex(0);
  }, []);

  const value = useMemo<TutorialContextValue>(
    () => ({
      isActive,
      currentStepIndex,
      currentStep,
      totalSteps: tutorialSteps.length,
      startTutorial,
      endTutorial,
      nextStep,
      prevStep,
      goToStep,
      skipTutorial,
      hasCompletedBefore,
      resetTutorial: resetTutorialState,
    }),
    [
      isActive,
      currentStepIndex,
      currentStep,
      startTutorial,
      endTutorial,
      nextStep,
      prevStep,
      goToStep,
      skipTutorial,
      hasCompletedBefore,
      resetTutorialState,
    ]
  );

  // Don't render tutorial UI until initialized to prevent hydration mismatch
  if (!isInitialized) {
    return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
  }

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

export default TutorialProvider;
