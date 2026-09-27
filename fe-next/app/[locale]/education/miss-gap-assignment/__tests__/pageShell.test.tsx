/**
 * @vitest-environment jsdom
 *
 * RED first — the homework route's SHELL, measured live 2026-09-12 on :3011.
 *
 * Two live numbers drove this file, both on the teacher entry at 1440x900:
 *
 *  1. The card container is a `lg:grid` and the scroll region stretched it to
 *     the full 856px of the region, so `grid-template-rows` resolved to
 *     `589px 215px` for rows holding 420px and 46px of content. The take-home
 *     disclosure ended up floating 190px below the compose card it belongs to,
 *     with nothing in between. Centring the card (`min-h-full flex
 *     items-center`) hands the grid its content height back, and
 *     `lg:content-start` keeps the rows packed even if some other parent
 *     stretches it again.
 *
 *  2. The route kept the global PLAYER bottom nav — QUESTS / FRIENDS / HOME —
 *     on the TEACHER entry. Three wrong-audience tabs on a teacher tool, and
 *     all three fail the contrast rule (borderless on navy, `edgeRatio 0`), so
 *     they were 3 of the 4 flagged controls on that screen. The student entry
 *     already hid them via `chromeFree`; the teacher entry needs the same, plus
 *     its own way back, which is what `MissGapExitLink` is for.
 *
 * The page is an async server component, so this walks the element tree it
 * returns rather than rendering it — no client context, no mock scaffolding,
 * and it still pins the three structural facts that the live measurement
 * turned on.
 */
import { describe, it, expect } from 'vitest';
import { isValidElement, type ReactElement } from 'react';
import MissGapAssignmentPage from '../page';
import { MissGapShellLock } from '@/components/education/missGap/MissGapShellLock';
import { MissGapExitLink } from '@/components/education/missGap/MissGapExitLink';

type AnyElement = ReactElement<Record<string, unknown>>;

function walk(node: unknown, out: AnyElement[] = []): AnyElement[] {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, out);
    return out;
  }
  if (!isValidElement(node)) return out;
  const el = node as AnyElement;
  out.push(el);
  walk((el.props as { children?: unknown }).children, out);
  return out;
}

async function renderPage(query: Record<string, string>) {
  const el = await MissGapAssignmentPage({
    params: Promise.resolve({ locale: 'en' }),
    searchParams: Promise.resolve(query),
  });
  return walk(el);
}

const TEACHER_QUERY = { role: 'teacher', lesson: 'Week 3 Vocab', missed: 'neutron,quark' };
const STUDENT_QUERY = { role: 'student', lesson: 'Week 3 Vocab', missed: 'neutron,quark', due: '2026-09-30' };

function classNames(nodes: AnyElement[]): string[] {
  return nodes
    .map((n) => (n.props as { className?: unknown }).className)
    .filter((c): c is string => typeof c === 'string');
}

describe('miss-gap-assignment route shell', () => {
  it('centres the card in the scroll region so the grid keeps its content height', async () => {
    const nodes = await renderPage(TEACHER_QUERY);
    const centred = classNames(nodes).find(
      (c) => c.includes('min-h-full') && c.includes('items-center'),
    );
    expect(centred).toBeTruthy();
  });

  it('drops the player bottom nav on the TEACHER entry too', async () => {
    const nodes = await renderPage(TEACHER_QUERY);
    const lock = nodes.find((n) => n.type === MissGapShellLock);
    expect(lock).toBeTruthy();
    expect((lock!.props as { chromeFree?: boolean }).chromeFree).toBe(true);
  });

  it('keeps the student entry chrome-free as well', async () => {
    const nodes = await renderPage(STUDENT_QUERY);
    const lock = nodes.find((n) => n.type === MissGapShellLock);
    expect((lock!.props as { chromeFree?: boolean }).chromeFree).toBe(true);
  });

  it('gives the teacher a way back now that the nav is gone', async () => {
    const nodes = await renderPage(TEACHER_QUERY);
    const exit = nodes.find((n) => n.type === MissGapExitLink);
    expect(exit).toBeTruthy();
    expect((exit!.props as { locale?: string }).locale).toBe('en');
  });

  it('does not put the teacher exit on the student game entry', async () => {
    const nodes = await renderPage(STUDENT_QUERY);
    expect(nodes.find((n) => n.type === MissGapExitLink)).toBeUndefined();
  });
});
