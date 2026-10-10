import { buildGeometry, heatOf, keyOf, type BoardGeometry, type CellRef, type Point, type TileBox } from './selectionPath';

export interface BoardPainter {
  measure(): BoardGeometry | null;
  geometry(): BoardGeometry | null;
  setPath(path: CellRef[], opts?: { keepPreview?: boolean }): void;
  setPointer(p: Point | null): void;
  setFocus(cell: { row: number; col: number } | null): void;
  setMode(mode: string): void;
  clearPreview(): void;
}

const fmt = (p: Point) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;

/**
 * Writes the live selection straight onto the board's DOM: tile and glyph
 * attributes, the trail polylines, the finger dot and the preview pill.
 * React renders these nodes once and never owns the attributes written here,
 * so a drag costs no renders.
 */
export function createBoardPainter(container: HTMLElement): BoardPainter {
  let geo: BoardGeometry | null = null;
  let origin: Point = { x: 0, y: 0 };
  let painted: CellRef[] = [];
  let focusKey: string | null = null;

  const root = () => container.querySelector<HTMLElement>('[role="grid"]');
  const q = <T extends Element>(sel: string) => container.querySelector<T>(sel);
  const nodesFor = (key: string): HTMLElement[] =>
    [...container.querySelectorAll<HTMLElement>(`[data-tile][data-key="${key}"], [data-gk="${key}"]`)];

  const local = (t: TileBox): Point => ({ x: t.cx - origin.x, y: t.cy - origin.y });

  function measure(): BoardGeometry | null {
    const r = root();
    if (!r) return null;
    const rr = r.getBoundingClientRect();
    origin = { x: rr.left + r.clientLeft, y: rr.top + r.clientTop };
    const w = r.clientWidth || rr.width;
    const h = r.clientHeight || rr.height;
    const tiles: TileBox[] = [];
    r.querySelectorAll<HTMLElement>('[data-tile]').forEach((el) => {
      const letter = el.dataset.letter ?? '';
      if (!letter) return;
      const b = el.getBoundingClientRect();
      tiles.push({ row: Number(el.dataset.row), col: Number(el.dataset.col), letter, cx: b.left + b.width / 2, cy: b.top + b.height / 2, size: Math.min(b.width, b.height) });
    });
    geo = buildGeometry(tiles);
    const svg = q<SVGSVGElement>('[data-board-trail]');
    if (svg && w > 0) {
      svg.setAttribute('viewBox', `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`);
      const ghost = container.hasAttribute('data-ghost');
      const widths: Record<string, number> = ghost
        ? { ink: 0.3, core: 0.2, shine: 0.05 }
        : { ink: 0.44, core: 0.32, shine: 0.08 };
      svg.querySelectorAll<SVGElement>('[data-trail], [data-tail]').forEach((line) => {
        const kind = line.getAttribute('data-trail') ?? line.getAttribute('data-tail') ?? 'core';
        line.setAttribute('stroke-width', (geo!.cell * (widths[kind] ?? 0.3)).toFixed(1));
      });
      q<SVGCircleElement>('[data-finger]')?.setAttribute('r', (geo.cell * (ghost ? 0.14 : 0.2)).toFixed(1));
    }
    return geo;
  }

  function points(path: CellRef[]): Point[] {
    if (!geo) return [];
    const out: Point[] = [];
    for (const c of path) {
      const t = geo.byKey.get(keyOf(c.row, c.col));
      if (t) out.push(local(t));
    }
    return out;
  }

  function paintPreview(path: CellRef[]) {
    const wordEl = q<HTMLElement>('[data-preview-word]');
    if (!wordEl) return;
    const spans = [...wordEl.querySelectorAll<HTMLElement>('[data-pl]')];
    let keep = 0;
    while (keep < spans.length && keep < path.length && spans[keep].dataset.key === keyOf(path[keep].row, path[keep].col)) keep++;
    for (let i = spans.length - 1; i >= keep; i--) spans[i].remove();
    for (let i = keep; i < path.length; i++) {
      const s = wordEl.ownerDocument.createElement('span');
      s.setAttribute('data-pl', '');
      s.dataset.key = keyOf(path[i].row, path[i].col);
      s.textContent = path[i].letter;
      s.style.setProperty('--pl-i', String(i));
      wordEl.appendChild(s);
    }
    const count = q<HTMLElement>('[data-preview-count]');
    if (count) count.textContent = path.length ? String(path.length) : '';
    const preview = q<HTMLElement>('[data-board-preview]');
    if (preview && path.length) preview.dataset.state = 'live';
  }

  function setPath(next: CellRef[], opts: { keepPreview?: boolean } = {}) {
    if (!geo && next.length) measure();
    const nextKeys = new Map(next.map((c, i) => [keyOf(c.row, c.col), i]));
    for (const c of painted) {
      const key = keyOf(c.row, c.col);
      if (nextKeys.has(key)) continue;
      for (const el of nodesFor(key)) {
        el.removeAttribute('data-sel');
        el.removeAttribute('data-head');
        el.style.removeProperty('--sel-i');
        if (el.hasAttribute('data-tile')) el.setAttribute('aria-selected', 'false');
      }
    }
    next.forEach((c, i) => {
      for (const el of nodesFor(keyOf(c.row, c.col))) {
        if (!el.hasAttribute('data-sel')) el.setAttribute('data-sel', '');
        el.style.setProperty('--sel-i', String(i));
        if (i === next.length - 1) el.setAttribute('data-head', '');
        else el.removeAttribute('data-head');
        if (el.hasAttribute('data-tile')) el.setAttribute('aria-selected', 'true');
      }
    });
    painted = next;

    const board = container;
    if (next.length) board.setAttribute('data-active', '');
    else board.removeAttribute('data-active');
    board.setAttribute('data-len', String(next.length));
    board.setAttribute('data-heat', String(heatOf(next.length)));

    const str = points(next).map(fmt).join(' ');
    q<SVGElement>('[data-board-trail]')?.querySelectorAll('[data-trail]').forEach((l) => l.setAttribute('points', str));
    if (!next.length) setPointer(null);

    if (next.length || !opts.keepPreview) paintPreview(next);
    if (!next.length && !opts.keepPreview) clearPreview();

    const status = q<HTMLElement>('[data-board-status]');
    if (status) status.textContent = next.map((c) => c.letter).join('');
  }

  function setPointer(p: Point | null) {
    const tails = container.querySelectorAll<SVGElement>('[data-tail]');
    const finger = q<SVGCircleElement>('[data-finger]');
    const head = painted[painted.length - 1];
    const t = head && geo?.byKey.get(keyOf(head.row, head.col));
    if (!p || !t) {
      tails.forEach((l) => l.setAttribute('points', ''));
      finger?.setAttribute('data-off', '');
      return;
    }
    const lp = { x: p.x - origin.x, y: p.y - origin.y };
    const str = `${fmt(local(t))} ${fmt(lp)}`;
    tails.forEach((l) => l.setAttribute('points', str));
    if (finger) {
      finger.setAttribute('cx', lp.x.toFixed(1));
      finger.setAttribute('cy', lp.y.toFixed(1));
      finger.removeAttribute('data-off');
    }
  }

  function setFocus(cell: { row: number; col: number } | null) {
    if (focusKey) nodesFor(focusKey).forEach((el) => el.removeAttribute('data-focus'));
    focusKey = cell ? keyOf(cell.row, cell.col) : null;
    if (focusKey) nodesFor(focusKey).forEach((el) => el.setAttribute('data-focus', ''));
  }

  function setMode(mode: string) {
    container.setAttribute('data-mode', mode);
  }

  function clearPreview() {
    const wordEl = q<HTMLElement>('[data-preview-word]');
    if (wordEl) wordEl.replaceChildren();
    const count = q<HTMLElement>('[data-preview-count]');
    if (count) count.textContent = '';
    const preview = q<HTMLElement>('[data-board-preview]');
    if (preview) delete preview.dataset.state;
  }

  return { measure, geometry: () => geo, setPath, setPointer, setFocus, setMode, clearPreview };
}

