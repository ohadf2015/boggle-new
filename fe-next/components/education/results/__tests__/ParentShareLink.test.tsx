import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ParentShareLink } from '../ParentShareLink';

vi.mock('../trackResultsAction', () => ({ trackResultsAction: vi.fn() }));

describe('<ParentShareLink>', () => {
  it('Given a free teacher, Then the Pro mark sits inline on the locked link', () => {
    render(<ParentShareLink language="en" hasPro={false} label="Share with parents" proLabel="Pro" />);
    const link = screen.getByTestId('edu-results-parent-share');
    expect(link).toHaveAttribute('href', '/en/teacher/upgrade?source=results_parent_share');
    expect(link.querySelector('[data-testid="pro-pill"]')).toHaveTextContent('Pro');
  });

  it('Given a Pro teacher, Then nothing is locked, so no Pro mark shows', () => {
    render(<ParentShareLink language="en" hasPro label="Share with parents" proLabel="Pro" />);
    const link = screen.getByTestId('edu-results-parent-share');
    expect(link).toHaveAttribute('href', '/en/teacher/reports');
    expect(link.querySelector('[data-testid="pro-pill"]')).toBeNull();
  });
});
