export type DailyChallengePhase =
  | 'loading'
  | 'ready'
  | 'playing'
  | 'completed'
  | 'already-played';

export interface ShouldAutoShowTutorialInput {
  phase: DailyChallengePhase;
  tutorialCompleted: boolean;
  showTutorial: boolean;
}

export const shouldAutoShowTutorial = ({
  phase,
  tutorialCompleted,
  showTutorial,
}: ShouldAutoShowTutorialInput): boolean =>
  phase === 'ready' && !tutorialCompleted && !showTutorial;
