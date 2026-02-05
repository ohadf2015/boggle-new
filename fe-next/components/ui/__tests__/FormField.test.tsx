/**
 * FormField Component Tests
 *
 * Tests for the accessible form field wrapper component.
 * Verifies WCAG 2.0 AA / Israeli Standard 5568 compliance.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormField } from '../FormField';

// Simple input component for testing
const TestInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => <input ref={ref} {...props} />);
TestInput.displayName = 'TestInput';

describe('FormField', () => {
  describe('label association', () => {
    it('associates label with input via htmlFor/id', () => {
      render(
        <FormField id="test-input" label="Test Label">
          <TestInput />
        </FormField>
      );

      const input = screen.getByRole('textbox');
      const label = screen.getByText('Test Label');

      expect(label).toHaveAttribute('for', 'test-input');
      expect(input).toHaveAttribute('id', 'test-input');
    });

    it('label has correct htmlFor attribute for focus behavior', () => {
      // Note: JSDOM doesn't fully implement label-click-focus behavior,
      // but browsers handle this correctly when htmlFor matches input id.
      // This test verifies the correct attributes are set.
      render(
        <FormField id="test-input" label="Test Label">
          <TestInput />
        </FormField>
      );

      const label = screen.getByText('Test Label');
      const input = screen.getByRole('textbox');

      // Verify the association exists (browser handles the actual focus behavior)
      expect(label).toHaveAttribute('for', 'test-input');
      expect(input).toHaveAttribute('id', 'test-input');
    });
  });

  describe('required field indication', () => {
    it('shows visual required indicator', () => {
      render(
        <FormField id="test-input" label="Test Label" required>
          <TestInput />
        </FormField>
      );

      const asterisk = screen.getByText('*');
      expect(asterisk).toBeInTheDocument();
      expect(asterisk).toHaveAttribute('aria-hidden', 'true');
    });

    it('provides screen reader text for required fields', () => {
      render(
        <FormField id="test-input" label="Test Label" required>
          <TestInput />
        </FormField>
      );

      expect(screen.getByText('(required)')).toHaveClass('sr-only');
    });

    it('sets aria-required on input', () => {
      render(
        <FormField id="test-input" label="Test Label" required>
          <TestInput />
        </FormField>
      );

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
    });

    it('does not set aria-required when not required', () => {
      render(
        <FormField id="test-input" label="Test Label">
          <TestInput />
        </FormField>
      );

      expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-required');
    });
  });

  describe('error handling', () => {
    it('displays error message', () => {
      render(
        <FormField id="test-input" label="Test Label" error="This field is required">
          <TestInput />
        </FormField>
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('error message has role="alert" for screen reader announcement', () => {
      render(
        <FormField id="test-input" label="Test Label" error="This field is required">
          <TestInput />
        </FormField>
      );

      expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    });

    it('sets aria-invalid on input when error exists', () => {
      render(
        <FormField id="test-input" label="Test Label" error="Error">
          <TestInput />
        </FormField>
      );

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('does not set aria-invalid when no error', () => {
      render(
        <FormField id="test-input" label="Test Label">
          <TestInput />
        </FormField>
      );

      expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
    });

    it('associates error message with input via aria-describedby', () => {
      render(
        <FormField id="test-input" label="Test Label" error="Error message">
          <TestInput />
        </FormField>
      );

      const input = screen.getByRole('textbox');
      const errorId = input.getAttribute('aria-describedby');

      expect(errorId).toBe('test-input-error');
      expect(document.getElementById('test-input-error')).toHaveTextContent('Error message');
    });
  });

  describe('hint text', () => {
    it('displays hint text when provided', () => {
      render(
        <FormField id="test-input" label="Test Label" hint="Enter your username">
          <TestInput />
        </FormField>
      );

      expect(screen.getByText('Enter your username')).toBeInTheDocument();
    });

    it('associates hint text with input via aria-describedby', () => {
      render(
        <FormField id="test-input" label="Test Label" hint="Hint text">
          <TestInput />
        </FormField>
      );

      const input = screen.getByRole('textbox');
      const hintId = input.getAttribute('aria-describedby');

      expect(hintId).toBe('test-input-hint');
      expect(document.getElementById('test-input-hint')).toHaveTextContent('Hint text');
    });

    it('hides hint when error is present (error takes priority)', () => {
      render(
        <FormField id="test-input" label="Test Label" hint="Hint text" error="Error text">
          <TestInput />
        </FormField>
      );

      expect(screen.queryByText('Hint text')).not.toBeInTheDocument();
      expect(screen.getByText('Error text')).toBeInTheDocument();
    });

    it('points aria-describedby to error when both hint and error exist', () => {
      render(
        <FormField id="test-input" label="Test Label" hint="Hint text" error="Error text">
          <TestInput />
        </FormField>
      );

      const input = screen.getByRole('textbox');
      expect(input.getAttribute('aria-describedby')).toBe('test-input-error');
    });
  });

  describe('custom className', () => {
    it('applies custom className to wrapper', () => {
      const { container } = render(
        <FormField id="test-input" label="Test Label" className="custom-class">
          <TestInput />
        </FormField>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('accessibility compliance', () => {
    it('input is focusable', () => {
      render(
        <FormField id="test-input" label="Test Label">
          <TestInput />
        </FormField>
      );

      const input = screen.getByRole('textbox');
      input.focus();
      expect(input).toHaveFocus();
    });

    it('maintains child element props', () => {
      render(
        <FormField id="test-input" label="Test Label">
          <TestInput placeholder="Enter text" type="email" />
        </FormField>
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'Enter text');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('works with textarea', () => {
      render(
        <FormField id="test-textarea" label="Comments">
          <textarea />
        </FormField>
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('id', 'test-textarea');
    });

    it('works with select', () => {
      render(
        <FormField id="test-select" label="Country">
          <select>
            <option value="us">United States</option>
            <option value="il">Israel</option>
          </select>
        </FormField>
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('id', 'test-select');
    });
  });
});
