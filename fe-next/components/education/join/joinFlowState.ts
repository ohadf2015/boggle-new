import type { JoinTarget } from './joinTarget';

export type JoinStep = 'code' | 'name';

/** A roster join that stayed on this screen instead of leaving for the hub. */
export interface JoinedClassroom {
  classroomId: string;
  alreadyMember: boolean;
}

export interface OwnClassRefusal {
  classroomId: string;
  liveGameCode: string | null;
}

export interface JoinFlowState {
  step: JoinStep;
  code: string;
  name: string;
  /** Resolved class/teacher behind the code, or null while unknown. */
  target: JoinTarget | null;
  isChecking: boolean;
  isSubmitting: boolean;
  /** Held tap waiting on an unresolved session. */
  isHolding: boolean;
  /** Guests type a nickname; so does anyone who already typed one. */
  showNameField: boolean;
  /** True once we are SURE the code is wrong. `unverified` never sets this. */
  codeRejected: boolean;
  codeErrorKey: string | null;
  /** Bumps on every refused tap, so the same refusal shown twice still replays its alert. */
  refusalTick: number;
  formErrorKey: string | null;
  nameError: boolean;
  suggestedName: string | null;
  /** After a roster join: the fallback success panel while the push to the class view is in flight. */
  joined: JoinedClassroom | null;
  /** The game behind this code is over: retrying it can only fail. */
  ended: boolean;
  /** The class the server enrolled them in off an ended game code, if any. */
  endedClassroomId: string | null;
  /** A signed-in teacher submitted their own class: show them how to host instead of a refusal. */
  ownClass: OwnClassRefusal | null;
  canSubmit: boolean;
  setCode: (next: string) => void;
  setName: (next: string) => void;
  /** Pass the freshest code when the caller has it (the sixth keystroke). */
  advance: (codeArg?: string) => void;
  refuseTooLong: () => void;
  backToCode: () => void;
  typeNewCode: () => void;
  submit: (overrideName?: string) => void;
}
