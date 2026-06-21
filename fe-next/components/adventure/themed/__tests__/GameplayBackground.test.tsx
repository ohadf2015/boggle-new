/**
 * GameplayBackground Tests
 *
 * Neo-brutalist atmosphere rebuild: flat bold color bands + crisp halftone
 * + hard horizon line — NOT soft ambient-glow haze (banned glassmorphism look).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdventureThemeProvider } from '@/contexts/AdventureThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import GameplayBackground, { getWorldAtmosphere } from '../GameplayBackground';

function renderWithProviders(
  ui: React.ReactElement,
  { worldId = 1, level = 1 } = {}
) {
  return render(
    <LanguageProvider>
      <AdventureThemeProvider initialWorldId={worldId} initialLevel={level}>
        {ui}
      </AdventureThemeProvider>
    </LanguageProvider>
  );
}

// ==============================================
// PURE CONFIG
// ==============================================

describe('getWorldAtmosphere', () => {
  it('returns a flat two-band config for a world', () => {
    // WHEN
    const atm = getWorldAtmosphere(2);

    // THEN — two flat color bands + a hard split + a dot color + a horizon line
    expect(atm.bands).toHaveLength(2);
    expect(atm.splitAt).toBeGreaterThan(0);
    expect(atm.splitAt).toBeLessThan(100);
    expect(atm.halftone).toMatch(/^rgba\(/);
    expect(typeof atm.horizon).toBe('string');
  });

  it('gives distinct sky bands per world (graphic identity, not uniform haze)', () => {
    expect(getWorldAtmosphere(1).bands[0]).not.toBe(getWorldAtmosphere(8).bands[0]);
    expect(getWorldAtmosphere(2).bands[0]).not.toBe(getWorldAtmosphere(5).bands[0]);
  });

  it('covers all 10 worlds with defined config', () => {
    for (let w = 1; w <= 10; w++) {
      const atm = getWorldAtmosphere(w);
      expect(atm.bands[0]).toBeTruthy();
      expect(atm.bands[1]).toBeTruthy();
    }
  });

  it('falls back to world 1 for an unknown world', () => {
    expect(getWorldAtmosphere(999)).toEqual(getWorldAtmosphere(1));
  });
});

// ==============================================
// COMPONENT
// ==============================================

describe('GameplayBackground', () => {
  it('renders children', () => {
    renderWithProviders(
      <GameplayBackground>
        <div data-testid="child">Board</div>
      </GameplayBackground>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Board');
  });

  it('renders flat band + halftone + horizon layers (graphic atmosphere)', () => {
    renderWithProviders(<GameplayBackground />, { worldId: 2 });
    expect(screen.getByTestId('atmosphere-bands')).toBeInTheDocument();
    expect(screen.getByTestId('atmosphere-halftone')).toBeInTheDocument();
    expect(screen.getByTestId('atmosphere-horizon')).toBeInTheDocument();
  });

  it('uses hard flat bands, not soft ambient haze', () => {
    renderWithProviders(<GameplayBackground />, { worldId: 1 });
    const bands = screen.getByTestId('atmosphere-bands');
    const bg = bands.getAttribute('style') || '';
    // flat bands = a linear-gradient with hard color stops; NO elliptical radial haze
    expect(bg).toContain('linear-gradient');
    expect(bg).not.toContain('ellipse at');
  });

  it('halftone layer uses a small repeating dot pattern', () => {
    renderWithProviders(<GameplayBackground />, { worldId: 1 });
    const ht = screen.getByTestId('atmosphere-halftone');
    const style = ht.getAttribute('style') || '';
    expect(style).toContain('radial-gradient');
    expect(style).toMatch(/background-size:\s*\d+px/);
  });
});
