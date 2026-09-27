import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { knobs, resetKnobs } from './academyTestMocks';

/**
 * The hub picks its layout by aspect AND height (see hubLayout.ts): a phone on
 * its side still gets the map, a TV gets a scaled-up UI, a 4:3 tablet gets the
 * stacked chrome instead of a crushed desktop row. Asserted on markup (jsdom
 * has no layout engine); the pixels are checked by the responsive harness.
 */

import StudentPageClient from '../PageClient';

beforeEach(() => {
  resetKnobs();
  knobs.lessons = [{ lessonId: 'L1', status: 'assigned', lesson: { id: 'L1', name: 'Week 1', words: [{ word: 'a', level: 'core' }] } }];
});

async function hubAt(width: number, height: number) {
  knobs.view = { width, height };
  render(<StudentPageClient />);
  return screen.findByTestId('academy-hub');
}

describe('StudentPageClient — layout by viewport', () => {
  it('landscape phone (844x390): landscape map, slim rail chrome, icon-only dock with accessible names', async () => {
    const hub = await hubAt(844, 390);
    expect(hub).toHaveAttribute('data-chrome', 'rail');
    expect(screen.getByTestId('academy-map')).toHaveAttribute('data-layout', 'landscape');
    expect(screen.getByTestId('academy-hud')).toHaveAttribute('data-size', 'compact');
    for (const label of screen.getAllByTestId('academy-dock-label')) expect(label.className).toContain('sr-only');
    expect(screen.getByTestId('academy-dock-lessons')).toHaveAccessibleName(/academy\.student\.dockLessons/);
    expect(screen.getByTestId('academy-cta')).toBeInTheDocument();
  });

  it('the map stays absolutely placed even where a global landscape rule forces <main> relative', async () => {
    await hubAt(844, 390);
    const main = screen.getByRole('main');
    expect(main.style.position).toBe('absolute');
    expect(screen.getByTestId('academy-map-art').style.maxWidth).toBe('none');
  });

  it('4:3 tablet (1024x768): landscape map with the stacked phone chrome, labels visible', async () => {
    const hub = await hubAt(1024, 768);
    expect(hub).toHaveAttribute('data-chrome', 'stack');
    expect(screen.getByTestId('academy-map')).toHaveAttribute('data-layout', 'landscape');
    for (const label of screen.getAllByTestId('academy-dock-label')) expect(label.className).not.toContain('sr-only');
    expect(screen.queryByTestId('academy-side-panel')).toBeNull();
  });

  it('tablet portrait (768x1024): portrait map, stacked chrome, scaled up a little', async () => {
    const hub = await hubAt(768, 1024);
    expect(hub).toHaveAttribute('data-chrome', 'stack');
    expect(screen.getByTestId('academy-map')).toHaveAttribute('data-layout', 'portrait');
    expect(Number(hub.getAttribute('data-scale'))).toBeGreaterThan(1);
  });

  it('laptop (1280x720): desktop chrome without the side card (it would crush the dock)', async () => {
    const hub = await hubAt(1280, 720);
    expect(hub).toHaveAttribute('data-chrome', 'wide');
    expect(screen.queryByTestId('academy-side-panel')).toBeNull();
    expect(screen.getByTestId('academy-daily-chest')).toBeInTheDocument();
  });

  it('TV (2560x1440): desktop chrome with the side card, UI scaled by 4/3', async () => {
    const hub = await hubAt(2560, 1440);
    expect(hub).toHaveAttribute('data-chrome', 'wide');
    expect(Number(hub.getAttribute('data-scale'))).toBeCloseTo(4 / 3, 2);
    expect(screen.getByTestId('academy-side-panel')).toBeInTheDocument();
    expect(screen.getByTestId('academy-dock-me')).toBeInTheDocument();
  });

  it('1080p keeps the design at scale 1', async () => {
    const hub = await hubAt(1920, 1080);
    expect(hub).toHaveAttribute('data-scale', '1');
  });
});
