/**
 * Tests for BlastWordRewardPreview — shows what reward current word length earns.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastWordRewardPreview } from '../BlastWordRewardPreview';

describe('BlastWordRewardPreview', () => {
  it('renders nothing for words shorter than 5', () => {
    const { container } = render(<BlastWordRewardPreview wordLength={4} />);
    expect(container.textContent).toBe('');
  });

  it('renders nothing for empty word', () => {
    const { container } = render(<BlastWordRewardPreview wordLength={0} />);
    expect(container.textContent).toBe('');
  });

  it('shows silver/gold reward for 5-letter word', () => {
    render(<BlastWordRewardPreview wordLength={5} />);
    const el = screen.getByTestId('word-reward-preview');
    expect(el.textContent).toContain('✦');
  });

  it('shows bomb/lightning reward for 6-letter word', () => {
    render(<BlastWordRewardPreview wordLength={6} />);
    const el = screen.getByTestId('word-reward-preview');
    expect(el.textContent).toContain('💣');
  });

  it('shows prism/rainbow reward for 7+ letter word', () => {
    render(<BlastWordRewardPreview wordLength={7} />);
    const el = screen.getByTestId('word-reward-preview');
    expect(el.textContent).toContain('🌈');
  });

  it('uses 7+ tier for 8-letter words too', () => {
    render(<BlastWordRewardPreview wordLength={8} />);
    const el = screen.getByTestId('word-reward-preview');
    expect(el.textContent).toContain('🌈');
  });
});
