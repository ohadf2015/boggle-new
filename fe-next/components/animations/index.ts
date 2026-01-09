/**
 * Animation Components for LexiClash
 *
 * This module exports all animation components used throughout the game.
 * All animations are performance-optimized and respect user preferences
 * for reduced motion.
 */

// Coin Animations
export { CoinTrajectory } from './CoinTrajectory';
export { CoinBurstSource } from './CoinBurstSource';
export { CoinCounterAnimated } from './CoinCounterAnimated';
export {
  CoinAnimationProvider,
  useCoinAnimation,
  CoinCounterWithAnimation,
} from './CoinAnimationSystem';

// Gameplay Animations
export { WordPathTrail } from './WordPathTrail';
export { ScorePopupFly } from './ScorePopupFly';
export { SelectionSparkle, LetterSelectFeedback } from './SelectionSparkle';

// Combo Animations
export { ComboIntensityBadge } from './ComboIntensityBadge';
export { ComboPulseRing, ScreenEdgeGlow } from './ComboPulseRing';

// Progress Animations
export { XpBarAnimated } from './XpBarAnimated';

// Celebration Animations
export { LevelUpCelebration } from './LevelUpCelebration';

// Timer Animations
export { TimerUrgency, TimeBonusPopup } from './TimerUrgency';

// Page Transitions
export {
  PageTransition,
  MotionContainer,
  MotionItem,
  FadeIn,
  ScaleOnHover,
} from './PageTransition';

// Loading States (New shimmer variants)
export {
  SkeletonShimmer,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonLeaderboardRow,
  SkeletonGrid,
} from './SkeletonShimmer';

// Re-export AnimatedCounter from ui
export { AnimatedCounter, AnimatedCounterWithImpact } from '../ui/AnimatedCounter';

// Re-export Skeleton components from ui
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  LeaderboardSkeleton,
  WordListSkeleton,
} from '../ui/skeleton';
