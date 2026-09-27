import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SoloPlayPrompt } from './SoloPlayPrompt';

// Stub translator returns the key so we can assert which strings render.
const t = (key: string) => key;

describe('SoloPlayPrompt', () => {
  it('renders the solo-host headline, subtitle and a play-vs-bots CTA', () => {
    render(<SoloPlayPrompt onPlayVsBots={() => {}} t={t} />);
    expect(screen.getByText('hostView.soloPrompt.title')).toBeInTheDocument();
    expect(screen.getByText('hostView.soloPrompt.subtitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'hostView.soloPrompt.cta' })).toBeInTheDocument();
  });

  it('fires onPlayVsBots when the CTA is pressed', () => {
    const onPlayVsBots = vi.fn();
    render(<SoloPlayPrompt onPlayVsBots={onPlayVsBots} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'hostView.soloPrompt.cta' }));
    expect(onPlayVsBots).toHaveBeenCalledTimes(1);
  });
});
