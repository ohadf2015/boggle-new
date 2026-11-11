/**
 * Acceptance for the teacher-aware delete confirm (t_2365e778).
 *
 * A teacher who owns 1 class / 19 members / 15 rounds sees the counts, the
 * three lighter exits, and the reason picker in en/es/he. A player sees the
 * standard confirm, not the roster warning.
 */
import { vi, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeleteAccountSection from '@/components/settings/DeleteAccountSection';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateKey } from '@/lib/i18n/serverTranslate';
import type { DeleteImpactSummary } from '@/lib/account/deleteAccountImpact';

vi.mock('framer-motion', () => {
  const strip = (props: Record<string, unknown>) => {
    const { whileHover, whileTap, animate, initial, exit, transition, variants, ...rest } = props;
    return rest;
  };
  return {
    m: {
      section: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <section {...strip(props)}>{children}</section>,
      div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...strip(props)}>{children}</div>,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/contexts/AuthContext');
vi.mock('@/contexts/LanguageContext');
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/lib/education/teacherDeleteTelemetry', () => ({
  trackTeacherDeleteViewed: vi.fn(),
  trackTeacherDeleteReasonSelected: vi.fn(),
  trackTeacherDeleteAlternativeChosen: vi.fn(),
  trackTeacherDeleteConfirmed: vi.fn(),
}));

const impactState = {
  impact: null as DeleteImpactSummary | null,
};
vi.mock('@/lib/account/useDeleteImpact', () => ({
  useDeleteImpact: () => ({ impact: impactState.impact, isLoading: false, reload: vi.fn() }),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const FREE_BILLING = { tier: 'free' as const, status: null, renews: false, portalUrl: null };

const COSTA_RICA: DeleteImpactSummary = {
  isTeacher: true,
  classrooms: [{ id: 'c4efdd30', name: 'Period 3', studentCount: 19 }],
  totalStudents: 19,
  roundsPlayed: 15,
  emailSubscribed: true,
  billing: FREE_BILLING,
  perClassDeleteAvailable: true,
};

const PLAYER: DeleteImpactSummary = {
  isTeacher: false,
  classrooms: [],
  totalStudents: 0,
  roundsPlayed: 0,
  emailSubscribed: true,
  billing: { tier: null, status: null, renews: false, portalUrl: null },
  perClassDeleteAvailable: false,
};

const LOCALES = ['en', 'es', 'he'] as const;

const TEACHER_COPY = {
  en: {
    summary: '1 class, 19 students, 15 rounds and their reports will be permanently deleted.',
    stop: 'Just stop the emails',
    free: 'The free plan stays free',
    oneClass: 'Delete your class instead',
    reasonTitle: "What's the main reason? (optional)",
    reason: 'Too expensive',
    deleteButton: 'Delete',
  },
  es: {
    summary: '1 clase, 19 estudiantes, 15 partidas y sus reportes se eliminarán permanentemente.',
    stop: 'Solo dejar de recibir correos',
    free: 'El plan gratis sigue siendo gratis',
    oneClass: 'Eliminar tu clase en su lugar',
    reasonTitle: '¿Cuál es el motivo principal? (opcional)',
    reason: 'Demasiado caro',
    deleteButton: 'Eliminar',
  },
  he: {
    summary: '1 כיתה, 19 תלמידים, 15 משחקים והדוחות שלהם יימחקו לצמיתות.',
    stop: 'רק להפסיק את המיילים',
    free: 'התוכנית החינמית נשארת חינמית',
    oneClass: 'למחוק את הכיתה במקום',
    reasonTitle: 'מה הסיבה העיקרית? (אופציונלי)',
    reason: 'יקר מדי',
    deleteButton: 'מחיקה',
  },
} as const;

const PLAYER_CONFIRM = {
  en: 'This is permanent. All your progress, stats, and profile will be deleted.',
  es: 'Es permanente. Tu progreso, estadísticas y perfil se eliminarán.',
  he: 'זה בלתי הפיך. כל ההתקדמות, הסטטיסטיקות והפרופיל יימחקו.',
} as const;

function openConfirm(locale: (typeof LOCALES)[number]) {
  (useLanguage as Mock).mockReturnValue({
    t: (key: string) => translateKey(key, locale),
    language: locale,
  });
  render(<DeleteAccountSection isDarkMode={false} />);
  fireEvent.click(screen.getByText(TEACHER_COPY[locale].deleteButton));
}

beforeEach(() => {
  vi.clearAllMocks();
  impactState.impact = null;
  (useAuth as Mock).mockReturnValue({ user: { id: 'user-1' } });
});

describe('teacher delete confirm — 1 class / 19 members / 15 rounds', () => {
  for (const locale of LOCALES) {
    it(`renders counts, three alternatives, and the reason picker in ${locale}`, () => {
      impactState.impact = COSTA_RICA;
      openConfirm(locale);
      const copy = TEACHER_COPY[locale];

      expect(screen.getByTestId('teacher-delete-interstitial')).toBeInTheDocument();
      expect(screen.getByTestId('teacher-delete-impact-summary')).toHaveTextContent(copy.summary);
      expect(screen.getByText(copy.stop)).toBeInTheDocument();
      expect(screen.getByText(copy.free)).toBeInTheDocument();
      expect(screen.getByText(copy.oneClass)).toBeInTheDocument();
      expect(screen.getByTestId('teacher-delete-one-class')).toHaveAttribute(
        'href',
        `/${locale}/teacher/classroom/c4efdd30#delete`,
      );
      expect(screen.getByTestId('delete-reason-picker')).toBeInTheDocument();
      expect(screen.getByText(copy.reasonTitle)).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: copy.reason })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('DELETE')).not.toBeInTheDocument();
    });
  }

  it('hides free-stays-free when a plan renews', () => {
    impactState.impact = {
      ...COSTA_RICA,
      billing: { tier: 'pro', status: 'active', renews: true, portalUrl: null },
    };
    openConfirm('en');
    expect(screen.queryByText(TEACHER_COPY.en.free)).not.toBeInTheDocument();
    expect(screen.getByText(TEACHER_COPY.en.stop)).toBeInTheDocument();
    expect(screen.getByText(TEACHER_COPY.en.oneClass)).toBeInTheDocument();
  });
});

describe('player delete confirm', () => {
  for (const locale of LOCALES) {
    it(`shows the standard confirm, not the roster warning, in ${locale}`, () => {
      impactState.impact = PLAYER;
      openConfirm(locale);
      expect(screen.queryByTestId('teacher-delete-interstitial')).not.toBeInTheDocument();
      expect(screen.queryByText(TEACHER_COPY[locale].summary)).not.toBeInTheDocument();
      expect(screen.getByText(PLAYER_CONFIRM[locale])).toBeInTheDocument();
      expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();
      expect(screen.getByText(translateKey('settings.deleteAccountConfirmButton', locale))).toBeInTheDocument();
    });
  }
});
