/**
 * Regression guard: framer-motion springs accept at most 2 keyframes.
 *
 * Passing a 3+-stop keyframe array to a spring-typed transition logs
 * "Only two keyframes currently supported with spring and inertia animations"
 * in real browsers — a top growth-radar JS error on /en (kanban t_15ec0d7a,
 * recurrence of PR #893).
 *
 * This test statically scans the fe-next source for the forbidden pattern:
 *   - a numeric array with >= 3 elements used as a motion value, whose
 *   - owning transition resolves to type: 'spring' (inline, via an in-file
 *     preset const, or via SPRING_PRESETS.*), with
 *   - no per-value tween override for that property.
 *
 * Legal by design (and covered here so the guard stays honest):
 *   - multi-keyframe values whose transition has no explicit spring type
 *     (framer-motion defaults multi-keyframe animations to keyframes/tween),
 *   - per-value tween overrides inside a spring transition (e.g. `x: { duration: 0.4 }`),
 *   - conditional (ternary) animate/transition pairs — the array's branch must
 *     resolve to a tween for the guard to pass.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const FE_NEXT_ROOT = path.resolve(__dirname, '..', '..');

const SKIP_DIRS = new Set(['node_modules', '.next', 'coverage', '.git', 'out']);
const TEST_FILE = 'springKeyframes.guard.test.ts';

// >= 3 numeric elements (multi-line tolerant)
const KEYFRAME_ARRAY = /\[\s*-?\d*\.?\d+(\s*,\s*-?\d*\.?\d+){2,}\s*\]/g;
const SPRING_TYPE = /type\s*:\s*['"]spring['"]/;
const TWEENISH = /type\s*:\s*['"](?:tween|inertia)['"]|\b(?:duration|ease|times)\s*:/;
const MOTION_VALUE_KEY = /([A-Za-z_$][\w$]*)\s*:\s*$/;
const MOTION_EXPR =
  /(?:animate|whileHover|whileTap|whileFocus|whileInView|initial|exit)\s*[:=]\s*\{/g;
const DATA_ASSIGN = /=\s*$/;
const MOTION_PROP = /(?:animate|whileHover|whileTap|whileFocus|whileInView|exit|initial)\s*[:=]\s*$/;

interface Violation {
  file: string;
  line: number;
  text: string;
}

function stripComments(src: string): string {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  out = out
    .split('\n')
    .map((l) => {
      const i = l.indexOf('//');
      return i === -1 ? l : l.slice(0, i);
    })
    .join('\n');
  return out;
}

function lineOf(src: string, idx: number): number {
  return src.slice(0, idx).split('\n').length;
}

/** Extract a brace-balanced block starting at the '{' at `from`. */
function braceBlock(src: string, from: number): string | null {
  if (src[from] !== '{') return null;
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(from, i + 1);
    }
  }
  return null;
}

/** Unwrap JSX-expression / nested-object wrapper braces down to the semantic body. */
function unwrapBlock(block: string): string {
  let t = block.trim();
  for (;;) {
    if (t.startsWith('{')) {
      const b = braceBlock(t, 0);
      if (b && b.length === t.length) {
        t = t.slice(1, -1).trim();
        continue;
      }
    }
    break;
  }
  return t;
}

interface TernaryPos {
  q: number;
  colon: number;
}

/** Locate a single top-level ternary (`?` / `:` at brace-depth 0), if any. */
function findTernary(t: string): TernaryPos | null {
  let depth = 0;
  let q = -1;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth--;
    else if (depth < 0) break; // ran into the closing JSX brace of the slice
    else if (depth === 0 && c === '?' && q === -1) q = i;
    else if (depth === 0 && c === ':' && q !== -1) return { q, colon: i };
  }
  return null;
}

/** Which side of the block's top-level ternary is `relOffset` on?
 *  `relOffset` is relative to the start of `block`. */
function ternarySide(block: string, relOffset: number): 'truthy' | 'falsy' | null {
  const t = unwrapBlock(block);
  const ter = findTernary(t);
  if (!ter) return null;
  const pos = block.indexOf(t);
  const rel = relOffset - pos;
  return rel <= ter.colon ? 'truthy' : 'falsy';
}

/** Extract one branch of a block's top-level ternary. */
function ternaryBranch(block: string, side: 'truthy' | 'falsy'): string {
  const t = unwrapBlock(block);
  const ter = findTernary(t);
  if (!ter) return t;
  return side === 'truthy' ? t.slice(ter.q + 1, ter.colon) : t.slice(ter.colon + 1);
}

/** Split an object block's depth-1 body into `key: value` entry strings. */
function topLevelEntries(block: string): Record<string, string> {
  const t = unwrapBlock(block);
  const body = t.startsWith('{') ? unwrapBlock(t) : t;
  const entries: Record<string, string> = {};
  let depth = 0;
  let start = 0;
  const spans: Array<[number, number]> = [];
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === ',' && depth === 0) {
      spans.push([start, i]);
      start = i + 1;
    }
  }
  spans.push([start, body.length]);
  for (const [a, b] of spans) {
    const seg = body.slice(a, b).trim();
    const m = /^([A-Za-z_$][\w$]*)\s*:\s*([\s\S]*)$/.exec(seg);
    if (m) entries[m[1]] = m[2].trim();
  }
  return entries;
}

function isSpringEntries(entries: Record<string, string> | null): boolean {
  return !!entries?.type && SPRING_TYPE.test(`type: ${entries.type}`);
}

/** Resolve a transition reference (object literal, preset identifier, or
 *  ternary of those) to its top-level entries. `side` pairs a ternary
 *  transition with the ternary branch of the animate that owns the array. */
function resolveRefText(
  src: string,
  text: string,
  side: 'truthy' | 'falsy' | null
): Record<string, string> | null {
  const u = unwrapBlock(text);
  const ter = findTernary(u);
  if (ter) {
    const truthy = u.slice(ter.q + 1, ter.colon);
    const falsy = u.slice(ter.colon + 1);
    if (side === 'truthy') return resolveRefText(src, truthy, null);
    if (side === 'falsy') return resolveRefText(src, falsy, null);
    // Unknown side: conservatively surface a spring in either branch.
    const a = resolveRefText(src, truthy, null);
    const b = resolveRefText(src, falsy, null);
    if (isSpringEntries(a) || isSpringEntries(b)) return { type: "'spring'" };
    return a ?? b;
  }
  if (u.startsWith('{')) return topLevelEntries(u);
  // A reference is a lone identifier — NOT the first key of bare entries.
  // (?![\w$]) stops regex backtracking from shrinking the identifier to a
  // prefix that would dodge the not-a-key lookahead (e.g. `typ` of `type:`).
  const idMatch = /^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)(?![\w$])(?!\s*[:({])/.exec(u);
  if (idMatch) {
    const id = idMatch[1];
    if (id.startsWith('SPRING_PRESETS.')) return { type: "'spring'" };
    const def = new RegExp(`const\\s+${id.replace(/\./g, '\\.')}\\s*(?::[^=]+)?=\\s*\\{`).exec(src);
    if (def) {
      const open = src.indexOf('{', def.index);
      const b = braceBlock(src, open);
      return b ? topLevelEntries(b) : null;
    }
    return null;
  }
  return topLevelEntries(`{ ${u} }`);
}

/** Which motion expression (animate/whileHover/...) owns this array? */
function owningMotionBlock(src: string, arrStart: number): { block: string; offset: number } | null {
  MOTION_EXPR.lastIndex = 0;
  let m: RegExpExecArray | null;
  let best: number | null = null;
  while ((m = MOTION_EXPR.exec(src)) !== null) {
    if (m.index > arrStart) break;
    if (m.index > arrStart - 800) best = m.index + m[0].length - 1;
  }
  if (best === null) return null;
  const block = braceBlock(src, best);
  if (!block) return null;
  if (arrStart < best || arrStart > best + block.length) return null;
  return { block, offset: arrStart - best };
}

/** Resolve the transition that owns a keyframe array. */
function resolveTransition(
  src: string,
  arrayEnd: number,
  side: 'truthy' | 'falsy' | null
): Record<string, string> | null {
  const ahead = src.slice(arrayEnd, arrayEnd + 600);
  const m = /transition\s*[:=]\s*/.exec(ahead);
  if (!m) return null;
  const refStart = arrayEnd + m.index + m[0].length;
  const rest = src.slice(refStart);
  const trimmed = rest.trimStart();
  if (trimmed.startsWith('{')) {
    // Balanced block from the full source — may be an object literal or a
    // braced ternary (`transition={cond ? A : B}`).
    const open = rest.indexOf('{');
    const block = braceBlock(rest, open);
    return block ? resolveRefText(src, block, side) : null;
  }
  // Identifier reference or bare ternary condition — a bounded slice is safe.
  return resolveRefText(src, rest.slice(0, 400), side);
}

function isViolation(entries: Record<string, string> | null, key: string): boolean {
  if (!isSpringEntries(entries)) return false; // multi-keyframe without explicit spring defaults to tween
  const override = entries?.[key];
  if (override && override.startsWith('{')) {
    // per-value override: tween-ish wins, spring stays a violation
    if (TWEENISH.test(override) && !SPRING_TYPE.test(override)) return false;
    if (SPRING_TYPE.test(override)) return true;
    return false;
  }
  return true; // spring transition, no per-value override for this key
}

function scanFile(relPath: string, rawSrc: string): Violation[] {
  const src = stripComments(rawSrc);
  const violations: Violation[] = [];
  KEYFRAME_ARRAY.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = KEYFRAME_ARRAY.exec(src)) !== null) {
    const arrStart = m.index;
    const arrEnd = m.index + m[0].length;
    const lineStart = src.lastIndexOf('\n', arrStart) + 1;
    const lineEnd = src.indexOf('\n', arrEnd);
    const line = src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd);

    // React children loops are not keyframes
    if (line.includes('.map(')) continue;
    // cubic-bezier / keyframe-timing arrays inside a transition
    if (/(?:ease|times)\s*:\s*$/.test(src.slice(lineStart, arrStart))) continue;
    // data consts (`const X = [...]`) — only motion values count
    const prefix = src.slice(Math.max(lineStart, arrStart - 60), arrStart);
    if (DATA_ASSIGN.test(prefix) && !MOTION_PROP.test(prefix)) continue;

    const keyMatch = MOTION_VALUE_KEY.exec(prefix);
    const key = keyMatch ? keyMatch[1] : null;
    if (!key) continue; // array without a property key — not a motion value we can judge

    const motion = owningMotionBlock(src, arrStart);
    const side = motion ? ternarySide(motion.block, motion.offset) : null;
    const entries = resolveTransition(src, arrEnd, side);
    if (isViolation(entries, key)) {
      const lineNo = lineOf(src, arrStart);
      if (!violations.some((v) => v.file === relPath && v.line === lineNo)) {
        violations.push({ file: relPath, line: lineNo, text: line.trim() });
      }
    }
  }
  return violations;
}

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name) && entry.name !== TEST_FILE) yield full;
  }
}

describe('spring keyframes guard (framer-motion 2-keyframes-max)', () => {
  it('no motion value uses 3+ keyframes with a spring transition', () => {
    const violations: Violation[] = [];
    for (const file of walk(FE_NEXT_ROOT)) {
      violations.push(...scanFile(path.relative(FE_NEXT_ROOT, file), fs.readFileSync(file, 'utf8')));
    }
    const report = violations.map((v) => `  ${v.file}:${v.line}\n    ${v.text}`).join('\n');
    expect(violations, `${violations.length} spring+keyframes violation(s):\n${report}`).toEqual([]);
  });
});
