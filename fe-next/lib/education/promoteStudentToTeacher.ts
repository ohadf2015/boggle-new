/**
 * A header signup is created as a student even when the person is the teacher.
 * They then open a second account to get a classroom. This decision is the
 * settings switch: the same confirmed account becomes a teacher. Anonymous
 * guests and unconfirmed emails cannot promote — that is how a typo'd address
 * would otherwise mint a teacher with no way back in.
 */

export type PromoteDecision =
  | 'promote'
  | 'already_teacher'
  | 'unconfirmed'
  | 'anonymous'
  | 'refused';

export interface PromoteInput {
  userId?: string | null;
  email?: string | null;
  emailConfirmedAt?: string | null;
  isAnonymous?: boolean;
  userRole?: string | null;
  isAdmin?: boolean;
}

export function promoteDecision(input: PromoteInput): PromoteDecision {
  if (!input.userId) return 'refused';
  if (input.isAnonymous || !input.email) return 'anonymous';
  if (input.isAdmin || input.userRole === 'admin' || input.userRole === 'teacher') return 'already_teacher';
  if (!input.emailConfirmedAt) return 'unconfirmed';
  if (input.userRole && input.userRole !== 'student' && input.userRole !== 'player') return 'refused';
  return 'promote';
}
