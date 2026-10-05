import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ClassroomGameLoadingShell } from '../ClassroomGameLoadingShell';
import { LobbySeoTail } from '../LobbySeoTail';

describe('classroom-game CLS reserve', () => {
  it('loading shell is one viewport with a header slot matching EducationHeader min-heights', () => {
    render(<ClassroomGameLoadingShell />);
    expect(screen.getByTestId('classroom-game-loading-shell')).toHaveClass('h-dvh');
    expect(screen.getByTestId('classroom-game-header-slot').className).toMatch(/min-h-\[60px\]/);
    expect(screen.getByTestId('classroom-game-header-slot').className).toMatch(/sm:min-h-\[70px\]/);
    expect(screen.getByTestId('classroom-game-lobby-slot')).toBeInTheDocument();
  });

  it('SEO tail is clipped out of layout on first paint (no hidden= toggle)', () => {
    const { container } = render(
      <LobbySeoTail>
        <p>how to launch</p>
      </LobbySeoTail>,
    );
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.className).toMatch(/absolute/);
    expect(wrap.className).toMatch(/h-0/);
    expect(wrap.hasAttribute('hidden')).toBe(false);
    expect(container.textContent).toContain('how to launch');

    const src = readFileSync(join(__dirname, '..', 'LobbySeoTail.tsx'), 'utf8');
    expect(src).not.toMatch(/hidden=\{/);
    expect(src).not.toMatch(/useContext/);
  });

  it('PageClient uses the reserved shell for auth, gate, and inner checks', () => {
    const src = readFileSync(join(__dirname, '..', 'PageClient.tsx'), 'utf8');
    expect(src).toMatch(/ClassroomGameLoadingShell/);
    expect(src).toMatch(/loadingFallback=\{<ClassroomGameLoadingShell/);
    expect(src).not.toMatch(/PageLoader/);
  });
});
