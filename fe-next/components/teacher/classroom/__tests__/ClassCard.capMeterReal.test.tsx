import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown, b?: unknown) => {
      const p = (typeof a === 'object' && a !== null ? a : typeof b === 'object' && b !== null ? b : null) as Record<string, unknown> | null;
      return p ? `${k}:${JSON.stringify(p)}` : k;
    },
    language: 'en',
  }),
}));

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
const mockTrackGrowthEvent = vi.mocked(trackGrowthEvent);

vi.mock('../GoogleClassroomRosterImport', () => ({
  GoogleClassroomRosterImport: () => <div data-testid="google-roster-import" />,
}));

vi.mock('@/components/teacher/ClassroomStudentList', () => ({
  default: () => <div data-testid="classroom-student-list" />,
}));

vi.mock('@/components/teacher/ClassLimitUpsellModal', () => ({
  default: ({ isOpen, reason }: { isOpen: boolean; reason?: string }) =>
    isOpen ? <div data-testid="plan-gate-sheet" data-reason={reason ?? ''} /> : null,
}));

let proState = { hasPro: false, loading: false, source: 'polar', periodEnd: null, grant: null, grantExpired: false, refresh: vi.fn() };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));

import { ClassCard } from '../ClassCard';

const CLASSROOM = {
  id: 'cls-1',
  name: 'Period 3',
  language: 'en',
  join_code: 'ABC123',
  member_count: 12,
};

const baseProps = {
  classroom: CLASSROOM,
  expanded: false,
  onToggleExpanded: vi.fn(),
  onCopy: vi.fn(),
  onShare: vi.fn(),
  googleHref: 'https://classroom.google.com/share?url=x',
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  startGameHref: '/en/teacher?classroomId=cls-1',
};

describe('ClassCard with real StudentCapMeter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    proState = { hasPro: false, loading: false, source: 'polar', periodEnd: null, grant: null, grantExpired: false, refresh: vi.fn() };
  });

  it('renders real StudentCapMeter on classroom card with real count and fires impression with source="student_cap_classroom_card"', () => {
    render(<ClassCard {...baseProps} />);

    // Meter is rendered
    expect(screen.getByTestId('student-cap-meter')).toBeInTheDocument();

    // Real student count rendered (12 / 50 students)
    const countEl = screen.getByTestId('student-cap-count');
    expect(countEl.textContent).toContain('12');
    expect(countEl.textContent).toContain(String(FREE_TIER_LIMITS.studentsPerClass));

    // Impression event fired with classroom_card source
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', {
      product: 'teacher_pro',
      source: 'student_cap_classroom_card',
      studentCount: 12,
      limit: FREE_TIER_LIMITS.studentsPerClass,
      atCap: false,
    });

    // CTA clicked fires with classroom_card source
    const cta = screen.getByTestId('student-cap-upgrade-cta');
    fireEvent.click(cta);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', {
      cta: 'teacher_pro',
      source: 'student_cap_classroom_card',
      studentCount: 12,
      limit: FREE_TIER_LIMITS.studentsPerClass,
      atCap: false,
    });
  });

  it('hides the cap meter on classroom card for a Pro teacher', () => {
    proState = { ...proState, hasPro: true };
    render(<ClassCard {...baseProps} />);
    expect(screen.queryByTestId('student-cap-meter')).toBeNull();
    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith('iap_viewed', expect.anything());
  });
});
