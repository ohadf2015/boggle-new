import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchInlineHint } from '../SearchInlineHint';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

describe('SearchInlineHint', () => {
  it('dismisses on a board tap and on the button', () => {
    const onDismiss = vi.fn();
    render(
      <div>
        <div data-testid="solo-slot-board">board</div>
        <SearchInlineHint onDismiss={onDismiss} />
      </div>,
    );
    expect(screen.getByTestId('search-inline-hint')).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByTestId('solo-slot-board'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'firstLesson.inlineDismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
