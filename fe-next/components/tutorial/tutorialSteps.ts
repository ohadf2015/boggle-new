/**
 * Tutorial Steps Configuration
 * Defines all steps for the interactive tutorial that guides new players
 */

export interface TutorialStep {
  id: string;
  /** Target element selector using data-tutorial attribute */
  target: string;
  /** Translation key for the title */
  titleKey: string;
  /** Translation key for the description */
  descriptionKey: string;
  /** Position of the tooltip relative to the target */
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** Optional icon name from lucide-react */
  icon?: string;
  /** Whether to highlight the target element with a spotlight */
  spotlight?: boolean;
  /** Optional action the user must take to proceed (otherwise click/tap to continue) */
  action?: 'click' | 'swipe' | 'none';
  /** Whether this step should wait for user interaction on the target */
  waitForInteraction?: boolean;
  /** Optional delay before showing this step (ms) */
  delay?: number;
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    target: '[data-tutorial="grid"]',
    titleKey: 'tutorial.welcome.title',
    descriptionKey: 'tutorial.welcome.description',
    position: 'center',
    icon: 'Sparkles',
    spotlight: false,
    action: 'none',
    delay: 500,
  },
  {
    id: 'grid-intro',
    target: '[data-tutorial="grid"]',
    titleKey: 'tutorial.grid.title',
    descriptionKey: 'tutorial.grid.description',
    position: 'bottom',
    icon: 'Grid3X3',
    spotlight: true,
    action: 'none',
  },
  {
    id: 'swipe-words',
    target: '[data-tutorial="grid"]',
    titleKey: 'tutorial.swipe.title',
    descriptionKey: 'tutorial.swipe.description',
    position: 'bottom',
    icon: 'Move',
    spotlight: true,
    action: 'none',
  },
  {
    id: 'combo-system',
    target: '[data-tutorial="combo"]',
    titleKey: 'tutorial.combo.title',
    descriptionKey: 'tutorial.combo.description',
    position: 'bottom',
    icon: 'Flame',
    spotlight: true,
    action: 'none',
  },
  {
    id: 'timer',
    target: '[data-tutorial="timer"]',
    titleKey: 'tutorial.timer.title',
    descriptionKey: 'tutorial.timer.description',
    position: 'bottom',
    icon: 'Clock',
    spotlight: true,
    action: 'none',
  },
  {
    id: 'leaderboard',
    target: '[data-tutorial="leaderboard"]',
    titleKey: 'tutorial.leaderboard.title',
    descriptionKey: 'tutorial.leaderboard.description',
    position: 'left',
    icon: 'Trophy',
    spotlight: true,
    action: 'none',
  },
  {
    id: 'ready',
    target: '[data-tutorial="grid"]',
    titleKey: 'tutorial.ready.title',
    descriptionKey: 'tutorial.ready.description',
    position: 'center',
    icon: 'Zap',
    spotlight: false,
    action: 'none',
  },
];

export const TUTORIAL_STORAGE_KEY = 'lexiclash_tutorial_completed';

/**
 * Check if the tutorial has been completed
 */
export const isTutorialCompleted = (): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
};

/**
 * Mark the tutorial as completed
 */
export const markTutorialCompleted = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
};

/**
 * Reset the tutorial (for testing or if user wants to see it again)
 */
export const resetTutorial = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TUTORIAL_STORAGE_KEY);
};
