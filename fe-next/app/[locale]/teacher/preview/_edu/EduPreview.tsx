'use client';

import { TeacherHomePreview } from '@/components/teacher/home/TeacherHomePreview';
import { DockPreview, JoinRefusalPreview, LobbyHudPreview, ResultsPreview } from './StudentPreviews';
import { ProjectorPreview } from './ProjectorPreview';
import { AnalyticsFreePreview, ExplainerPreview, HostResultsPreview, SettingsPreview, SetupPreview } from './TeacherPreviews';

export const EDU_PREVIEW_STATES = ['edu-dock', 'edu-results', 'edu-hud', 'edu-join', 'edu-projector', 'edu-home', 'edu-analytics', 'edu-host-results', 'edu-setup', 'edu-settings', 'edu-explainer'] as const;

/** Dev-only fixtures for the education audit surfaces: real components, a fake socket, no writes. */
export function EduPreview({ state, v }: { state: string; v?: string }) {
  switch (state) {
    case 'edu-dock': return <DockPreview v={v} />;
    case 'edu-results': return <ResultsPreview v={v} />;
    case 'edu-hud': return <LobbyHudPreview />;
    case 'edu-join': return <JoinRefusalPreview />;
    case 'edu-projector': return <ProjectorPreview v={v} />;
    case 'edu-home': return <TeacherHomePreview state="classes" insight />;
    case 'edu-analytics': return <AnalyticsFreePreview v={v} />;
    case 'edu-host-results': return <HostResultsPreview v={v} />;
    case 'edu-setup': return <SetupPreview v={v} />;
    case 'edu-settings': return <SettingsPreview />;
    case 'edu-explainer': return <ExplainerPreview v={v} />;
    default: return null;
  }
}

export default EduPreview;
