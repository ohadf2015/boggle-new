import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CollapsibleSection from '../CollapsibleSection';

// Mock framer-motion to avoid matchMedia issues
vi.mock('framer-motion', () => ({
  m: {
    div: 'div',
    span: 'span',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the useIsDesktop hook
const mockUseIsDesktop = vi.fn();
vi.mock('../../../hooks/useMediaQuery', () => ({
  useIsDesktop: () => mockUseIsDesktop(),
}));

describe('CollapsibleSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be collapsed by default on desktop when defaultExpanded is not specified', () => {
    // Desktop mode
    mockUseIsDesktop.mockReturnValue(true);

    render(
      <CollapsibleSection title="Test Section">
        <div>Test Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button', { name: /test section/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('should respect defaultExpanded prop on mobile', () => {
    // Mobile mode
    mockUseIsDesktop.mockReturnValue(false);

    render(
      <CollapsibleSection title="Test Section" defaultExpanded={true}>
        <div>Test Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button', { name: /test section/i });
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('should be collapsed by default on desktop even when defaultExpanded is true', () => {
    // Desktop mode
    mockUseIsDesktop.mockReturnValue(true);

    render(
      <CollapsibleSection title="Test Section" defaultExpanded={true}>
        <div>Test Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button', { name: /test section/i });
    // On desktop, sections should be collapsed regardless of defaultExpanded
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('should allow manual expansion on desktop', () => {
    // Desktop mode
    mockUseIsDesktop.mockReturnValue(true);

    render(
      <CollapsibleSection title="Test Section">
        <div>Test Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button', { name: /test section/i });

    // Initially collapsed
    expect(button).toHaveAttribute('aria-expanded', 'false');

    // Can still be expanded manually via user interaction
    fireEvent.click(button);

    // After click, should be expanded
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});
