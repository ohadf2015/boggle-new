'use client';

import { useState, useEffect, useCallback } from 'react';

const TEACHER_ONBOARDING_KEY = 'lexiclash_teacher_onboarding';
const STUDENT_ONBOARDING_KEY = 'lexiclash_student_onboarding';

interface OnboardingState {
  completed: boolean;
  skipped: boolean;
  currentStep: number;
  completedSteps: string[];
}

interface UseOnboardingStateReturn {
  /** Whether onboarding has been completed */
  isCompleted: boolean;
  /** Whether onboarding was skipped */
  isSkipped: boolean;
  /** Current step index (0-based) */
  currentStep: number;
  /** Steps that have been completed */
  completedSteps: string[];
  /** Whether to show the onboarding wizard */
  shouldShowOnboarding: boolean;
  /** Mark a step as completed */
  completeStep: (stepId: string) => void;
  /** Move to the next step */
  nextStep: () => void;
  /** Move to the previous step */
  prevStep: () => void;
  /** Set specific step */
  setStep: (step: number) => void;
  /** Mark onboarding as completed */
  complete: () => void;
  /** Skip onboarding */
  skip: () => void;
  /** Reset onboarding (for testing) */
  reset: () => void;
}

const DEFAULT_STATE: OnboardingState = {
  completed: false,
  skipped: false,
  currentStep: 0,
  completedSteps: [],
};

/**
 * Hook for managing teacher onboarding wizard state
 *
 * Persists state to localStorage so onboarding:
 * - Shows on first visit
 * - Can be skipped
 * - Remembers completion status
 */
export function useTeacherOnboardingState(): UseOnboardingStateReturn {
  return useOnboardingState(TEACHER_ONBOARDING_KEY);
}

/**
 * Hook for managing student onboarding wizard state
 */
export function useStudentOnboardingState(): UseOnboardingStateReturn {
  return useOnboardingState(STUDENT_ONBOARDING_KEY);
}

/**
 * Generic onboarding state hook
 */
function useOnboardingState(storageKey: string): UseOnboardingStateReturn {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as OnboardingState;
        setState(parsed);
      }
    } catch (error) {
      // Ignore localStorage errors
    }
    setIsLoaded(true);
  }, [storageKey]);

  // Persist state changes to localStorage
  const persistState = useCallback((newState: OnboardingState) => {
    setState(newState);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newState));
    } catch (error) {
      // Ignore localStorage errors
    }
  }, [storageKey]);

  // Complete a specific step
  const completeStep = useCallback((stepId: string) => {
    if (state.completedSteps.includes(stepId)) return;

    const newState: OnboardingState = {
      ...state,
      completedSteps: [...state.completedSteps, stepId],
    };
    persistState(newState);
  }, [state, persistState]);

  // Move to next step
  const nextStep = useCallback(() => {
    const newState: OnboardingState = {
      ...state,
      currentStep: state.currentStep + 1,
    };
    persistState(newState);
  }, [state, persistState]);

  // Move to previous step
  const prevStep = useCallback(() => {
    const newState: OnboardingState = {
      ...state,
      currentStep: Math.max(0, state.currentStep - 1),
    };
    persistState(newState);
  }, [state, persistState]);

  // Set specific step
  const setStep = useCallback((step: number) => {
    const newState: OnboardingState = {
      ...state,
      currentStep: Math.max(0, step),
    };
    persistState(newState);
  }, [state, persistState]);

  // Complete onboarding
  const complete = useCallback(() => {
    const newState: OnboardingState = {
      ...state,
      completed: true,
    };
    persistState(newState);
  }, [state, persistState]);

  // Skip onboarding
  const skip = useCallback(() => {
    const newState: OnboardingState = {
      ...state,
      skipped: true,
    };
    persistState(newState);
  }, [state, persistState]);

  // Reset onboarding (for testing)
  const reset = useCallback(() => {
    persistState(DEFAULT_STATE);
  }, [persistState]);

  // Determine if we should show onboarding
  const shouldShowOnboarding = isLoaded && !state.completed && !state.skipped;

  return {
    isCompleted: state.completed,
    isSkipped: state.skipped,
    currentStep: state.currentStep,
    completedSteps: state.completedSteps,
    shouldShowOnboarding,
    completeStep,
    nextStep,
    prevStep,
    setStep,
    complete,
    skip,
    reset,
  };
}

export default useTeacherOnboardingState;
