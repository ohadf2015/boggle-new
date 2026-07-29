/**
 * WizardStep Component Tests
 *
 * Tests for multi-step wizard component with progress indicators
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { WizardStep } from '../WizardStep';
import * as _mod_contexts_LanguageContext from '@/contexts/LanguageContext';

// Mock useLanguage hook
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.step': 'Step',
        'common.of': 'of',
        'common.next': 'Next',
        'common.back': 'Back',
        'common.finish': 'Finish',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

describe('WizardStep', () => {
  describe('Progress Indicator', () => {
    it('should display current step and total steps', () => {
      render(
        <WizardStep currentStep={2} totalSteps={3}>
          <div>Step content</div>
        </WizardStep>
      );

      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();
    });

    it('should render correct number of step dots', () => {
      const { container } = render(
        <WizardStep currentStep={2} totalSteps={4}>
          <div>Step content</div>
        </WizardStep>
      );

      const dots = container.querySelectorAll('[data-testid^="step-dot-"]');
      expect(dots).toHaveLength(4);
    });

    it('should highlight current step dot', () => {
      const { container } = render(
        <WizardStep currentStep={2} totalSteps={3}>
          <div>Step content</div>
        </WizardStep>
      );

      const currentDot = container.querySelector('[data-testid="step-dot-2"]');
      expect(currentDot).toHaveClass('bg-neo-cyan');
    });

    it('should show completed dots for previous steps', () => {
      const { container } = render(
        <WizardStep currentStep={3} totalSteps={4}>
          <div>Step content</div>
        </WizardStep>
      );

      const dot1 = container.querySelector('[data-testid="step-dot-1"]');
      const dot2 = container.querySelector('[data-testid="step-dot-2"]');

      expect(dot1).toHaveClass('bg-neo-cyan');
      expect(dot2).toHaveClass('bg-neo-cyan');
    });
  });

  describe('Content Rendering', () => {
    it('should render step title when provided', () => {
      render(
        <WizardStep currentStep={1} totalSteps={2} title="Select Options">
          <div>Content</div>
        </WizardStep>
      );

      expect(screen.getByText('Select Options')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <WizardStep currentStep={1} totalSteps={2}>
          <div>Test Content</div>
        </WizardStep>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <WizardStep
          currentStep={1}
          totalSteps={2}
          description="Choose your settings"
        >
          <div>Content</div>
        </WizardStep>
      );

      expect(screen.getByText('Choose your settings')).toBeInTheDocument();
    });
  });

  describe('Navigation Buttons', () => {
    it('should show Next button when onNext is provided', () => {
      const onNext = vi.fn();

      render(
        <WizardStep currentStep={1} totalSteps={2} onNext={onNext}>
          <div>Content</div>
        </WizardStep>
      );

      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should call onNext when Next button is clicked', () => {
      const onNext = vi.fn();

      render(
        <WizardStep currentStep={1} totalSteps={2} onNext={onNext}>
          <div>Content</div>
        </WizardStep>
      );

      fireEvent.click(screen.getByText('Next'));
      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('should show Back button when onBack is provided', () => {
      const onBack = vi.fn();

      render(
        <WizardStep currentStep={2} totalSteps={3} onBack={onBack}>
          <div>Content</div>
        </WizardStep>
      );

      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should call onBack when Back button is clicked', () => {
      const onBack = vi.fn();

      render(
        <WizardStep currentStep={2} totalSteps={3} onBack={onBack}>
          <div>Content</div>
        </WizardStep>
      );

      fireEvent.click(screen.getByText('Back'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should show Finish button on last step', () => {
      const onNext = vi.fn();

      render(
        <WizardStep currentStep={3} totalSteps={3} onNext={onNext}>
          <div>Content</div>
        </WizardStep>
      );

      expect(screen.getByText('Finish')).toBeInTheDocument();
    });

    it('should disable Next button when nextDisabled is true', () => {
      const onNext = vi.fn();

      render(
        <WizardStep
          currentStep={1}
          totalSteps={2}
          onNext={onNext}
          nextDisabled={true}
        >
          <div>Content</div>
        </WizardStep>
      );

      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });

    it('should not show navigation when no handlers provided', () => {
      render(
        <WizardStep currentStep={1} totalSteps={2}>
          <div>Content</div>
        </WizardStep>
      );

      expect(screen.queryByText('Next')).not.toBeInTheDocument();
      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });
  });

  describe('Custom Button Labels', () => {
    it('should use custom next button label', () => {
      const onNext = vi.fn();

      render(
        <WizardStep
          currentStep={1}
          totalSteps={2}
          onNext={onNext}
          nextLabel="Continue"
        >
          <div>Content</div>
        </WizardStep>
      );

      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    it('should use custom back button label', () => {
      const onBack = vi.fn();

      render(
        <WizardStep
          currentStep={2}
          totalSteps={3}
          onBack={onBack}
          backLabel="Previous"
        >
          <div>Content</div>
        </WizardStep>
      );

      expect(screen.getByText('Previous')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner on Next button when loading', () => {
      const onNext = vi.fn();

      render(
        <WizardStep
          currentStep={1}
          totalSteps={2}
          onNext={onNext}
          isLoading={true}
        >
          <div>Content</div>
        </WizardStep>
      );

      const nextButton = screen.getByText('Next').closest('button');
      expect(nextButton).toHaveClass('opacity-50');
      expect(nextButton).toBeDisabled();
    });
  });

  describe('RTL Support', () => {
    it('should apply RTL styles when language is Hebrew', () => {
      // Override mock for this test
      vi.spyOn(_mod_contexts_LanguageContext, 'useLanguage').mockReturnValue({
        t: (key: string) => key,
        language: 'he',
      });

      const { container } = render(
        <WizardStep currentStep={1} totalSteps={2}>
          <div>Content</div>
        </WizardStep>
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('rtl');
    });
  });
});
