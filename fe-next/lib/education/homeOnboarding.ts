// Teacher Home's 3-step first run: derived from real data plus the server-side activation flags.

export type HomeOnboardingStepId = 'createClass' | 'shareCode' | 'tryDemo';
export type HomeOnboardingStatus = 'done' | 'current' | 'todo';

export interface HomeOnboardingInput {
  classroomCount: number;
  /** Students across all classes: anyone joined means the code was shared, whatever the copy flag says. */
  studentCount?: number;
  inviteCopied: boolean;
  /** A real 2+ player round completed (server-stamped). */
  liveStarted: boolean;
  /** The teacher opened a live room; false/undefined when unknown. */
  roomOpened?: boolean;
  /** Live games in the recent activity window: real play history proves the demo step, whatever the flag says. */
  gamesPlayed?: number;
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
  /**
   * Room is open but no real round yet: the tryDemo step should send the
   * teacher back to the invite/QR, not to another empty room.
   */
  awaitingPlayers: boolean;
}

export function homeOnboarding(input: HomeOnboardingInput): HomeOnboarding {
  const played = input.liveStarted || (input.gamesPlayed ?? 0) > 0;
  const done: Record<HomeOnboardingStepId, boolean> = {
    createClass: input.classroomCount > 0,
    shareCode: input.classroomCount > 0 && (input.inviteCopied || (input.studentCount ?? 0) > 0),
    tryDemo: input.classroomCount > 0 && played,
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
    awaitingPlayers:
      input.classroomCount > 0 && input.roomOpened === true && !played,
  };
}
