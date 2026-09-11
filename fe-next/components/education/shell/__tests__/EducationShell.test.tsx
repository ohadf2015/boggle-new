/**
 * The shell exists to make ONE assertion true on every teacher/student CRUD
 * screen: `document.documentElement.scrollHeight === window.innerHeight`.
 *
 * Two halves have to hold together for that. The body lock (a class on
 * <body>) is what stops the page itself from scrolling; the `h-dvh` +
 * `flex-1 min-h-0 overflow-y-auto` chain is what makes the inner region
 * scroll instead of clipping its overflow. Either one alone fails: without
 * the lock the body grows past the viewport, without the chain the content
 * is simply unreachable.
 *
 * The lock class is deliberately NOT `screen-fit-locked`: that one is the
 * `isInGameSurface()` signal and hides the feedback launcher and the ad
 * banner. NavigationContext also re-adds `.screen-fit` whenever `isInGame`
 * flips false, so a shell that removed it would be in a two-writer fight
 * (pitfall class 1). A separate class wins on specificity and survives that.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EducationShell, EDUCATION_SHELL_LOCK_CLASS } from '../EducationShell';

afterEach(() => {
  cleanup();
  document.body.className = '';
});

describe('EducationShell', () => {
  it('locks the viewport: root is exactly one viewport tall and never scrolls', () => {
    const { getByTestId } = render(
      <EducationShell header={<div>header</div>}>body</EducationShell>,
    );
    const root = getByTestId('education-shell');
    expect(root.className).toContain('h-dvh');
    expect(root.className).toContain('overflow-hidden');
    expect(root.className).toContain('flex-col');
  });

  it('gives the scroll region the flex-1 min-h-0 chain, so it scrolls instead of clipping', () => {
    const { getByTestId } = render(<EducationShell>body</EducationShell>);
    const region = getByTestId('education-shell-scroll');
    expect(region.className).toContain('flex-1');
    expect(region.className).toContain('min-h-0');
    expect(region.className).toContain('overflow-y-auto');
  });

  it('has exactly ONE scrolling region — a nested scroller is the bug this replaces', () => {
    const { getByTestId } = render(
      <EducationShell header={<div>h</div>} statusRow={<div>s</div>} hero={<div>hero</div>}>
        body
      </EducationShell>,
    );
    const root = getByTestId('education-shell');
    const scrollers = [...root.querySelectorAll('*')].filter((el) =>
      /overflow-y-auto|overflow-auto|overflow-y-scroll/.test(el.className?.toString() ?? ''),
    );
    expect(scrollers).toHaveLength(1);
  });

  it('pins the header: in a flex column a bare child shrinks, and chrome must not', () => {
    // `flex-shrink` defaults to 1. With tall content the header band is the
    // first thing the column squeezes — the teacher's back button and locale
    // switcher lose height before the scroll region gives up a pixel, because
    // the region is the one child that *can* scroll instead.
    const { getByTestId } = render(
      <EducationShell header={<div>hdr</div>} statusRow={<div>s</div>} hero={<div>hero</div>} footer={<div>f</div>}>
        body
      </EducationShell>,
    );
    for (const slot of ['header', 'status', 'hero', 'footer']) {
      expect(getByTestId(`education-shell-${slot}`).className).toContain('shrink-0');
    }
  });

  it('keeps header, status row and hero OUT of the scroll region', () => {
    const { getByTestId, getByText } = render(
      <EducationShell header={<div>hdr</div>} statusRow={<div>status</div>} hero={<div>hero</div>}>
        <div>scrolled</div>
      </EducationShell>,
    );
    const region = getByTestId('education-shell-scroll');
    expect(region.contains(getByText('hdr'))).toBe(false);
    expect(region.contains(getByText('status'))).toBe(false);
    expect(region.contains(getByText('hero'))).toBe(false);
    expect(region.contains(getByText('scrolled'))).toBe(true);
  });

  it('locks <body> while mounted and releases it on unmount', () => {
    const { unmount } = render(<EducationShell>body</EducationShell>);
    expect(document.body.classList.contains(EDUCATION_SHELL_LOCK_CLASS)).toBe(true);
    unmount();
    expect(document.body.classList.contains(EDUCATION_SHELL_LOCK_CLASS)).toBe(false);
  });

  it('ref-counts the lock so a remount mid-transition cannot unlock the page', () => {
    const a = render(<EducationShell>a</EducationShell>);
    const b = render(<EducationShell>b</EducationShell>);
    a.unmount();
    expect(document.body.classList.contains(EDUCATION_SHELL_LOCK_CLASS)).toBe(true);
    b.unmount();
    expect(document.body.classList.contains(EDUCATION_SHELL_LOCK_CLASS)).toBe(false);
  });

  it('never strips .screen-fit — NavigationContext owns that class', () => {
    document.body.classList.add('screen-fit');
    const { unmount } = render(<EducationShell>body</EducationShell>);
    expect(document.body.classList.contains('screen-fit')).toBe(true);
    unmount();
    expect(document.body.classList.contains('screen-fit')).toBe(true);
  });

  it('is dark-only: hardcodes bg-neo-navy with no cream light-mode pair to flash', () => {
    const { getByTestId } = render(<EducationShell>body</EducationShell>);
    const root = getByTestId('education-shell');
    expect(root.className).toContain('bg-neo-navy');
    expect(root.className).not.toContain('bg-neo-cream');
  });

  it('marks the scroll region as a labelled landmark for screen readers', () => {
    const { getByTestId } = render(
      <EducationShell scrollRegionLabel="Teacher tools">body</EducationShell>,
    );
    const region = getByTestId('education-shell-scroll');
    expect(region.getAttribute('aria-label')).toBe('Teacher tools');
  });
});
