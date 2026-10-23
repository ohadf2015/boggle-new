'use client';

/** Edu live swaps only the lobby/results/aborted leaves of the shared HostView/PlayerView; absent on /multiplayer. */
import { createContext, useContext, type ComponentType, type ReactNode } from 'react';
import type { ProjectorLobbyProps } from '@/components/education/projector/ProjectorLobby';
import type { ClassroomWaitingStageProps } from '@/components/education/lobby/ClassroomWaitingStage';
import type { ClassroomTvResultsScreenProps } from '@/host/components/tv-results/ClassroomTvResultsScreen';
import type { EduAbortedModalProps } from '@/components/education/live/EduAbortedModal';

export interface EduLiveSurfaces {
  ProjectorLobby?: ComponentType<ProjectorLobbyProps>;
  StudentLobby?: ComponentType<ClassroomWaitingStageProps>;
  ClassroomResults?: ComponentType<ClassroomTvResultsScreenProps>;
  AbortedModal?: ComponentType<EduAbortedModalProps>;
}

const EduLiveSurfacesContext = createContext<EduLiveSurfaces>({});

export function EduLiveSurfacesProvider({ value, children }: { value: EduLiveSurfaces; children: ReactNode }) {
  return <EduLiveSurfacesContext.Provider value={value}>{children}</EduLiveSurfacesContext.Provider>;
}

export function useEduLiveSurfaces(): EduLiveSurfaces {
  return useContext(EduLiveSurfacesContext);
}
