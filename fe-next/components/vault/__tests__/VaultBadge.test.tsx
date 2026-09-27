/**
 * VaultBadge Tests
 * Tests for the vault completion badge component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import VaultBadge from '../VaultBadge';

// Mock LanguageContext
const mockT = (key: string, params?: Record<string, string>) => {
  const translations: Record<string, string> = {
    'vault.badge': 'Vault Champion',
    'vault.completed': 'Vaulted!',
  };
  let result = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(`{{${k}}}`, v);
    });
  }
  return result;
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
    dir: 'ltr',
  }),
}));

describe('VaultBadge', () => {
  it('should render vault name', () => {
    render(
      <VaultBadge vaultName="Midnight Rush" rank={1} date="2026-03-22" />
    );
    expect(screen.getByText('Midnight Rush')).toBeInTheDocument();
  });

  it('should render rank', () => {
    render(
      <VaultBadge vaultName="Midnight Rush" rank={5} date="2026-03-22" />
    );
    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  it('should render date', () => {
    render(
      <VaultBadge vaultName="Midnight Rush" rank={1} date="2026-03-22" />
    );
    expect(screen.getByText('2026-03-22')).toBeInTheDocument();
  });

  it('should have vault-badge test id', () => {
    render(
      <VaultBadge vaultName="Midnight Rush" rank={1} date="2026-03-22" />
    );
    expect(screen.getByTestId('vault-badge')).toBeInTheDocument();
  });

  it('should show Vault Champion label', () => {
    render(
      <VaultBadge vaultName="Midnight Rush" rank={1} date="2026-03-22" />
    );
    expect(screen.getByText('Vault Champion')).toBeInTheDocument();
  });

  it('should accept className prop', () => {
    render(
      <VaultBadge vaultName="Test" rank={3} date="2026-03-22" className="custom-class" />
    );
    const badge = screen.getByTestId('vault-badge');
    expect(badge.className).toContain('custom-class');
  });
});
