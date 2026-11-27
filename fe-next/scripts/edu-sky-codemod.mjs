#!/usr/bin/env node
/**
 * Classroom "sky" codemod: rewrites dark-only colour classes in the classroom
 * file set to the edu-* tokens (see docs/plans/2026-11-27-edu-sky-redesign.md).
 *
 *   node scripts/edu-sky-codemod.mjs           # source files
 *   node scripts/edu-sky-codemod.mjs --tests   # tests under the same roots
 *   node scripts/edu-sky-codemod.mjs --check   # list files it would change, exit 1 if any
 *
 * Re-runnable: its output is a fixed point.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const EDU_SKY_ROOTS = [
  'components/education',
  'components/teacher',
  'components/student',
  'app/[locale]/teacher',
  'app/[locale]/student',
  'app/[locale]/join',
  'app/[locale]/classroom',
  'app/[locale]/report',
  'app/[locale]/education/page.tsx',
  'app/[locale]/education/PageClient.tsx',
  'app/[locale]/education/access',
  'app/[locale]/education/classroom-game',
  'app/[locale]/education/live',
  'app/[locale]/education/duels',
  'app/[locale]/education/help',
  'app/[locale]/dev/boss',
  'app/[locale]/dev/reward-chest',
];

/** Route roots that render <EduSkyScope> and export the sky viewport. */
export const EDU_SKY_LAYOUTS = [
  'app/[locale]/teacher/layout.tsx',
  'app/[locale]/student/layout.tsx',
  'app/[locale]/join/layout.tsx',
  'app/[locale]/classroom/layout.tsx',
  'app/[locale]/report/layout.tsx',
  'app/[locale]/education/page.tsx',
  'app/[locale]/education/access/layout.tsx',
  'app/[locale]/education/classroom-game/layout.tsx',
  'app/[locale]/education/live/layout.tsx',
  'app/[locale]/education/duels/layout.tsx',
  'app/[locale]/education/help/layout.tsx',
  'app/[locale]/dev/boss/layout.tsx',
  'app/[locale]/dev/reward-chest/layout.tsx',
];

const isTest = (rel) => rel.split('/').includes('__tests__') || /\.test\.tsx?$/.test(rel);

export function listCodemodFiles(repo, { tests = false } = {}) {
  const out = [];
  const walk = (rel) => {
    const full = path.join(repo, rel);
    const stat = fs.statSync(full, { throwIfNoEntry: false });
    if (!stat) return;
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(full).sort()) {
        if (name !== 'node_modules') walk(`${rel}/${name}`);
      }
    } else if (/\.tsx?$/.test(rel) && !rel.endsWith('.d.ts') && isTest(rel) === tests) {
      out.push(rel);
    }
  };
  EDU_SKY_ROOTS.forEach(walk);
  return out;
}

const DARK_SOLID = new Set(['bg-neo-purple', 'bg-neo-red', 'bg-neo-black', 'bg-black', 'edu-rays-dark']);
const PAGE_ROOT = /^(min-h-.+|h-dvh|h-screen|h-\[100[dsl]?vh\]|flex-1)$/;
const OWN_FILL = /^bg-(neo-|edu-|white|black|transparent|\[)/;

/** `md:hover:!text-white/60` → { prefix: 'md:hover:', bang: '!', base: 'text-white/60', tail: '' } */
function splitToken(token) {
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === '[' || c === '(') depth++;
    else if (c === ']' || c === ')') depth--;
    else if (c === ':' && depth === 0) cut = i;
  }
  const prefix = token.slice(0, cut + 1);
  let base = token.slice(cut + 1);
  let bang = '';
  let tail = '';
  if (base.startsWith('!')) [bang, base] = ['!', base.slice(1)];
  if (base.endsWith('!')) [tail, base] = ['!', base.slice(0, -1)];
  return { prefix, bang, base, tail };
}

const bases = (str) => str.split(/\s+/).filter(Boolean).map((t) => splitToken(t).base);

const GRAY_INK = { 100: '/80', 200: '/80', 300: '/70', 400: '/60' };
const line = (alpha) => (alpha === undefined || Number(alpha) >= 25 ? '' : `/${alpha}`);

function mapBase(base, ctx) {
  let m;
  if ((m = /^text-(?:neo-white|neo-cream|white)(?:\/(\d+))?$/.exec(base))) {
    return ctx.dark ? base : `text-edu-ink${m[1] ? `/${m[1]}` : ''}`;
  }
  if ((m = /^text-neo-gray-(100|200|300|400)$/.exec(base))) {
    return ctx.dark ? base : `text-edu-ink${GRAY_INK[m[1]]}`;
  }
  if ((m = /^text-neo-(lime|cyan|yellow|pink|purple|orange)(\/\d+)?$/.exec(base))) {
    return ctx.dark ? base : `text-edu-${m[1]}-ink${m[2] ?? ''}`;
  }
  if ((m = /^(border(?:-[xytrblse])?|ring|divide|outline|shadow)-(?:neo-cream|neo-white|white)(?:\/(\d+))?$/.exec(base))) {
    return `${m[1]}-edu-line${line(m[2])}`;
  }
  if ((m = /^(border(?:-[xytrblse])?)-neo-gray(?:-\d+)?(?:\/\d+)?$/.exec(base))) {
    return `${m[1]}-edu-line/30`;
  }
  if ((m = /^bg-(?:neo-cream|neo-white|white)\/(\d+)$/.exec(base)) && Number(m[1]) <= 30) {
    return `bg-edu-ink/${m[1]}`;
  }
  if (base === 'bg-neo-navy') return ctx.pageRoot ? 'bg-edu-page' : 'bg-edu-surface';
  if ((m = /^bg-neo-navy-(?:light|elevated)(\/\d+)?$/.exec(base))) return `bg-edu-surface${m[1] ?? ''}`;
  if ((m = /^bg-neo-navy\/(\d+)$/.exec(base))) return ctx.dimmer ? base : `bg-edu-surface/${m[1]}`;
  if (/^ring-offset-neo-navy(-light|-elevated)?$/.test(base)) return 'ring-offset-edu-surface';
  return base;
}

/**
 * Maps one class string. `group` is every class in the enclosing className
 * attribute or cn() call; it decides the solid-fill exception only for a
 * literal that carries no fill of its own (`on && 'text-white'`).
 */
export function mapClassString(str, group = str) {
  const own = bases(str);
  const scope = own.some((b) => OWN_FILL.test(b)) ? own : bases(group);
  const fullScreen = own.includes('fixed') && own.includes('inset-0');
  const ctx = {
    dark: scope.some((b) => DARK_SOLID.has(b)),
    pageRoot: fullScreen || own.some((b) => PAGE_ROOT.test(b)),
    dimmer: fullScreen,
  };
  return str.replace(/\S+/g, (token) => {
    const { prefix, bang, base, tail } = splitToken(token);
    const next = mapBase(base, ctx);
    return next === base ? token : `${prefix}${bang}${next}${tail}`;
  });
}

const CLASS_CALLS = new Set(['cn', 'clsx', 'cx', 'twMerge', 'classNames', 'cva']);

function groupRoot(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isJsxAttribute(p) && /class/i.test(p.name.getText())) return p;
    if (ts.isCallExpression(p) && CLASS_CALLS.has(p.expression.getText())) return p;
    if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isFunctionLike(p)) return null;
  }
  return null;
}

/** Each class-bearing literal as { start, end, text, group } (template literals as one unit). */
function collectLiterals(src, fileName) {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, kind);
  const units = [];
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const start = node.getStart(sf) + 1;
      units.push({ node, chunks: [{ start, end: node.end - 1 }] });
      return;
    }
    if (ts.isTemplateExpression(node)) {
      const chunks = [{ start: node.head.getStart(sf) + 1, end: node.head.end - 2 }];
      for (const span of node.templateSpans) {
        const lit = span.literal;
        const isTail = ts.isTemplateTail(lit);
        chunks.push({ start: lit.getStart(sf) + 1, end: lit.end - (isTail ? 1 : 2) });
      }
      units.push({ node, chunks });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  const groups = new Map();
  for (const u of units) {
    u.text = u.chunks.map((c) => src.slice(c.start, c.end)).join(' ');
    u.root = groupRoot(u.node);
    if (u.root) groups.set(u.root, `${groups.get(u.root) ?? ''} ${u.text}`);
  }
  for (const u of units) u.group = u.root ? groups.get(u.root) : u.text;
  return units;
}

export function classLiterals(src, fileName) {
  return collectLiterals(src, fileName).map((u) => u.text);
}

export function transformSource(src, fileName) {
  const edits = [];
  for (const u of collectLiterals(src, fileName)) {
    if (!/neo-|white|ring-offset/.test(u.text)) continue;
    for (const c of u.chunks) {
      const raw = src.slice(c.start, c.end);
      const next = u.chunks.length > 1 ? mapChunk(raw, u.text, u.group) : mapClassString(raw, u.group);
      if (next !== raw) edits.push({ ...c, next });
    }
  }
  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.next + out.slice(e.end);
  return out;
}

/** A template chunk reads the whole template as its literal. */
function mapChunk(raw, whole, group) {
  const marker = ' \u0000 ';
  const mapped = mapClassString(`${raw}${marker}${whole}`, group);
  return mapped.slice(0, mapped.indexOf(marker));
}

function main() {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const args = new Set(process.argv.slice(2));
  const files = listCodemodFiles(repo, { tests: args.has('--tests') });
  let changed = 0;
  for (const rel of files) {
    const full = path.join(repo, rel);
    const src = fs.readFileSync(full, 'utf8');
    const out = transformSource(src, rel);
    if (out === src) continue;
    changed++;
    if (args.has('--check')) console.log(rel);
    else fs.writeFileSync(full, out);
  }
  console.log(`edu-sky codemod: ${changed} of ${files.length} files ${args.has('--check') ? 'would change' : 'changed'}`);
  if (args.has('--check') && changed) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
