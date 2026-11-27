import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProfileBackButtons } from '../ProfileBackButtons';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));

describe('ProfileBackButtons', () => {
  it('Given no open room, Then it renders nothing (the header and tab bar already go back)', () => {
    const { container } = render(<ProfileBackButtons activeGameSession={null} isDarkMode />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('profile.backToGame')).not.toBeInTheDocument();
  });

  it('Given an open room, Then one chunky button returns to it', () => {
    render(<ProfileBackButtons activeGameSession={{ gameCode: 'K7Q2' }} isDarkMode />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent('profile.backToRoom K7Q2');
    expect(buttons[0].className).toContain('data-[pressed=true]:translate-y-[4px]');
    fireEvent.click(buttons[0]);
    expect(push).toHaveBeenCalledWith('/en');
  });
});
