/**
 * Tests for SystemHealth dashboard component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { SystemHealth } from '../overview/SystemHealth';

describe('SystemHealth', () => {
  it('should show all-green when healthy', () => {
    render(
      <SystemHealth health={{ redis: 'ok', database: 'ok', process: { heapMB: 120, uptimeSeconds: 3600 } }} />
    );

    expect(screen.getByText('Redis')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    // Both should show ok status
    expect(screen.getAllByText('admin.system.ok')).toHaveLength(2);
  });

  it('should show red when Redis is down', () => {
    render(
      <SystemHealth health={{ redis: 'down', database: 'ok', process: { heapMB: 120, uptimeSeconds: 3600 } }} />
    );

    expect(screen.getByText('admin.system.down')).toBeInTheDocument();
  });

  it('should show loading when health is null', () => {
    render(<SystemHealth health={null} />);

    expect(screen.getByTestId('health-loading')).toBeInTheDocument();
  });

  it('should display uptime in human-readable format', () => {
    render(
      <SystemHealth health={{ redis: 'ok', database: 'ok', process: { heapMB: 120, uptimeSeconds: 7200 } }} />
    );

    expect(screen.getByText('2h')).toBeInTheDocument();
  });
});
