// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BlastTile } from '../BlastTile';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'candy', trackExposure: () => {} }),
}));

describe('BlastTile jelly presentation', () => {
  it('renders jelly-mirror + jelly-edge layers when candy variant active', () => {
    const { container } = render(
      <BlastTile letter="A" type="standard" phase="idle" isSelected={false} isCleared={false} />,
    );
    const button = container.querySelector('button')!;
    expect(button.querySelector('[data-bt-layer="jelly-mirror"]')).not.toBeNull();
    expect(button.querySelector('[data-bt-layer="jelly-edge"]')).not.toBeNull();
  });

  it('marks jelly layers aria-hidden', () => {
    const { container } = render(
      <BlastTile letter="B" type="bomb" phase="idle" isSelected={false} isCleared={false} />,
    );
    const layers = container.querySelectorAll('[data-bt-layer^="jelly-"]');
    expect(layers.length).toBeGreaterThan(0);
    layers.forEach((el) => {
      expect(el.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('exposes new --bt-jelly-mirror and --bt-jelly-edge CSS vars on the button', () => {
    const { container } = render(
      <BlastTile letter="C" type="gold" phase="idle" isSelected={false} isCleared={false} />,
    );
    const style = container.querySelector('button')!.getAttribute('style') ?? '';
    expect(style).toContain('--bt-jelly-mirror');
    expect(style).toContain('--bt-jelly-edge');
  });
});
