import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SurvivalLifeBar } from '../SurvivalLifeBar';

describe('SurvivalLifeBar fill motion', () => {
  it('Given life draining every second, Then the fill shrinks by scale from its start edge, never by animating its width', () => {
    render(
      <SurvivalLifeBar lifePoints={50} isGameOver={false} isLifeGaining={false} lifeGainAmount={null} skipAnimations={false} onLifeGainComplete={() => {}} />,
    );
    const fill = screen.getByTestId('life-bar-fill');
    expect(fill.style.width).toBe('100%');
    expect(fill.style.transform).toMatch(/scaleX\(0\.5\)/);
    expect(fill.className).toMatch(/origin-left/);
    expect(fill.className).toMatch(/rtl:origin-right/);
  });
});
