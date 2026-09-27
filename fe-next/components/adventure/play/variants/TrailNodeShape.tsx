'use client';

/**
 * One level-kind silhouette as inline SVG: hard black offset shadow, 5-unit black
 * outline, kind-coloured fill. Shapes are built from unions of simple parts
 * (outline layer under fill layer) so multi-part shapes like the cloud stay clean.
 * Elite/boss clip their enemy portrait into the shape.
 */
import { useId } from 'react';
import type { NodeShape } from './trailLayout';

type Part = { d: string } | { cx: number; cy: number; r: number };

function burst(points: number, outer: number, inner: number, c = 48): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(c + r * Math.cos(a)).toFixed(1)} ${(c + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

const SHIELD = 'M48 5L88 16V46Q88 76 48 92Q8 76 8 46V16Z';

const PARTS: Record<NodeShape, Part[]> = {
  square: [{ d: 'M24 8H72Q88 8 88 24V72Q88 88 72 88H24Q8 88 8 72V24Q8 8 24 8Z' }],
  diamond: [{ d: 'M48 4L92 48L48 92L4 48Z' }],
  hexagon: [{ d: 'M28 10H68L90 48L68 86H28L6 48Z' }],
  cloud: [
    { cx: 27, cy: 60, r: 19 }, { cx: 48, cy: 42, r: 25 }, { cx: 70, cy: 57, r: 20 }, { cx: 49, cy: 68, r: 20 },
  ],
  bomb: [{ cx: 48, cy: 57, r: 34 }, { d: 'M37 16H59V30H37Z' }],
  shield: [{ d: SHIELD }],
  burst: [{ d: burst(14, 46, 37) }],
};

/** Where the portrait is clipped for big nodes. */
const ART_CLIP: Partial<Record<NodeShape, Part>> = {
  shield: { d: 'M48 11L82 20V46Q82 71 48 86Q14 71 14 46V20Z' },
  burst: { cx: 48, cy: 48, r: 34 },
};

function renderPart(p: Part, key: number, props: React.SVGProps<SVGPathElement & SVGCircleElement>) {
  return 'd' in p ? <path key={key} d={p.d} {...props} /> : <circle key={key} cx={p.cx} cy={p.cy} r={p.r} {...props} />;
}

interface Props {
  shape: NodeShape;
  fill: string;
  /** Portrait for elite/boss nodes. */
  art?: string;
  greyArt?: boolean;
  className?: string;
}

export default function TrailNodeShape({ shape, fill, art, greyArt, className }: Props) {
  const id = useId().replace(/:/g, '');
  const parts = PARTS[shape];
  const clip = ART_CLIP[shape];
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden data-shape-svg={shape} overflow="visible">
      {/* hard pixel shadow */}
      <g transform="translate(6 6)">{parts.map((p, i) => renderPart(p, i, { fill: '#000' }))}</g>
      {/* outline, then fill on top: union of parts reads as one silhouette */}
      <g>{parts.map((p, i) => renderPart(p, i, { fill: '#000', stroke: '#000', strokeWidth: 10, strokeLinejoin: 'round' }))}</g>
      <g>{parts.map((p, i) => renderPart(p, i, { fill }))}</g>
      {/* inner bevel highlight: a light line along the top edge, flat, no blur */}
      <g opacity={0.35}>{parts.slice(0, 1).map((p, i) => renderPart(p, i, {
        fill: 'none', stroke: '#fff', strokeWidth: 3, strokeDasharray: '0 6 60 400', strokeLinecap: 'round',
      }))}</g>
      {shape === 'bomb' && (
        <g>
          <path d="M48 16Q50 4 62 5" fill="none" stroke="#000" strokeWidth={5} strokeLinecap="round" />
          <circle cx={65} cy={5} r={6} fill="#ffe135" stroke="#000" strokeWidth={2.5} />
        </g>
      )}
      {art && clip && (
        <>
          <defs>
            <clipPath id={`clip-${id}`}>{renderPart(clip, 0, {})}</clipPath>
          </defs>
          {renderPart(clip, 0, { fill: '#0f1b3d', opacity: 0.55 })}
          <image data-testid="enemy-art" href={art} x={4} y={shape === 'burst' ? 8 : 10} width={88} height={88}
            preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip-${id})`}
            style={greyArt ? { filter: 'grayscale(1) brightness(0.6)' } : undefined} />
          {renderPart(clip, 1, { fill: 'none', stroke: '#000', strokeWidth: 3.5 })}
        </>
      )}
    </svg>
  );
}
