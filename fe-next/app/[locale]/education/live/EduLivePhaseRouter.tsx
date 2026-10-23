'use client';

/** Same phase resolver as /multiplayer; only entry and student results are edu-own screens. */
import React from 'react';
import nextDynamic from 'next/dynamic';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import { MpPhaseRouter, buildMpResultsProps, type MpPhaseRouterProps } from '@/app/[locale]/multiplayer/MpPhaseRouter';
import { EduLiveSurfacesProvider, type EduLiveSurfaces } from '@/components/education/live/eduLiveSurfaces';
import EduLiveEntry from '@/components/education/live/EduLiveEntry';
import EduAbortedModal from '@/components/education/live/EduAbortedModal';
import type { Translate } from '@/components/education/live/eduLiveStyles';

const EduProjectorLobby = nextDynamic(() => import('@/components/education/live/EduProjectorLobby'), { ssr: false });
const EduStudentLobby = nextDynamic(() => import('@/components/education/live/EduStudentLobby'), { ssr: false });
const EduHostResults = nextDynamic(() => import('@/components/education/live/EduHostResults'), { ssr: false });
const EduStudentResults = nextDynamic(() => import('@/components/education/live/EduStudentResults'), { ssr: false });

const SURFACES: EduLiveSurfaces = {
  ProjectorLobby: EduProjectorLobby,
  StudentLobby: EduStudentLobby,
  ClassroomResults: EduHostResults,
  AbortedModal: EduAbortedModal,
};

interface EduLivePhaseRouterProps {
  routerProps: MpPhaseRouterProps;
  urlRoom: string | null;
  isTeacher: boolean;
  language: string;
  t: Translate;
}

export function EduLivePhaseRouter({ routerProps, urlRoom, isTeacher, language, t }: EduLivePhaseRouterProps): React.JSX.Element {
  const { phase } = routerProps;

  if (phase === 'entry') {
    return (
      <FeatureErrorBoundary featureName="Classroom Entry">
        <EduLiveEntry entry={routerProps.entry} urlRoom={urlRoom} isHost={isTeacher} language={language} t={t} />
      </FeatureErrorBoundary>
    );
  }

  if (phase === 'results' && !routerProps.isHost) {
    return (
      <FeatureErrorBoundary featureName="Classroom Results">
        <EduStudentResults {...buildMpResultsProps(routerProps)} />
      </FeatureErrorBoundary>
    );
  }

  return (
    <EduLiveSurfacesProvider value={SURFACES}>
      <MpPhaseRouter {...routerProps} />
    </EduLiveSurfacesProvider>
  );
}

export default EduLivePhaseRouter;
