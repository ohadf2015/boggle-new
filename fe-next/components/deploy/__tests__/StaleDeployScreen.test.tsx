import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/translations/loadTranslation', () => ({
  getCachedTranslation: (lang: string) =>
    lang === 'he' ? { errors: { updateHeading: 'יש עדכון חדש', updateMessage: 'יש גרסה חדשה.', refreshPage: 'רענון' } } : undefined,
}));

import { StaleDeployScreen } from '../StaleDeployScreen';

afterEach(cleanup);

describe('<StaleDeployScreen>', () => {
  it('Given no cached copy, When it renders, Then it shows the English update copy with one Refresh action', () => {
    const onRefresh = vi.fn();
    render(<StaleDeployScreen locale="en" onRefresh={onRefresh} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Update ready');
    expect(screen.getByText('New version available. Refresh to update.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('Given the Hebrew locale, When it renders, Then it reads the existing update keys from the cached bundle', () => {
    render(<StaleDeployScreen locale="he" onRefresh={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('יש עדכון חדש');
    expect(screen.getByRole('button', { name: 'רענון' })).toBeInTheDocument();
  });

  it('Given a way out and a mascot, When it renders, Then both appear and the way out is the second button', () => {
    const onBack = vi.fn();
    render(
      <StaleDeployScreen
        locale="en"
        onRefresh={vi.fn()}
        mascot={<span data-testid="mascot" />}
        secondary={{ label: 'Back', onClick: onBack }}
      />,
    );
    expect(screen.getByTestId('mascot')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
