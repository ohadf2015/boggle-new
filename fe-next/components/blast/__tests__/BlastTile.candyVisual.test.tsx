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

describe('BlastTile candy presentation', () => {
  it('renders cast/gloss/rim layers when candy variant active', () => {
    const { container } = render(
      <BlastTile letter="A" type="standard" phase="idle" isSelected={false} isCleared={false} />
    );
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button!.querySelector('[data-bt-layer="cast"]')).not.toBeNull();
    expect(button!.querySelector('[data-bt-layer="gloss"]')).not.toBeNull();
    expect(button!.querySelector('[data-bt-layer="rim"]')).not.toBeNull();
  });

  it('sets per-type CSS variables on the button', () => {
    const { container } = render(
      <BlastTile letter="B" type="bomb" phase="idle" isSelected={false} isCleared={false} />
    );
    const button = container.querySelector('button')!;
    const style = button.getAttribute('style') ?? '';
    expect(style).toContain('--bt-gloss');
    expect(style).toContain('--bt-rim-light');
    expect(style).toContain('--bt-rim-dark');
    expect(style).toContain('--bt-cast');
  });
});

describe('BlastTile control variant', () => {
  it('omits candy layers', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/useExperiment', () => ({
      useExperiment: () => ({ variant: 'control', trackExposure: () => {} }),
    }));
    const { BlastTile: Tile } = await import('../BlastTile');
    const { container } = render(
      <Tile letter="A" type="standard" phase="idle" isSelected={false} isCleared={false} />
    );
    const button = container.querySelector('button')!;
    expect(button.querySelector('[data-bt-layer="cast"]')).toBeNull();
    expect(button.querySelector('[data-bt-layer="gloss"]')).toBeNull();
    expect(button.querySelector('[data-bt-layer="rim"]')).toBeNull();
    vi.doUnmock('@/hooks/useExperiment');
  });
});
