import type { ReactNode } from 'react';
import type { Avatar as AvatarType } from '@/shared/types/game';
import type { EduT } from './eduText';

export interface WaitingClassmate {
  username: string;
  avatar?: AvatarType | null;
}

export interface ClassroomWaitingStageProps {
  username: string;
  /** The student's own big face (already rendered, with their live emote mood). */
  avatar: ReactNode;
  onEditAvatar: () => void;
  /** Name + the guest rename control. */
  nameSlot: ReactNode;
  readySlot?: ReactNode;
  statusSlot?: ReactNode;
  emoteSlot?: ReactNode;
  /** One-tap looks under the avatar. */
  quickPickSlot?: ReactNode;
  /** Collapsed how-to-play for board modes; nothing for a quiz. */
  instructionsSlot?: ReactNode;
  /** Everyone in the room except the teacher (the student may be in it). */
  classmates: WaitingClassmate[];
  onExit: () => void;
  isReady?: boolean;
  t: EduT;
}

export { EduStudentLobby as ClassroomWaitingStage } from '@/components/education/live/EduStudentLobby';
