import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  LessonCardSkeleton,
  ClassroomCardSkeleton,
  MetricCardSkeleton,
  PracticeCardSkeleton,
} from '../EducationSkeletons';

describe('EducationSkeletons', () => {
  describe('LessonCardSkeleton', () => {
    it('renders with structural skeleton elements', () => {
      render(<LessonCardSkeleton />);

      const skeleton = screen.getByTestId('lesson-card-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('matches lesson card structure with title, description, and words areas', () => {
      render(<LessonCardSkeleton />);

      // Should have header area (title + description)
      expect(screen.getByTestId('skeleton-title')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-description')).toBeInTheDocument();

      // Should have word list area
      expect(screen.getByTestId('skeleton-words')).toBeInTheDocument();

      // Should have action buttons area
      expect(screen.getByTestId('skeleton-actions')).toBeInTheDocument();
    });
  });

  describe('ClassroomCardSkeleton', () => {
    it('renders with structural skeleton elements', () => {
      render(<ClassroomCardSkeleton />);

      const skeleton = screen.getByTestId('classroom-card-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('matches classroom card structure with name, join code, and members areas', () => {
      render(<ClassroomCardSkeleton />);

      // Should have header area (name)
      expect(screen.getByTestId('skeleton-name')).toBeInTheDocument();

      // Should have join code area
      expect(screen.getByTestId('skeleton-join-code')).toBeInTheDocument();

      // Should have action buttons area
      expect(screen.getByTestId('skeleton-actions')).toBeInTheDocument();
    });
  });

  describe('MetricCardSkeleton', () => {
    it('renders with structural skeleton elements', () => {
      render(<MetricCardSkeleton />);

      const skeleton = screen.getByTestId('metric-card-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('matches metric card structure with label and value areas', () => {
      render(<MetricCardSkeleton />);

      // Should have label area
      expect(screen.getByTestId('skeleton-label')).toBeInTheDocument();

      // Should have value area (larger)
      expect(screen.getByTestId('skeleton-value')).toBeInTheDocument();
    });
  });

  describe('PracticeCardSkeleton', () => {
    it('renders with structural skeleton elements', () => {
      render(<PracticeCardSkeleton />);

      const skeleton = screen.getByTestId('practice-card-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('matches practice card structure with definition and input areas', () => {
      render(<PracticeCardSkeleton />);

      // Should have definition area
      expect(screen.getByTestId('skeleton-definition')).toBeInTheDocument();

      // Should have input area
      expect(screen.getByTestId('skeleton-input')).toBeInTheDocument();

      // Should have buttons area
      expect(screen.getByTestId('skeleton-buttons')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('LessonCardSkeleton has aria-busy attribute', () => {
      render(<LessonCardSkeleton />);
      expect(screen.getByTestId('lesson-card-skeleton')).toHaveAttribute('aria-busy', 'true');
    });

    it('ClassroomCardSkeleton has aria-busy attribute', () => {
      render(<ClassroomCardSkeleton />);
      expect(screen.getByTestId('classroom-card-skeleton')).toHaveAttribute('aria-busy', 'true');
    });

    it('MetricCardSkeleton has aria-busy attribute', () => {
      render(<MetricCardSkeleton />);
      expect(screen.getByTestId('metric-card-skeleton')).toHaveAttribute('aria-busy', 'true');
    });

    it('PracticeCardSkeleton has aria-busy attribute', () => {
      render(<PracticeCardSkeleton />);
      expect(screen.getByTestId('practice-card-skeleton')).toHaveAttribute('aria-busy', 'true');
    });
  });
});
