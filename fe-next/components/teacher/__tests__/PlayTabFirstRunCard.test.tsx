/**
 * The zero-classroom card, after the declutter.
 *
 * It used to be a form: a name field, a Create button, and a card the size of
 * the PLAY NOW panel sitting right under it — a second way to do what GO LIVE
 * already does silently. Two paths to one state is how they drift (pitfall
 * class 3), and on a phone it pushed the one button off the screen.
 *
 * What must survive the cut is the JOIN CODE. It is the only thing on the
 * dashboard a teacher can paste into Google Classroom, and if this card stops
 * producing one, a first-run teacher has no way to invite anybody before they
 * host. So: no form, one tap, and the code — still reachable, still copyable.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayTabFirstRunCard from '../PlayTabFirstRunCard';
import * as useClassroomHook from '@/hooks/useClassroom';

vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

describe('PlayTabFirstRunCard', () => {
  const mockCreateClassroom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // The REAL shape `useClassrooms().createClassroom` resolves with on success
    // (hooks/useClassroom.ts). It never sets a top-level `code` on success — `code` is only
    // populated on the 403 failure branch, where it carries 'CLASS_LIMIT_REACHED'.
    mockCreateClassroom.mockResolvedValue({
      success: true,
      data: { id: 'c1', name: 'My Class', join_code: 'ABC123' },
    });
    vi.mocked(useClassroomHook.useClassrooms).mockReturnValue({
      createClassroom: mockCreateClassroom,
    } as unknown as ReturnType<typeof useClassroomHook.useClassrooms>);
  });

  it('carries the mascot: this is an empty room, not an empty div', () => {
    render(<PlayTabFirstRunCard />);
    expect(screen.getByTestId('teacher-empty-classroom-art').getAttribute('src')).toContain(
      'hero-empty-classroom',
    );
  });

  it('has NO classroom-name field — GO LIVE provisions the class', () => {
    const { container } = render(<PlayTabFirstRunCard />);
    expect(container.querySelector('#classroom-name')).toBeNull();
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.querySelectorAll('form')).toHaveLength(0);
  });

  it('still reaches a join code, in ONE tap, with the default name applied silently', async () => {
    const user = userEvent.setup();
    render(<PlayTabFirstRunCard />);

    await user.click(screen.getByTestId('first-run-create-class'));

    expect(mockCreateClassroom).toHaveBeenCalledWith('teacher.classroom.defaultName', 'en');
    await waitFor(() => {
      expect(screen.getByTestId('first-run-join-code')).toHaveTextContent('ABC123');
    });
  });

  it('hands the new code up to the dashboard', async () => {
    const user = userEvent.setup();
    const onJoinCodeCreated = vi.fn();
    render(<PlayTabFirstRunCard onJoinCodeCreated={onJoinCodeCreated} />);

    await user.click(screen.getByTestId('first-run-create-class'));
    await waitFor(() => expect(onJoinCodeCreated).toHaveBeenCalledWith('ABC123'));
  });

  it('copies the invite LINK, not the bare six characters', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // `navigator.clipboard` is a getter-only property in happy-dom.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    // `fireEvent`, not `userEvent`: userEvent.setup() installs its own clipboard
    // stub over the one this test is asserting on.
    render(<PlayTabFirstRunCard initialJoinCode="ABC123" />);

    fireEvent.click(screen.getByRole('button', { name: 'teacher.classroom.copyCode' }));
    expect(writeText).toHaveBeenCalledTimes(1);
    // "ABC123" alone is a dead end for the student who receives it.
    expect(writeText.mock.calls[0][0]).toContain('ABC123');
    expect(writeText.mock.calls[0][0].length).toBeGreaterThan('ABC123'.length);
  });

  it('shows an existing code straight away, without a round trip', () => {
    render(<PlayTabFirstRunCard initialJoinCode="ZZZ999" />);
    expect(screen.getByTestId('first-run-join-code')).toHaveTextContent('ZZZ999');
    expect(screen.queryByTestId('first-run-create-class')).not.toBeInTheDocument();
  });

  it('does not tween in — a card this size fading from 0 is the mobile flash', () => {
    const { container } = render(<PlayTabFirstRunCard />);
    const card = screen.getByTestId('play-tab-first-run-card');
    expect(card.className).not.toContain('opacity-0');
    expect(container.querySelector('[style*="opacity: 0"]')).toBeNull();
  });
});
