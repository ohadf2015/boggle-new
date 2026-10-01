/**
 * Class tools as tight summary cards with details on demand: the sheet opens
 * on one screen of cards; a card drills into its section; every section stays
 * mounted so paywall impressions and the checklist keep their contracts.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: 'en',
  }),
}));
vi.mock('../../ClassroomManager', () => ({ default: () => <div data-testid="classroom-manager" /> }));
vi.mock('../../assignments', () => ({ AssignmentTrackingPanel: () => <div data-testid="assignment-tracking" /> }));
vi.mock('../../analytics/AnalyticsDashboard', () => ({ AnalyticsDashboard: () => <div data-testid="analytics" /> }));
vi.mock('../../analytics/LastGameInsights', () => ({ LastGameInsights: () => <div data-testid="last-game-insights" /> }));
vi.mock('../../StudentCapMeter', () => ({ StudentCapMeter: () => <div data-testid="cap-meter" /> }));
vi.mock('../../dashboard/ClassPulseSection', () => ({ ClassPulseSection: () => <div data-testid="pulse" /> }));
vi.mock('../../dashboard/ClassroomWindowProgress', () => ({ ClassroomWindowProgress: () => <div data-testid="window-progress" /> }));
vi.mock('../../dashboard/TeacherOnboardingChecklist', () => ({
  TeacherOnboardingChecklistLive: () => <div data-testid="teacher-onboarding-checklist" />,
}));
vi.mock('../../assignments/MissedWordsHomeworkCard', () => ({ MissedWordsHomeworkCard: () => <div data-testid="homework-card" /> }));
vi.mock('../../ProGate', () => ({
  ProGate: ({ feature, active, children }: { feature: string; active?: boolean; children: React.ReactNode }) => (
    <div data-testid={`gate-${feature}`} data-active={String(active)}>{children}</div>
  ),
}));

import { HqToolsContent, type HqToolsPanel } from '../HqToolsContent';

function setup(overrides: Partial<React.ComponentProps<typeof HqToolsContent>> = {}) {
  let panel: HqToolsPanel = 'home';
  const onPanelChange = vi.fn((p: HqToolsPanel) => {
    panel = p;
  });
  const props = {
    open: true,
    classroomCount: 2,
    selectedClassroom: { id: 'c1', name: 'Class', member_count: 12, join_code: 'ABC234' },
    assignmentCount: 3,
    reportsHref: '/en/teacher/reports',
    hideCreateClassroomCta: false,
    onCreateClassroom: vi.fn(),
    onCreateAssignment: vi.fn(),
    onInvite: vi.fn(),
    onPlay: vi.fn(),
    onReviewWords: vi.fn(),
    panel,
    onPanelChange,
    ...overrides,
  };
  const utils = render(<HqToolsContent {...props} />);
  return { ...utils, props, onPanelChange, getPanel: () => panel };
}

describe('<HqToolsContent> — summary cards, details on demand', () => {
  it('Given the home view, Then each class tool is ONE summary card and every detail section is hidden', () => {
    setup();
    for (const id of ['students', 'progress', 'assignments', 'analytics', 'classes']) {
      expect(screen.getByTestId(`hq-tool-card-${id}`)).toBeInTheDocument();
    }
    for (const id of ['students', 'progress', 'lastGame', 'assignments', 'analytics', 'classes']) {
      expect(screen.getByTestId(`hq-tools-panel-${id}`)).toHaveAttribute('hidden');
    }
    // The dock's "Last game" shortcut already opens that section — no second card for it.
    expect(screen.queryByTestId('hq-tool-card-lastGame')).toBeNull();
    expect(screen.getByTestId('hq-tools-home')).not.toHaveAttribute('hidden');
  });

  it('Given live data, Then the cards count up to it — students, assignments, classes', async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByTestId('hq-tool-card-students')).toHaveTextContent('12');
      expect(screen.getByTestId('hq-tool-card-assignments')).toHaveTextContent('3');
      expect(screen.getByTestId('hq-tool-card-classes')).toHaveTextContent('2');
    });
  });

  it('When a card is tapped, Then it asks for that panel', () => {
    const { onPanelChange } = setup();
    fireEvent.click(screen.getByTestId('hq-tool-card-analytics'));
    expect(onPanelChange).toHaveBeenCalledWith('analytics');
  });

  it('Given a drilled-in panel, Then only it shows, with a way back to the cards', () => {
    const { onPanelChange } = setup({ panel: 'lastGame' });
    expect(screen.getByTestId('hq-tools-home')).toHaveAttribute('hidden');
    expect(screen.getByTestId('hq-tools-panel-lastGame')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('hq-tools-panel-classes')).toHaveAttribute('hidden');
    fireEvent.click(screen.getByTestId('hq-tools-back'));
    expect(onPanelChange).toHaveBeenCalledWith('home');
  });

  it('Given the sheet is open on the home view, Then hidden sections stay mounted and both paywalls are active', () => {
    setup();
    expect(screen.getByTestId('last-game-insights')).toBeInTheDocument();
    expect(screen.getByTestId('gate-reports')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('gate-analytics')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('teacher-onboarding-checklist')).toBeInTheDocument();
  });

  it('Given no class yet, Then only the classes card is offered', () => {
    setup({ selectedClassroom: null, classroomCount: 0 });
    expect(screen.getByTestId('hq-tool-card-classes')).toBeInTheDocument();
    expect(screen.queryByTestId('hq-tool-card-students')).toBeNull();
  });

  it('Given hidden panels, Then no display utility fights the hidden attribute', () => {
    setup();
    for (const id of ['students', 'progress', 'lastGame', 'assignments', 'analytics', 'classes']) {
      expect(screen.getByTestId(`hq-tools-panel-${id}`).className).not.toMatch(/(^|\s)(flex|grid|block)(\s|$)/);
    }
  });
});
