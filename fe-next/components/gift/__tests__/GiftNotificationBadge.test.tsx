/**
 * GiftNotificationBadge Component Tests
 *
 * Tests for the gift notification badge that shows unclaimed gift count
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => {
  const stripFramerProps = (props: Record<string, unknown>) => {
    const {
      whileHover,
      whileTap,
      animate,
      initial,
      exit,
      transition,
      variants,
      ...rest
    } = props;
    return rest;
  };
  return {
    m: {
      div: ({
        children,
        ...props
      }: React.PropsWithChildren<Record<string, unknown>>) => (
        <div {...stripFramerProps(props)}>{children}</div>
      ),
      span: ({
        children,
        ...props
      }: React.PropsWithChildren<Record<string, unknown>>) => (
        <span {...stripFramerProps(props)}>{children}</span>
      ),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

import { GiftNotificationBadge } from '../GiftNotificationBadge';

describe('GiftNotificationBadge', () => {
  describe('Rendering', () => {
    it('renders nothing when count is 0', () => {
      const { container } = render(<GiftNotificationBadge count={0} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when count is negative', () => {
      const { container } = render(<GiftNotificationBadge count={-1} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders badge when count is 1', () => {
      render(<GiftNotificationBadge count={1} />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders badge with correct count', () => {
      render(<GiftNotificationBadge count={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('displays 99+ for counts over 99', () => {
      render(<GiftNotificationBadge count={100} />);
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('displays 99+ for count exactly 100', () => {
      render(<GiftNotificationBadge count={100} />);
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('displays 99 for count exactly 99', () => {
      render(<GiftNotificationBadge count={99} />);
      expect(screen.getByText('99')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<GiftNotificationBadge count={1} className="custom-class" />);
      const badge = screen.getByText('1').closest('div');
      expect(badge).toHaveClass('custom-class');
    });

    it('has neo-brutalist styling classes', () => {
      render(<GiftNotificationBadge count={1} />);
      const badge = screen.getByText('1').closest('div');
      expect(badge).toHaveClass('bg-neo-pink');
      expect(badge).toHaveClass('border-neo-black');
      expect(badge).toHaveClass('rounded-full');
    });

    it('is absolutely positioned', () => {
      render(<GiftNotificationBadge count={1} />);
      const badge = screen.getByText('1').closest('div');
      expect(badge).toHaveClass('absolute');
    });
  });
});
