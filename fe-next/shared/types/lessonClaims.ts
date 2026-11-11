/** Lesson Word Race: the shared list of placed lesson words, and who claimed each first. */

export interface LessonClaimAvatar {
  emoji?: string;
  color?: string;
  avatarImage?: string;
}

export interface LessonClaim {
  word: string;
  username: string;
  avatar: LessonClaimAvatar | null;
  teamId: number | null;
}

/** Unclaimed slots carry only the first letter and length: the word itself never leaves the server. */
export interface LessonClaimSlot {
  index: number;
  first: string;
  length: number;
  claim: LessonClaim | null;
}

export interface LessonClaimsView {
  roundId: number;
  total: number;
  claimedCount: number;
  slots: LessonClaimSlot[];
}

export interface LessonWordClaimedEvent extends LessonClaim {
  roundId: number;
  index: number;
  claimedCount: number;
  total: number;
  bonus: number;
}

export const LESSON_WORD_CLAIMED_EVENT = 'lessonWordClaimed';
