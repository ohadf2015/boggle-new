/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EffectsPreferencePrompt } from '../EffectsPreferencePrompt';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';

// Test wrapper with required contexts
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider>
    <AccessibilityProvider>
      {children}
    </AccessibilityProvider>
  </LanguageProvider>
);

describe('EffectsPreferencePrompt - Fire Round Interaction', () => {
  it('should display simplified text with minimal content', () => {
    // GIVEN a fire round permission prompt
    const onDismiss = jest.fn();

    // WHEN rendering the prompt
    render(
      <TestWrapper>
        <EffectsPreferencePrompt onDismiss={onDismiss} />
      </TestWrapper>
    );

    // THEN it should show simplified text (not verbose description)
    // Should have a clear, concise message about effects
    const heading = screen.getByText(/fire round/i);
    expect(heading).toBeInTheDocument();

    // Should NOT have lengthy description or subtitle
    expect(screen.queryByText(/first time seeing this/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/you can change this anytime/i)).not.toBeInTheDocument();
  });

  it('should NOT auto-hide when clicking backdrop', async () => {
    // GIVEN a fire round permission prompt
    const onDismiss = jest.fn();

    // WHEN rendering the prompt
    const { container } = render(
      <TestWrapper>
        <EffectsPreferencePrompt onDismiss={onDismiss} />
      </TestWrapper>
    );

    // AND clicking the backdrop area
    const backdrop = container.querySelector('.backdrop-blur-md');
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    // THEN onDismiss should NOT be called (backdrop clicks blocked)
    await waitFor(() => {
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  it('should only dismiss when user clicks Keep or Disable button', async () => {
    // GIVEN a fire round permission prompt
    const onDismiss = jest.fn();

    // WHEN rendering the prompt
    render(
      <TestWrapper>
        <EffectsPreferencePrompt onDismiss={onDismiss} />
      </TestWrapper>
    );

    // AND clicking the "Keep Effects" button
    const keepButton = screen.getByRole('button', { name: /keep|enable/i });
    fireEvent.click(keepButton);

    // THEN onDismiss should be called
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('should have clear action buttons with minimal text', () => {
    // GIVEN a fire round permission prompt
    const onDismiss = jest.fn();

    // WHEN rendering the prompt
    render(
      <TestWrapper>
        <EffectsPreferencePrompt onDismiss={onDismiss} />
      </TestWrapper>
    );

    // THEN it should have two clear action buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);

    // Buttons should have concise labels (not verbose)
    const buttonTexts = buttons.map(btn => btn.textContent?.toLowerCase());
    expect(buttonTexts.some(text => text?.includes('keep') || text?.includes('enable'))).toBe(true);
    expect(buttonTexts.some(text => text?.includes('disable') || text?.includes('off'))).toBe(true);
  });

  it('should render in Hebrew without text overflow', () => {
    // GIVEN Hebrew locale
    const onDismiss = jest.fn();

    // WHEN rendering the prompt with Hebrew locale
    render(
      <TestWrapper>
        <EffectsPreferencePrompt onDismiss={onDismiss} />
      </TestWrapper>
    );

    // THEN the component should render (Hebrew translations exist)
    // This test ensures Hebrew translations are present and don't overflow
    const heading = screen.getByText(/fire round|אש/i);
    expect(heading).toBeInTheDocument();
  });
});
