// Teacher Home's 3-step first run: derived from real data plus the server-side activation flags.

export type HomeOnboardingStepId = 'createClass' | 'shareCode' | 'tryDemo';
export type HomeOnboardingStatus = 'done' | 'current' | 'todo';

export interface HomeOnboardingInput {
  classroomCount: number;
  inviteCopied: boolean;
  liveStarted: boolean;
  dismissed: boolean;
}

export interface HomeOnboarding {
  steps: { id: HomeOnboardingStepId; status: HomeOnboardingStatus }[];
  current: HomeOnboardingStepId | null;
  doneCount: number;
  complete: boolean;
  visible: boolean;
  /** A teacher with no class has nothing else on Home, so the card cannot be dismissed. */
  dismissible: boolean;
}

export function homeOnboarding(input: HomeOnboardingInput): HomeOnboarding {
  const done: Record<HomeOnboardingStepId, boolean> = {
    createClass: input.classroomCount > 0,
    shareCode: input.classroomCount > 0 && input.inviteCopied,
    tryDemo: input.classroomCount > 0 && input.liveStarted,
  };
  const order: HomeOnboardingStepId[] = ['createClass', 'shareCode', 'tryDemo'];
  const current = order.find((id) => !done[id]) ?? null;
  const steps = order.map((id) => ({
    id,
    status: (done[id] ? 'done' : id === current ? 'current' : 'todo') as HomeOnboardingStatus,
  }));
  const complete = current === null;
  const dismissible = input.classroomCount > 0;
  return {
    steps,
    current,
    doneCount: order.filter((id) => done[id]).length,
    complete,
    visible: input.classroomCount === 0 || (!complete && !input.dismissed),
    dismissible,
  };
}
