/**
 * Training Components
 *
 * Interactive tutorial system for new players:
 * - TrainingHints: Real-time tips during practice mode
 * - TrainingAnalysisModal: Post-game analysis with skill breakdown
 * - TrainingProgressBar: Visual progress indicator with 5 clear skills
 * - SkillUnlockToast: Celebration toast when skill is unlocked
 */

export { default as TrainingHints } from './TrainingHints';
export { default as TrainingAnalysisModal } from './TrainingAnalysisModal';
export { default as TrainingProgressBar, TRAINING_SKILL_IDS } from './TrainingProgressBar';
export { default as SkillUnlockToast } from './SkillUnlockToast';
export type { TrainingSkillId } from './TrainingProgressBar';
