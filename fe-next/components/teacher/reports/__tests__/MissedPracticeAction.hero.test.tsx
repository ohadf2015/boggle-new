import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MissedPracticeAction } from '../MissedPracticeAction';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

describe('MissedPracticeAction as the main action', () => {
  it('carries its explanation inside one full-width button', () => {
    render(<MissedPracticeAction classroomId="c1" classroomName="5B" locked={false} hero />);
    const button = screen.getByRole('button');
    expect(button.className).toMatch(/w-full/);
    expect(within(button).getByText('eduPro.practice.hint')).toBeInTheDocument();
  });

  it('keeps the compact button and side note everywhere else', () => {
    render(<MissedPracticeAction classroomId="c1" classroomName="5B" locked={false} />);
    const button = screen.getByRole('button');
    expect(button.className).not.toMatch(/w-full/);
    expect(within(button).queryByText('eduPro.practice.hint')).toBeNull();
    expect(screen.getByText('eduPro.practice.hint')).toBeInTheDocument();
  });
});
