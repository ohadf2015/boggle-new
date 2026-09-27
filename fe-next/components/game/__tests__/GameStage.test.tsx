/**
 * GameStage — shared no-scroll viewport shell for single-player mini-games.
 *
 * The structural fix for "in-game screen scroll": the shell is a fixed-height
 * flex column (h-[100dvh] overflow-hidden) so the document body never scrolls;
 * only the middle body region scrolls when its content overflows, while the
 * header and footer slots stay pinned.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameStage } from '../GameStage';

describe('GameStage', () => {
  it('renders children inside the scrollable body region', () => {
    render(<GameStage>play area</GameStage>);
    expect(screen.getByText('play area')).toBeInTheDocument();
  });

  it('renders the header and footer slots when provided', () => {
    render(
      <GameStage header={<div>HUD</div>} footer={<div>input</div>}>
        body
      </GameStage>,
    );
    expect(screen.getByText('HUD')).toBeInTheDocument();
    expect(screen.getByText('input')).toBeInTheDocument();
  });

  it('caps the shell to the viewport and hides overflow so the page cannot scroll', () => {
    const { container } = render(<GameStage>body</GameStage>);
    const root = container.firstElementChild as HTMLElement;
    // `fixed` takes the shell out of document flow so sibling chrome (header
    // spacer, footer) can never push it and create page scroll.
    expect(root.className).toContain('fixed');
    expect(root.className).toContain('h-[100dvh]');
    expect(root.className).toContain('overflow-hidden');
    expect(root.className).toContain('flex');
    expect(root.className).toContain('flex-col');
  });

  it('makes only the body region scroll (flex-1, min-h-0, overflow-y-auto)', () => {
    render(<GameStage>scroll me</GameStage>);
    const body = screen.getByTestId('game-stage-body');
    expect(body.className).toContain('flex-1');
    expect(body.className).toContain('min-h-0');
    expect(body.className).toContain('overflow-y-auto');
  });

  it('pins the footer (shrink-0) so the input stays put above the keyboard', () => {
    render(<GameStage footer={<div>controls</div>}>body</GameStage>);
    const footer = screen.getByTestId('game-stage-footer');
    expect(footer.className).toContain('shrink-0');
  });

  it('exposes the accent as a data attribute for themed glows', () => {
    const { container } = render(<GameStage accent="pink">body</GameStage>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('data-accent')).toBe('pink');
  });

  it('merges a caller className onto the root shell', () => {
    const { container } = render(<GameStage className="custom-x">body</GameStage>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('custom-x');
  });
});
