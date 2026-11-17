import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useParams: () => ({ locale: 'he' }), useRouter: () => ({ push }) }));
vi.mock('@/utils/sentry', () => ({ captureError: vi.fn() }));
vi.mock('@/translations/loadTranslation', () => ({ getCachedTranslation: () => undefined }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="page-loader" /> }));

import StudentLoading from '../loading';
import StudentError from '../error';
import CraftError from '../craft/error';
import ReviewError from '../review/error';

describe('student route boundaries', () => {
  it('Given a slow student route, When it loads, Then the loader fills the viewport over the page pattern with no slab of its own', () => {
    const { container } = render(<StudentLoading />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('h-dvh');
    expect(root.className).not.toMatch(/\bbg-/);
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it.each([
    ['student hub', StudentError],
    ['word workshop', CraftError],
    ['missed-words review', ReviewError],
  ])('Given the %s crashes, When Back to class is pressed, Then the student stays in their hub', (_, Boundary) => {
    render(<Boundary error={new Error('boom')} reset={vi.fn()} />);
    expect(screen.getByTestId('edu-route-error')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('edu-route-error-back'));
    expect(push).toHaveBeenLastCalledWith('/he/student');
  });
});
