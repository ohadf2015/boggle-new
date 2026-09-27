import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UnauthenticatedCreateChallengeSection } from '../UnauthenticatedCreateChallengeSection';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock InteractiveMascot
vi.mock('../../ui/InteractiveMascot', () => ({
  InteractiveMascot: ({ variant, tooltip }: any) => (
    <div data-testid="mascot" data-variant={variant} title={tooltip}>
      Mascot
    </div>
  ),
}));

// Mock Button component
vi.mock('../../ui/button', () => ({
  Button: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className} data-testid="cta-button">
      {children}
    </button>
  ),
}));

describe('UnauthenticatedCreateChallengeSection', () => {
  const mockT = (key: string) => {
    const translations: Record<string, string> = {
      'daily.createChallengeFeature.title': 'Create Custom Word Hunt Challenges',
      'daily.createChallengeFeature.subtitle': 'Design your own puzzles and challenge friends',
      'daily.createChallengeFeature.benefits.customPuzzles': 'Design puzzles with your own target words',
      'daily.createChallengeFeature.benefits.chooseDifficulty': 'Pick 5×5 or 7×7 grid difficulty',
      'daily.createChallengeFeature.benefits.shareInstantly': 'Share with a link - no app needed',
      'daily.createChallengeFeature.benefits.trackResults': 'See who beats your challenge',
      'daily.createChallengeFeature.ctaButton': 'Sign Up to Start Creating',
      'daily.createChallengeFeature.socialProof': 'Join thousands creating challenges',
    };
    return translations[key] || key;
  };

  const mockOnAuthRequired = vi.fn();

  const defaultProps = {
    language: 'en' as const,
    t: mockT,
    onAuthRequired: mockOnAuthRequired,
  };

  it('renders the component with all elements', () => {
    render(<UnauthenticatedCreateChallengeSection {...defaultProps} />);

    // Check title and subtitle
    expect(screen.getByText('Create Custom Word Hunt Challenges')).toBeInTheDocument();
    expect(screen.getByText('Design your own puzzles and challenge friends')).toBeInTheDocument();

    // Check mascot
    expect(screen.getByTestId('mascot')).toBeInTheDocument();
    expect(screen.getByTestId('mascot')).toHaveAttribute('data-variant', 'excited');

    // Check all benefits
    expect(screen.getByText('Design puzzles with your own target words')).toBeInTheDocument();
    expect(screen.getByText('Pick 5×5 or 7×7 grid difficulty')).toBeInTheDocument();
    expect(screen.getByText('Share with a link - no app needed')).toBeInTheDocument();
    expect(screen.getByText('See who beats your challenge')).toBeInTheDocument();

    // Check CTA button
    expect(screen.getByTestId('cta-button')).toBeInTheDocument();
    expect(screen.getByText('Sign Up to Start Creating')).toBeInTheDocument();

    // Check social proof
    expect(screen.getByText('Join thousands creating challenges')).toBeInTheDocument();
  });

  it('has CTA button with onClick handler', () => {
    render(<UnauthenticatedCreateChallengeSection {...defaultProps} />);

    const button = screen.getByTestId('cta-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Sign Up to Start Creating');
  });

  it('has proper accessibility structure', () => {
    render(<UnauthenticatedCreateChallengeSection {...defaultProps} />);

    // Check for heading
    const heading = screen.getByText('Create Custom Word Hunt Challenges');
    expect(heading.tagName).toBe('H3');

    // Check for proper semantic structure
    const button = screen.getByTestId('cta-button');
    expect(button.tagName).toBe('BUTTON');
  });

  it('renders all benefit icons', () => {
    const { container } = render(<UnauthenticatedCreateChallengeSection {...defaultProps} />);

    // Check that lucide icons are rendered (they use SVG)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('applies Neo-Brutalist design classes', () => {
    const { container } = render(<UnauthenticatedCreateChallengeSection {...defaultProps} />);

    // Check for Neo-Brutalist specific classes
    expect(container.querySelector('.rounded-neo')).toBeInTheDocument();
    expect(container.querySelector('.border-neo-black')).toBeInTheDocument();
    expect(container.querySelector('.shadow-hard-lg')).toBeInTheDocument();
  });

  it('calls onAuthRequired when CTA button is clicked', () => {
    render(<UnauthenticatedCreateChallengeSection {...defaultProps} />);

    const button = screen.getByTestId('cta-button');
    fireEvent.click(button);

    expect(mockOnAuthRequired).toHaveBeenCalledTimes(1);
  });
});
