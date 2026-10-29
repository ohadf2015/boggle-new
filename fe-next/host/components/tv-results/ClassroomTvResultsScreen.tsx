'use client';

import EduHostResults from '@/components/education/live/EduHostResults';
import { useEduLiveSurfaces } from '@/components/education/live/eduLiveSurfaces';
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';
import type { Socket } from 'socket.io-client';

export interface ClassroomTvResultsScreenProps {
  summary: ClassroomSummary;
  onRematch?: () => void;
  /** Hands the room back to the projector lobby, which this opaque layer otherwise covers. */
  onClose?: () => void;
  onExitRoom?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  players?: PlayerResult[];
  gameCode?: string;
  socket?: Socket | null;
}

export function ClassroomTvResultsScreen(props: ClassroomTvResultsScreenProps) {
  const Results = useEduLiveSurfaces().ClassroomResults ?? EduHostResults;
  return <Results {...props} />;
}

export default ClassroomTvResultsScreen;
