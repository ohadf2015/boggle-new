import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockJoin, mockResolve, mockUseAuth } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, params?: Record<string, string>) =>
      k === 'eduStudent.join.funNames' ? 'Pixel Panda|Captain Otter|Turbo Toast' : params ? `${k}:${JSON.stringify(params)}` : k,
    dir: 'ltr',
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';

const nameField = () => screen.getByLabelText('education.student.join.nameLabel') as HTMLInputElement;
const goButton = () => screen.getAllByRole('button').find((b) => b.textContent?.includes('education.student.join.flow.go'))!;

describe('<JoinFlow> nickname step polish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'Ms Levy', gameCode: 'P45KRT' });
  });

  it('Given the name is refused, Then the field stays cream with dark text so the name is still readable', async () => {
    mockJoin.mockResolvedValue({ success: false, code: 'NAME_TAKEN', suggestedName: 'Zoe 2' });
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(nameField(), { target: { value: 'Zoe' } });
    fireEvent.click(goButton());
    await waitFor(() => expect(nameField()).toHaveAttribute('aria-invalid', 'true'));
    expect(nameField().className).toContain('bg-neo-cream');
    expect(nameField().className).toContain('text-neo-navy');
    expect(nameField().className).not.toMatch(/bg-neo-red\/\d+/);
  });

  it('When "surprise me" is tapped, Then a fun classroom-safe name fills the field', () => {
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.click(screen.getByRole('button', { name: 'eduStudent.join.surpriseMe' }));
    expect(['Pixel Panda', 'Captain Otter', 'Turbo Toast']).toContain(nameField().value);
  });

  it('When "surprise me" is tapped again, Then it never repeats the name already in the field', () => {
    render(<JoinFlow initialCode="P45KRT" />);
    const dice = screen.getByRole('button', { name: 'eduStudent.join.surpriseMe' });
    for (let i = 0; i < 6; i++) {
      const before = nameField().value;
      fireEvent.click(dice);
      expect(nameField().value).not.toBe(before);
    }
  });

  it('keeps the join at one primary action: the dice is not a second GO', () => {
    render(<JoinFlow initialCode="P45KRT" />);
    const dice = screen.getByRole('button', { name: 'eduStudent.join.surpriseMe' });
    expect(dice).toHaveAttribute('type', 'button');
  });
});
