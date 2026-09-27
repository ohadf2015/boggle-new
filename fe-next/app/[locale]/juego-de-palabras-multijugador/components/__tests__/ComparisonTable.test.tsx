import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ComparisonTable } from '../ComparisonTable';
import { COMPARISON } from '../../data';

describe('ComparisonTable', () => {
  it('renders a table with the three comparison columns as headers', () => {
    render(<ComparisonTable />);
    const table = screen.getByRole('table');
    COMPARISON.columns.forEach((col) => {
      // exact string match — column labels contain regex metachars like "(app)"
      expect(within(table).getByRole('columnheader', { name: col })).toBeInTheDocument();
    });
  });

  it('renders every comparison row label as a row header', () => {
    render(<ComparisonTable />);
    COMPARISON.rows.forEach((row) => {
      expect(screen.getByRole('rowheader', { name: row.label })).toBeInTheDocument();
    });
  });

  it('renders an accessible Sí marker for each boolean-true cell', () => {
    render(<ComparisonTable />);
    const trueCount = COMPARISON.rows.reduce(
      (n, r) => n + r.cells.filter((c) => c === true).length,
      0,
    );
    expect(screen.getAllByLabelText('Sí')).toHaveLength(trueCount);
    expect(screen.getAllByText('Sí')).toHaveLength(trueCount);
  });

  it('renders an accessible No marker for each boolean-false cell', () => {
    render(<ComparisonTable />);
    const falseCount = COMPARISON.rows.reduce(
      (n, r) => n + r.cells.filter((c) => c === false).length,
      0,
    );
    expect(screen.getAllByLabelText('No')).toHaveLength(falseCount);
    expect(screen.getAllByText('No')).toHaveLength(falseCount);
  });

  it('renders text cells verbatim (e.g. the 2-50 multiplayer value)', () => {
    render(<ComparisonTable />);
    expect(screen.getByText('2-50')).toBeInTheDocument();
    expect(screen.getAllByText('Por turnos').length).toBe(2);
  });
});
