import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassroomGuestDemo } from '@/components/education/ClassroomGuestDemo';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/en/education/classroom-game',
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    loading: false,
    user: null,
    profile: null,
  }),
}));

vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));

describe('ClassroomGuestDemo', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('lets a guest join with a class code and never asks for email', async () => {
    const user = userEvent.setup();
    render(<ClassroomGuestDemo />);

    expect(screen.getByTestId('education-header')).toBeTruthy();
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByLabelText(/password/i)).toBeNull();

    const input = screen.getByRole('textbox');
    await user.type(input, 'abc123');
    await user.click(screen.getByTestId('guest-join-submit'));

    expect(mockPush).toHaveBeenCalledWith('/en/join/ABC123');
  });

  it('greets with the house mascot beside the title', () => {
    render(<ClassroomGuestDemo />);
    expect(screen.getByTestId('edu-mascot-welcome')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('joinByCode.title');
  });

  it('shows a wrong code on the tiles themselves, not only in the message', async () => {
    const user = userEvent.setup();
    render(<ClassroomGuestDemo />);
    await user.type(screen.getByRole('textbox'), 'x');
    await user.click(screen.getByTestId('guest-join-submit'));
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByTestId('guest-join-tiles').getAttribute('data-state')).toBe('error');
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('draws the code as six chunky tiles over one real input', async () => {
    const user = userEvent.setup();
    render(<ClassroomGuestDemo />);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    const tiles = screen.getByTestId('guest-join-tiles');
    expect(tiles.querySelectorAll('[data-tile]')).toHaveLength(6);
    expect(tiles.contains(screen.getByRole('textbox'))).toBe(true);
    await user.type(screen.getByRole('textbox'), 'ab1');
    const cells = [...tiles.querySelectorAll('[data-tile]')].map((c) => c.textContent);
    expect(cells.slice(0, 3)).toEqual(['A', 'B', '1']);
    expect(cells[3]).toBe('');
  });

  it('grows the tile row for codes longer than six', async () => {
    const user = userEvent.setup();
    render(<ClassroomGuestDemo />);
    await user.type(screen.getByRole('textbox'), 'abcd1234');
    expect(screen.getByTestId('guest-join-tiles').querySelectorAll('[data-tile]')).toHaveLength(8);
  });

  it('keeps JOIN a lipped button while waiting, then lights it lime on a darker lip', async () => {
    const user = userEvent.setup();
    render(<ClassroomGuestDemo />);
    const join = screen.getByTestId('guest-join-submit');
    expect(join.getAttribute('data-ready')).toBe('false');
    expect(join.getAttribute('aria-disabled')).toBe('true');
    expect(join.className).not.toContain('bg-neo-gray');
    expect(join.className).not.toContain('bg-neo-lime ');
    expect(join.className).toContain('shadow-[0_4px_0_0]');
    await user.type(screen.getByRole('textbox'), 'x');
    expect(join.getAttribute('data-ready')).toBe('false');
    await user.type(screen.getByRole('textbox'), 'bc123');
    expect(join.getAttribute('data-ready')).toBe('true');
    expect(join.getAttribute('aria-disabled')).toBe('false');
    expect(join.className).toContain('bg-neo-lime');
    expect(join.className).toContain('shadow-[0_4px_0_0]');
    expect(join.className).toContain('shadow-neo-lime-dark');
  });

  it('says where the code is once, as a live line under the headline, not a subtitle plus a pill', () => {
    render(<ClassroomGuestDemo />);
    const live = screen.getByTestId('guest-join-live');
    const column = screen.getByTestId('guest-join-column');
    expect(live.textContent).toContain('joinByCode.waiting');
    expect(column.contains(live)).toBe(true);
    expect(screen.queryByText('joinByCode.subtitle')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).compareDocumentPosition(live) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('paints empty tiles lime-tinted with the next one cyan, never flat grey', () => {
    render(<ClassroomGuestDemo />);
    const tiles = [...screen.getByTestId('guest-join-tiles').querySelectorAll('[data-tile]')];
    expect(tiles[0].className).toContain('border-neo-cyan');
    for (const tile of tiles.slice(1)) {
      expect(tile.className).toContain('bg-neo-lime/');
      expect(tile.className).not.toContain('bg-neo-cream/85');
    }
  });

  it('turns the mascot to cheer when the code is ready and to oops on a wrong code', async () => {
    const user = userEvent.setup();
    render(<ClassroomGuestDemo />);
    await user.type(screen.getByRole('textbox'), 'x');
    await user.click(screen.getByTestId('guest-join-submit'));
    expect(screen.getByTestId('edu-mascot-error')).toBeTruthy();
    await user.type(screen.getByRole('textbox'), 'bc123');
    expect(screen.getByTestId('edu-mascot-success')).toBeTruthy();
  });

  it('draws the waiting JOIN as a lime outline so it reads as the next step, not a dead bar', () => {
    render(<ClassroomGuestDemo />);
    const join = screen.getByTestId('guest-join-submit');
    expect(join.className).toContain('border-neo-lime');
    expect(join.className).toContain('text-neo-lime');
    expect(join.className).not.toContain('text-neo-cream/60');
  });

  it('centres the card vertically at every size and sets a big headline', () => {
    render(<ClassroomGuestDemo />);
    const stage = screen.getByTestId('guest-join-stage');
    expect(stage.className).toContain('justify-center');
    expect(stage.className).not.toContain('sm:justify-center');
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('text-[2rem]');
  });

  it('sets JOIN directly under the code field in one centred column', () => {
    render(<ClassroomGuestDemo />);
    const column = screen.getByTestId('guest-join-column');
    const input = screen.getByRole('textbox');
    const join = screen.getByTestId('guest-join-submit');
    expect(column.contains(input)).toBe(true);
    expect(column.contains(join)).toBe(true);
    expect(column.parentElement?.className).toContain('max-w-[37.5rem]');
    expect(column.parentElement?.className).toContain('lg:max-w-[46rem]');
    expect(input.compareDocumentPosition(join) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId('guest-join-footer')).toBeNull();
  });

  it('shows what comes after the code: name, then play, with the code step current', () => {
    render(<ClassroomGuestDemo />);
    const steps = screen.getByTestId('guest-join-steps');
    const items = steps.querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[0].getAttribute('aria-current')).toBe('step');
    expect(steps.textContent).toContain('joinByCode.stepCode');
    expect(steps.textContent).toContain('joinByCode.stepName');
    expect(steps.textContent).toContain('joinByCode.stepPlay');
  });

  it('fills the stepper track toward the name step once the code is ready', async () => {
    const user = userEvent.setup();
    render(<ClassroomGuestDemo />);
    const fill = screen.getByTestId('guest-join-steps-fill');
    expect(fill.getAttribute('data-progress')).toBe('0');
    await user.type(screen.getByRole('textbox'), 'abc123');
    expect(fill.getAttribute('data-progress')).toBe('1');
  });

  it('does not link to consumer multiplayer or the access signup wall', () => {
    const { container } = render(<ClassroomGuestDemo />);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') || '');
    expect(hrefs.some((h) => h.includes('quickPlay=true'))).toBe(false);
    expect(hrefs.some((h) => h.includes('/education/access'))).toBe(false);
  });
});
