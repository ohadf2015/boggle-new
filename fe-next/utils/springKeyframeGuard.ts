/**
 * Static guard against framer-motion / motion spring+multi-keyframe combos.
 *
 * Motion springs (and inertia) only accept TWO keyframes. Passing 3+ throws
 * (dev) / surfaces as a client exception in PostHog:
 *   "Only two keyframes currently supported with spring and inertia animations"
 *
 * See growth-radar t_15ec0d7a (#3597 on /en) and prior fix #893.
 *
 * t_3eaf4342: Motion defaults *transform* animations to spring when no
 * transition is set (or only `delay` is set). Multi-keyframe transforms
 * without an explicit tween therefore throw at runtime even though the
 * old guard required an explicit `type:'spring'` to flag. We now also
 * flag that default-spring risk.
 */
import fs from 'node:fs';
import path from 'node:path';

const TAG_START = /<(?:m|motion|AdaptiveMotion)\.([A-Za-z0-9]+)/g;
const ARRAY_PROP =
  /(scale|opacity|x|y|rotate|width|height):\s*(\[[^\]]+\])/g;
const SPRING_CONST =
  /const\s+(\w+)\s*=\s*\{[^}]*type:\s*['"]spring['"][^}]*\}/gs;

function extractBalanced(src: string, openIdx: number): string | null {
  if (src[openIdx] !== '{') return null;
  let i = openIdx;
  let depth = 0;
  let inStr: string | null = null;
  while (i < src.length) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === inStr) inStr = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      i += 1;
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
    i += 1;
  }
  return null;
}

function extractJsxProp(tag: string, prop: string): string | null {
  const re = new RegExp(`${prop}=\\{`);
  const m = re.exec(tag);
  if (!m) return null;
  return extractBalanced(tag, m.index + m[0].length - 1);
}

function multiKeyframeArrays(body: string): Array<{ prop: string; lit: string }> {
  const out: Array<{ prop: string; lit: string }> = [];
  ARRAY_PROP.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ARRAY_PROP.exec(body))) {
    const nums = m[2].match(/-?\d+(?:\.\d+)?/g) ?? [];
    if (nums.length >= 3) out.push({ prop: m[1], lit: m[2] });
  }
  return out;
}

function springAppliesToProp(trans: string, prop: string): boolean {
  const propRe = new RegExp(`\\b${prop}\\s*:\\s*\\{`);
  const pm = propRe.exec(trans);
  if (pm) {
    const body = extractBalanced(trans, pm.index + pm[0].length - 1) ?? '';
    if (/type:\s*['"]spring['"]/.test(body)) return true;
    if (
      /\b(duration|ease|times|type:\s*['"]tween['"]|type:\s*['"]keyframes['"])/.test(
        body,
      )
    ) {
      return false;
    }
  }
  // Strip per-prop overrides, then look for default type:spring
  const stripped = trans.replace(
    /\b(?:scale|opacity|x|y|rotate|width|height|filter|boxShadow)\s*:\s*\{[^{}]*\}/g,
    '',
  );
  return /type:\s*['"]spring['"]/.test(stripped);
}

/** Split a ternary expression into consequent / alternate when possible. */
function ternaryBranches(expr: string): string[] | null {
  // Rough: find top-level `?` and matching `:`
  let depth = 0;
  let inStr: string | null = null;
  let q = -1;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (inStr) {
      if (c === '\\') {
        i += 1;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '{' || c === '(' || c === '[') depth += 1;
    else if (c === '}' || c === ')' || c === ']') depth -= 1;
    else if (c === '?' && depth === 0 && q < 0) q = i;
    else if (c === ':' && depth === 0 && q >= 0) {
      return [expr.slice(q + 1, i).trim(), expr.slice(i + 1).trim()];
    }
  }
  return null;
}

function expandSpringConsts(trans: string, consts: Record<string, string>): string {
  let out = trans;
  for (const [name, defn] of Object.entries(consts)) {
    if (new RegExp(`\\b${name}\\b`).test(trans)) out += `;${defn}`;
  }
  return out;
}

export type SpringKeyframeHit = {
  file: string;
  line: number;
  prop: string;
  animateProp: string;
  lit: string;
};


const TRANSFORM_PROPS = new Set(['scale', 'x', 'y', 'rotate', 'width', 'height']);

/**
 * True when this multi-kf transform is clearly tweened (safe with 3+ frames).
 * Inline `transition:` inside the animate object counts.
 */
function isExplicitTween(trans: string, prop: string, animBody: string): boolean {
  const blob = `${trans}\n${animBody}`;
  const propRe = new RegExp(`\\b${prop}\\s*:\\s*\\{`);
  const pm = propRe.exec(blob);
  if (pm) {
    const body = extractBalanced(blob, pm.index + pm[0].length - 1) ?? '';
    if (/type:\s*['"]spring['"]/.test(body)) return false;
    if (
      /\b(duration|ease|times|type:\s*['"]tween['"]|type:\s*['"]keyframes['"])/.test(
        body,
      )
    ) {
      return true;
    }
  }
  if (
    /transition\s*:\s*\{[^}]*(duration|ease|times|type:\s*['"]tween['"])/.test(
      animBody,
    )
  ) {
    return true;
  }
  if (/type:\s*['"]spring['"]/.test(trans) && !/\b(duration|ease|times)\s*:/.test(trans)) {
    return false;
  }
  if (/type:\s*['"]tween['"]/.test(trans) || /\b(duration|ease|times)\s*:/.test(trans)) {
    return true;
  }
  return false;
}

export function findSpringKeyframeViolations(
  rootDir: string,
): SpringKeyframeHit[] {
  const hits: SpringKeyframeHit[] = [];

  function walk(dir: string) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (
        ent.name === 'node_modules' ||
        ent.name === '.next' ||
        ent.name === 'dist' ||
        ent.name === '__tests__'
      ) {
        continue;
      }
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (/\.(tsx|jsx)$/.test(ent.name)) scanFile(full);
    }
  }

  function scanFile(file: string) {
    const text = fs.readFileSync(file, 'utf8');
    const consts: Record<string, string> = {};
    SPRING_CONST.lastIndex = 0;
    let cm: RegExpExecArray | null;
    while ((cm = SPRING_CONST.exec(text))) consts[cm[1]] = cm[0];

    TAG_START.lastIndex = 0;
    let tm: RegExpExecArray | null;
    while ((tm = TAG_START.exec(text))) {
      // opening tag end
      let depth = 0;
      let inStr: string | null = null;
      let j = tm.index + tm[0].length;
      while (j < text.length) {
        const c = text[j];
        if (inStr) {
          if (c === '\\') {
            j += 2;
            continue;
          }
          if (c === inStr) inStr = null;
          j += 1;
          continue;
        }
        if (c === '"' || c === "'" || c === '`') {
          inStr = c;
          j += 1;
          continue;
        }
        if (c === '{') depth += 1;
        else if (c === '}') depth -= 1;
        else if (c === '>' && depth <= 0) break;
        j += 1;
      }
      const tag = text.slice(tm.index, j + 1);
      const line = text.slice(0, tm.index).split('\n').length;

      for (const animateProp of [
        'animate',
        'whileHover',
        'whileTap',
        'whileInView',
      ] as const) {
        const animExpr = extractJsxProp(tag, animateProp);
        if (!animExpr) continue;
        // Missing transition is itself a signal: Motion defaults transforms to spring.
        const transExpr = extractJsxProp(tag, 'transition') ?? '';

        const animBranches = ternaryBranches(animExpr) ?? [animExpr];
        const transBranches = ternaryBranches(transExpr) ?? [transExpr];

        // Pair branches when both are ternaries of same shape; else cartesian
        // of each animate branch against each transition branch is too noisy.
        // Instead: for each animate branch, check against EVERY transition
        // branch that could apply — but only flag when THAT pair both has
        // multi-kf + spring. Conditional false-positives (shake tween vs idle
        // spring) are avoided by pairing by index when lengths match.
        // Pair same-shaped ternaries by index (shake tween vs idle spring).
        // If only transition is ternary, require EVERY branch to spring-apply
        // the multi-kf prop before flagging — otherwise the keyframes ride a
        // tween branch and the spring branch uses 1–2 values.
        type Pair = { anim: string; trans: string; requireAllTrans?: boolean };
        const pairs: Pair[] = [];
        if (animBranches.length === transBranches.length && animBranches.length > 1) {
          for (let i = 0; i < animBranches.length; i++) {
            pairs.push({
              anim: animBranches[i],
              trans: expandSpringConsts(transBranches[i], consts),
            });
          }
        } else if (animBranches.length === 1 && transBranches.length > 1) {
          pairs.push({
            anim: animBranches[0],
            trans: '',
            requireAllTrans: true,
          });
        } else {
          for (const a of animBranches) {
            for (const t of transBranches) {
              pairs.push({ anim: a, trans: expandSpringConsts(t, consts) });
            }
          }
        }

        for (const pair of pairs) {
          for (const { prop, lit } of multiKeyframeArrays(pair.anim)) {
            if (pair.requireAllTrans) {
              const allSpring = transBranches.every((t) =>
                springAppliesToProp(expandSpringConsts(t, consts), prop),
              );
              if (allSpring) {
                hits.push({
                  file: path.relative(rootDir, file),
                  line,
                  prop,
                  animateProp,
                  lit,
                });
              }
              continue;
            }
            const t = pair.trans;
            const explicitSpring =
              /type:\s*['"]spring['"]/.test(t) && springAppliesToProp(t, prop);
            const defaultSpringRisk =
              TRANSFORM_PROPS.has(prop) && !isExplicitTween(t, prop, pair.anim);
            if (explicitSpring || defaultSpringRisk) {
              hits.push({
                file: path.relative(rootDir, file),
                line,
                prop,
                animateProp,
                lit,
              });
            }
          }
        }
      }
    }
  }

  walk(rootDir);
  return hits;
}
