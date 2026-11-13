'use client';

import { TeacherHomePreview } from '@/components/teacher/home/TeacherHomePreview';
import { DockPreview, JoinRefusalPreview, LobbyHudPreview } from './StudentPreviews';
import { ProjectorPreview } from './ProjectorBatchPreviews';
import { HostResultsBatchPreview, StudentResultsPreview } from './ResultsBatchPreviews';
import { LiveRoundPreview, LobbyArrivalsPreview } from './LivePreviews';
import { LiveControlsPreview, LobbyHostPreview } from './LobbyPreviews';
import { SetupBatchPreview } from './SetupBatchPreview';
import { SettingsPreview, SetupPreview } from './TeacherPreviews';
import { AnalyticsInsightPreview, ReportsPreview, UpgradePreview } from './InsightPreviews';
import { StudentHomeBatchPreview } from './StudentHomeBatchPreview';

export const EDU_PREVIEW_STATES = ['edu-dock', 'edu-results', 'edu-hud', 'edu-join', 'edu-projector', 'edu-home', 'edu-analytics', 'edu-host-results', 'edu-setup', 'edu-settings', 'edu-explainer', 'edu-lobby', 'edu-live-controls', 'edu-invite', 'edu-class-page', 'edu-classes', 'edu-library', 'edu-reports', 'edu-upgrade'] as const;

/** Dev-only fixtures for the education audit surfaces: real components, a fake socket, no writes. */
export function EduPreview({ state, v }: { state: string; v?: string }) {
  switch (state) {
    case 'edu-dock': return <DockPreview v={v} />;
    case 'edu-results': return <StudentResultsPreview v={v} />;
    case 'edu-hud': return <LobbyHudPreview />;
    case 'edu-join': return <JoinRefusalPreview />;
    case 'edu-projector': return <ProjectorPreview v={v} />;
    case 'edu-home': return <TeacherHomePreview state="classes" insight />;
    case 'edu-analytics': return <AnalyticsInsightPreview v={v} />;
    case 'edu-host-results': return <HostResultsBatchPreview v={v} />;
    case 'edu-setup': return <SetupPreview v={v} />;
    case 'edu-settings': return <SettingsPreview />;
    case 'edu-explainer': return <UpgradePreview v="explainer" />;
    case 'edu-reports': return <ReportsPreview v={v} />;
    case 'edu-upgrade': return <UpgradePreview v={v} />;
    case 'edu-combo': case 'edu-rival': case 'edu-claim': return <LiveRoundPreview state={state} v={v} />;
    case 'edu-arrivals': return <LobbyArrivalsPreview study={v === 'study'} />;
    case 'edu-lobby': return <LobbyHostPreview v={v} />;
    case 'edu-live-controls': return <LiveControlsPreview v={v} />;
    case 'edu-invite': case 'edu-class-page': case 'edu-classes': case 'edu-library': return <SetupBatchPreview state={state} v={v} />;
    case 'edu-student-home': case 'edu-join-flow': return <StudentHomeBatchPreview state={state} v={v} />;
    default: return null;
  }
}

export default EduPreview;
