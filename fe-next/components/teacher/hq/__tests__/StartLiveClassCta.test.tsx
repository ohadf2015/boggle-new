import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const capture = vi.fn();
const writeText = vi.fn().mockResolvedValue(undefined);

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fallback?: string) => (typeof fallback === 'string' ? fallback : k),
    language: 'en',
  }),
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => capture(...args),
    register: vi.fn(),
    __loaded: true,
  },
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import { StartLiveClassCta } from '../StartLiveClassCta';

describe('<StartLiveClassCta>', () => {
  beforeEach(() => {
    capture.mockClear();
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  it('Given no students, Then the panel is not in the document', () => {
    render(
      <StartLiveClassCta
        classroomId="c1"
        studentCount={0}
        assignmentCount={1}
        joinCode="AB12CD"
        onStart={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('hq-start-live-class')).toBeNull();
    expect(capture).not.toHaveBeenCalled();
  });

  it('Given students and 0 assignments, Then the panel is hidden', () => {
    render(
      <StartLiveClassCta
        classroomId="c1"
        studentCount={2}
        assignmentCount={0}
        joinCode="AB12CD"
        onStart={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('hq-start-live-class')).toBeNull();
  });

  it('Given students and an assignment, Then the CTA and join code render', () => {
    render(
      <StartLiveClassCta
        classroomId="c1"
        studentCount={2}
        assignmentCount={1}
        joinCode="AB12CD"
        onStart={vi.fn()}
      />,
    );
    expect(screen.getByTestId('hq-start-live-class')).toBeInTheDocument();
    expect(screen.getByTestId('hq-start-live-join-code')).toHaveTextContent('AB12CD');
    expect(screen.getByTestId('hq-start-live-cta')).toBeInTheDocument();
  });

  it('When the CTA is tapped, Then it fires edu_assignment_start_live_clicked and starts the live-room flow', () => {
    const onStart = vi.fn();
    render(
      <StartLiveClassCta
        classroomId="c1"
        studentCount={1}
        assignmentCount={1}
        joinCode="AB12CD"
        onStart={onStart}
      />,
    );
    fireEvent.click(screen.getByTestId('hq-start-live-cta'));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('edu_assignment_start_live_clicked', {
      classroom_id: 'c1',
    });
  });

  it('When the join link is copied, Then it fires edu_join_code_copied without putting the code on the event', async () => {
    render(
      <StartLiveClassCta
        classroomId="c1"
        studentCount={1}
        assignmentCount={1}
        joinCode="AB12CD"
        onStart={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('hq-start-live-copy'));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(capture).toHaveBeenCalledWith('edu_join_code_copied', {
      classroom_id: 'c1',
    });
    expect(JSON.stringify(capture.mock.calls)).not.toContain('AB12CD');
  });
});
