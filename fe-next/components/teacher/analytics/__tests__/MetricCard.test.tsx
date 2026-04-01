/**
 * MetricCard Component Tests
 *
 * Tests the MetricCard component with Neo-brutalist styling
 * and support for trends, severity levels, and actionable buttons.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MetricCard } from '../MetricCard';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { TrendingUp } from 'lucide-react';

// ============================================
// TEST HELPERS
// ============================================

const renderMetricCard = (props: React.ComponentProps<typeof MetricCard>) => {
  return render(
    <LanguageProvider>
      <MetricCard {...props} />
    </LanguageProvider>
  );
};

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('MetricCard - Basic Rendering', () => {
  it('renders title and value', () => {
    renderMetricCard({
      title: 'Students Needing Help',
      value: 5,
      icon: <TrendingUp data-testid="icon" />,
    });

    expect(screen.getByText('Students Needing Help')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders icon', () => {
    renderMetricCard({
      title: 'Test Metric',
      value: 10,
      icon: <TrendingUp data-testid="metric-icon" />,
    });

    expect(screen.getByTestId('metric-icon')).toBeInTheDocument();
  });

  it('renders string value', () => {
    renderMetricCard({
      title: 'Class Average',
      value: '85%',
      icon: <TrendingUp data-testid="icon" />,
    });

    expect(screen.getByText('85%')).toBeInTheDocument();
  });
});

// ============================================
// TREND INDICATOR TESTS
// ============================================

describe('MetricCard - Trend Indicator', () => {
  it('renders trend indicator when trend provided', () => {
    renderMetricCard({
      title: 'Metric',
      value: 100,
      icon: <TrendingUp data-testid="icon" />,
      trend: 'up',
      trendValue: '+12%',
    });

    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('does not render trend indicator when trend not provided', () => {
    renderMetricCard({
      title: 'Metric',
      value: 100,
      icon: <TrendingUp data-testid="icon" />,
    });

    // No trend elements should be present
    const container = screen.getByTestId('metric-card');
    expect(container.textContent).not.toContain('%');
  });

  it('renders up trend with correct styling', () => {
    renderMetricCard({
      title: 'Metric',
      value: 100,
      icon: <TrendingUp data-testid="icon" />,
      trend: 'up',
      trendValue: '+5%',
    });

    const trendElement = screen.getByText('+5%').parentElement;
    expect(trendElement).toHaveClass('text-black');
    expect(trendElement).toHaveClass('bg-neo-cyan/20');
  });

  it('renders down trend with correct styling', () => {
    renderMetricCard({
      title: 'Metric',
      value: 100,
      icon: <TrendingUp data-testid="icon" />,
      trend: 'down',
      trendValue: '-5%',
    });

    const trendElement = screen.getByText('-5%').parentElement;
    expect(trendElement).toHaveClass('text-neo-pink');
    expect(trendElement).toHaveClass('bg-neo-pink/10');
  });

  it('renders neutral trend with correct styling', () => {
    renderMetricCard({
      title: 'Metric',
      value: 100,
      icon: <TrendingUp data-testid="icon" />,
      trend: 'neutral',
      trendValue: '0%',
    });

    const trendElement = screen.getByText('0%').parentElement;
    expect(trendElement).toHaveClass('text-black/60');
    expect(trendElement).toHaveClass('bg-black/5');
  });
});

// ============================================
// SEVERITY STYLING TESTS
// ============================================

describe('MetricCard - Severity Styling', () => {
  it('applies info severity styling', () => {
    renderMetricCard({
      title: 'Metric',
      value: 100,
      icon: <TrendingUp data-testid="icon" />,
      severity: 'info',
    });

    const card = screen.getByTestId('metric-card');
    // Card has border-black; severity affects the colored header bg
    expect(card).toHaveClass('border-black');
    // Header should have bg-neo-cyan
    const header = card.firstElementChild;
    expect(header).toHaveClass('bg-neo-cyan');
  });

  it('applies warning severity styling', () => {
    renderMetricCard({
      title: 'Metric',
      value: 100,
      icon: <TrendingUp data-testid="icon" />,
      severity: 'warning',
    });

    const card = screen.getByTestId('metric-card');
    const header = card.firstElementChild;
    expect(header).toHaveClass('bg-neo-lime');
  });

  it('applies urgent severity styling', () => {
    renderMetricCard({
      title: 'Metric',
      value: 100,
      icon: <TrendingUp data-testid="icon" />,
      severity: 'urgent',
    });

    const card = screen.getByTestId('metric-card');
    const header = card.firstElementChild;
    expect(header).toHaveClass('bg-neo-pink');
  });

  it('applies default styling when no severity provided', () => {
    renderMetricCard({
      title: 'Metric',
      value: 100,
      icon: <TrendingUp data-testid="icon" />,
    });

    const card = screen.getByTestId('metric-card');
    // Default severity is 'info' which uses neo-cyan header
    const header = card.firstElementChild;
    expect(header).toHaveClass('bg-neo-cyan');
  });
});

// ============================================
// ACTIONABLE BUTTON TESTS
// ============================================

describe('MetricCard - Actionable Button', () => {
  it('renders actionable button when action provided', () => {
    renderMetricCard({
      title: 'Metric',
      value: 100,
      icon: <TrendingUp data-testid="icon" />,
      actionable: {
        label: 'View Details',
        onClick: vi.fn(),
      },
    });

    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Details' })).toBeInTheDocument();
  });

  it('does not render button when action not provided', () => {
    renderMetricCard({
      title: 'Metric',
      value: 100,
      icon: <TrendingUp data-testid="icon" />,
    });

    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });

  it('calls onClick when actionable button clicked', () => {
    const handleClick = vi.fn();

    renderMetricCard({
      title: 'Metric',
      value: 100,
      icon: <TrendingUp data-testid="icon" />,
      actionable: {
        label: 'Click Me',
        onClick: handleClick,
      },
    });

    const button = screen.getByRole('button', { name: 'Click Me' });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

// ============================================
// TEST ID TESTS
// ============================================

describe('MetricCard - Test ID', () => {
  it('applies testId when provided', () => {
    renderMetricCard({
      title: 'Metric',
      value: 100,
      icon: <TrendingUp data-testid="icon" />,
      testId: 'custom-metric',
    });

    expect(screen.getByTestId('custom-metric')).toBeInTheDocument();
  });

  it('uses default testId when not provided', () => {
    renderMetricCard({
      title: 'Metric',
      value: 100,
      icon: <TrendingUp data-testid="icon" />,
    });

    expect(screen.getByTestId('metric-card')).toBeInTheDocument();
  });
});
