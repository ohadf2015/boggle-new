/**
 * Challenge Share Card — OG Image Generation
 *
 * Generates a shareable Open Graph image for "Beat My Score" challenges.
 * When shared on social media, this image makes the challenge link irresistible.
 *
 * Usage: /api/og/challenge?player=Ohad&score=250&words=18&combo=7&lang=en
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const C = {
  navy: '#1a1a2e',
  black: '#000000',
  white: '#FFFFFF',
  lime: '#BFFF00',
  cyan: '#00FFFF',
  pink: '#FF1493',
  yellow: '#FFE135',
  orange: '#FF6B35',
  purple: '#A855F7',
};

const SCORE_TIERS = [
  { min: 300, color: C.pink, label: 'LEGENDARY', bg: '#3e1a2e' },
  { min: 200, color: C.orange, label: 'AMAZING', bg: '#2e2a1a' },
  { min: 150, color: C.yellow, label: 'GREAT', bg: '#2e2a1a' },
  { min: 100, color: C.lime, label: 'SOLID', bg: '#1a2e1a' },
  { min: 0, color: C.cyan, label: 'NICE', bg: '#1a2e3e' },
];

const CTA: Record<string, string> = {
  en: 'Think you can beat this?',
  he: 'חושבים שתצליחו לנצח?',
  sv: 'Tror du att du kan slå det?',
  ja: 'このスコアに勝てる？',
  es: '¿Crees que puedes ganar?',
};

function getTier(score: number) {
  return SCORE_TIERS.find(t => score >= t.min) || SCORE_TIERS[SCORE_TIERS.length - 1];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const player = searchParams.get('player') || 'Someone';
  const score = parseInt(searchParams.get('score') || '0', 10);
  const words = parseInt(searchParams.get('words') || '0', 10);
  const combo = parseInt(searchParams.get('combo') || '0', 10);
  const lang = searchParams.get('lang') || 'en';

  const tier = getTier(score);
  const cta = CTA[lang] || CTA.en;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.navy,
          backgroundImage: `radial-gradient(circle at 20% 30%, ${tier.bg} 0%, transparent 50%), radial-gradient(circle at 80% 70%, #16213e 0%, transparent 50%)`,
          padding: '40px',
        }}
      >
        {/* Main card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: C.navy,
            border: `6px solid ${tier.color}`,
            borderRadius: '16px',
            boxShadow: `12px 12px 0px ${C.black}`,
            padding: '48px 64px',
            maxWidth: '1000px',
            width: '100%',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '28px', color: tier.color, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              Challenge
            </span>
          </div>

          {/* LexiClash brand */}
          <div style={{ display: 'flex', marginBottom: '32px' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: `${C.white}50`, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              LexiClash
            </span>
          </div>

          {/* Player name */}
          <div style={{ display: 'flex', marginBottom: '16px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: C.white }}>
              {player}
            </span>
          </div>

          {/* Score — the hero element */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '96px', fontWeight: 900, color: tier.color, lineHeight: 1 }}>
              {score.toLocaleString()}
            </span>
            <span style={{ fontSize: '28px', fontWeight: 700, color: `${C.white}60` }}>
              pts
            </span>
          </div>

          {/* Tier badge */}
          <div
            style={{
              display: 'flex',
              padding: '6px 20px',
              borderRadius: '8px',
              border: `3px solid ${tier.color}`,
              backgroundColor: `${tier.color}20`,
              marginBottom: '28px',
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: 900, color: tier.color, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              {tier.label}
            </span>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: '40px',
              marginBottom: '32px',
            }}
          >
            {words > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '32px', fontWeight: 900, color: C.white }}>{words}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: `${C.white}50`, textTransform: 'uppercase' }}>words</span>
              </div>
            )}
            {combo >= 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '32px', fontWeight: 900, color: C.orange }}>{combo}x</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: `${C.white}50`, textTransform: 'uppercase' }}>combo</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <div
            style={{
              display: 'flex',
              padding: '14px 36px',
              borderRadius: '8px',
              backgroundColor: tier.color,
              border: `4px solid ${C.black}`,
              boxShadow: `6px 6px 0px ${C.black}`,
            }}
          >
            <span style={{ fontSize: '22px', fontWeight: 900, color: C.black, textTransform: 'uppercase' }}>
              {cta}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
