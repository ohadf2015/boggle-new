import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/supabase/education', () => ({ getLessons: vi.fn(async () => ({ data: [] })) }));
const tel = vi.hoisted(() => ({ shown: vi.fn(), clicked: vi.fn() }));
vi.mock('@/lib/education/firstRoundGuideTelemetry', () => ({
  trackFirstRoundGuideShown: (a: unknown) => tel.shown(a),
  trackFirstRoundGuideClicked: (a: unknown) => tel.clicked(a),
}));

import { FirstRoundGuide } from '../FirstRoundGuide';

const t = (k: string) => k;

describe('FirstRoundGuide', () => {
  beforeEach(() => {
    tel.shown.mockReset();
    tel.clicked.mockReset();
    push.mockReset();
  });
  afterEach(cleanup);

  it('shows three guided steps and a 2-minute start link for the class', () => {
    render(<FirstRoundGuide classroomId="c1" language="he" t={t} />);
    expect(screen.getByTestId('first-round-step-1')).toHaveTextContent('eduShell.setup.firstRound.step1');
    expect(screen.getByTestId('first-round-step-2')).toHaveTextContent('eduShell.setup.firstRound.step2');
    expect(screen.getByTestId('first-round-step-3')).toHaveTextContent('eduShell.setup.firstRound.step3');
    expect(screen.getByTestId('setup-start-game')).toHaveAttribute('href', '/he/education/classroom-game?classroomId=c1&minutes=2');
  });

  it('fires shown once per mount, even across re-renders', () => {
    const { rerender } = render(<FirstRoundGuide classroomId="c1" language="en" t={t} />);
    rerender(<FirstRoundGuide classroomId="c1" language="en" t={t} />);
    expect(tel.shown).toHaveBeenCalledTimes(1);
    expect(tel.shown).toHaveBeenCalledWith({ surface: 'class_ready', locale: 'en' });
  });

  it('tracks the start-round click', async () => {
    render(<FirstRoundGuide classroomId="c1" language="en" t={t} />);
    const link = screen.getByTestId('setup-start-game');
    link.addEventListener('click', (e) => e.preventDefault());
    await userEvent.click(link);
    expect(tel.clicked).toHaveBeenCalledWith({ surface: 'class_ready', locale: 'en', step: 'start_round' });
  });

  it('tracks the practise-with-bots click and launches the private rehearsal', async () => {
    render(<FirstRoundGuide classroomId="c1" language="en" t={t} />);
    await userEvent.click(screen.getByTestId('rehearse-with-bots'));
    expect(tel.clicked).toHaveBeenCalledWith({ surface: 'class_ready', locale: 'en', step: 'practice_bots' });
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/en/education/classroom-game?flow=')));
  });
});

describe('first-round guide copy', () => {
  it('exists in all six locales', async () => {
    for (const lang of ['en', 'es', 'he', 'ja', 'ru', 'sv']) {
      const mod = await import(`@/translations/${lang}.js`);
      const root = (mod.default ?? mod) as Record<string, unknown>;
      const json = JSON.stringify(root);
      for (const key of ['"firstRound"', '"step1"', '"step2"', '"step3"', '"start"']) {
        expect(json, `${lang} ${key}`).toContain(key);
      }
    }
  });
});
