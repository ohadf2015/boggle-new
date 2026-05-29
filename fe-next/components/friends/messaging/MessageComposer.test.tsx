// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageComposer } from './MessageComposer';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'he',
    dir: 'rtl',
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'friends.typeMessage': 'Type a message...',
        'friends.sendMessage': 'Send',
        'friends.messageLimit': '{current}/{max} chars',
      };
      let result = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
      }
      return result;
    },
  }),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

describe('MessageComposer — Hebrew/IME composition', () => {
  it('REGRESSION: send button stays visually disabled during Hebrew composition (BUG)', () => {
    // Given: A composer with onSend handler
    const onSend = vi.fn();
    render(<MessageComposer onSend={onSend} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    const sendButton = screen.getByLabelText('Send') as HTMLButtonElement;

    // Initial state: send disabled
    expect(sendButton).toHaveAttribute('aria-disabled', 'true');

    // When: Simulate Android GBoard composing Hebrew text without onChange
    // firing until the word commits (the REAL Android GBoard composition
    // behavior that breaks the button visual state)
    fireEvent.compositionStart(textarea);
    // Mutate DOM value as if IME buffered text during composition
    Object.defineProperty(textarea, 'value', {
      configurable: true,
      writable: true,
      value: 'שלום',
    });
    // Fire compositionUpdate (mid-composition, before compositionEnd)
    fireEvent.compositionUpdate(textarea);

    // Then: REGRESSION — send button should NOW be visually enabled because
    // text is in the DOM (user can see it), but it stays disabled because
    // React text state is empty (onChange never fired).
    // This test MUST FAIL until we add onCompositionUpdate={handleInput}.
    expect(sendButton).toHaveAttribute('aria-disabled', 'false',
      'Button should be enabled during composition when DOM has text');
  });

  it('enables send button and sends text after IME composition ends (Android GBoard Hebrew)', () => {
    // Given: A composer with onSend handler
    const onSend = vi.fn();
    render(<MessageComposer onSend={onSend} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    const sendButton = screen.getByLabelText('Send') as HTMLButtonElement;

    // Initial state: send disabled, counter shows 0
    expect(sendButton).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('0/1000 chars')).toBeInTheDocument();

    // When: Simulate Android IME composing Hebrew without firing onChange
    // (GBoard with Hebrew: composition buffers into the DOM value but React
    // onChange may not fire until the word commits)
    fireEvent.compositionStart(textarea);
    // Directly mutate DOM value as if IME buffered composition text
    Object.defineProperty(textarea, 'value', {
      configurable: true,
      writable: true,
      value: 'שלום',
    });
    fireEvent.compositionEnd(textarea, { data: 'שלום' });

    // Then: state syncs from the DOM value
    expect(screen.getByText('4/1000 chars')).toBeInTheDocument();
    expect(sendButton).not.toBeDisabled();

    // And: clicking send emits the text
    fireEvent.click(sendButton);
    expect(onSend).toHaveBeenCalledWith('שלום');
  });

  it('sends text even when composition never ends (fallback reads DOM value)', () => {
    // Given: composer
    const onSend = vi.fn();
    render(<MessageComposer onSend={onSend} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    const sendButton = screen.getByLabelText('Send') as HTMLButtonElement;

    // When: IME writes to DOM value without compositionEnd firing
    Object.defineProperty(textarea, 'value', {
      configurable: true,
      writable: true,
      value: 'שלום',
    });
    fireEvent.input(textarea);

    // Then: send button becomes enabled and click sends the buffered text
    expect(sendButton).not.toBeDisabled();
    fireEvent.click(sendButton);
    expect(onSend).toHaveBeenCalledWith('שלום');
  });
});
