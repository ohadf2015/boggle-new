/**
 * The Class tools sheet carries ONE Pro tile for missed-words homework, behind
 * the existing `reports` gate — and the gate only counts an impression while
 * the sheet is actually open (no phantom paywall views).
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('../../ClassroomManager', () => ({ default: () => null }));
vi.mock('../../assignments', () => ({ AssignmentTrackingPanel: () => null }));
vi.mock('../../analytics/AnalyticsDashboard', () => ({ AnalyticsDashboard: () => null }));
vi.mock('../../analytics/LastGameInsights', () => ({ LastGameInsights: () => null }));
vi.mock('../../StudentCapMeter', () => ({ StudentCapMeter: () => null }));
vi.mock('../../dashboard/ClassPulseSection', () => ({ ClassPulseSection: () => null }));
vi.mock('../../dashboard/ClassroomWindowProgress', () => ({ ClassroomWindowProgress: () => null }));
vi.mock('../../dashboard/TeacherOnboardingChecklist', () => ({ TeacherOnboardingChecklistLive: () => null }));
vi.mock('../../assignments/MissedWordsHomeworkCard', () => ({
  MissedWordsHomeworkCard: ({ classroomId }: { classroomId: string }) => (
    <div data-testid="homework-card">{classroomId}</div>
  ),
}));
vi.mock('../../ProGate', () => ({
  ProGate: ({ feature, active, children }: { feature: string; active?: boolean; children: React.ReactNode }) => (
    <div data-testid={`gate-${feature}`} data-active={String(active)}>{children}</div>
  ),
}));

import { HqToolsContent } from '../HqToolsContent';

const props = {
  classroomCount: 1,
  selectedClassroom: { id: 'c1', name: 'Class', member_count: 3 },
  reportsHref: '/en/teacher/reports',
  hideCreateClassroomCta: false,
  onCreateClassroom: vi.fn(),
  onCreateAssignment: vi.fn(),
  onInvite: vi.fn(),
  onPlay: vi.fn(),
  onReviewWords: vi.fn(),
};

describe('<HqToolsContent> missed-words homework tile', () => {
  it('Given a selected class, When the sheet is open, Then the homework card sits behind an ACTIVE reports gate', () => {
    render(<HqToolsContent {...props} open />);
    const gate = screen.getByTestId('gate-reports');
    expect(gate).toHaveAttribute('data-active', 'true');
    expect(gate).toContainElement(screen.getByTestId('homework-card'));
    expect(screen.getByTestId('homework-card')).toHaveTextContent('c1');
  });

  it('Given the sheet is closed, When rendered, Then the gate is inactive (no phantom impression)', () => {
    render(<HqToolsContent {...props} open={false} />);
    expect(screen.getByTestId('gate-reports')).toHaveAttribute('data-active', 'false');
  });
});
