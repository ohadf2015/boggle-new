import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { parseClassWinParams } from '@/lib/education/classWinOgModel';

export const runtime = 'edge';

const C = {
  navy: '#1a1a2e',
  black: '#000000',
  lime: '#BFFF00',
  cyan: '#00FFFF',
  pink: '#FF1493',
  cream: '#FFFEF0',
};

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 28px',
        marginRight: '20px',
        border: `4px solid ${C.black}`,
        borderRadius: '14px',
        backgroundColor: color,
        boxShadow: `8px 8px 0px ${C.black}`,
      }}
    >
      <div style={{ display: 'flex', fontSize: '56px', fontWeight: 900, color: C.black, lineHeight: 1 }}>{value}</div>
      <div style={{ display: 'flex', fontSize: '20px', fontWeight: 800, color: C.black, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px' }}>
        {label}
      </div>
    </div>
  );
}

export async function GET(request: NextRequest) {
  const p = parseClassWinParams(new URL(request.url).searchParams);
  const headline = p.words > 0 ? `Our class found ${p.words} words together!` : 'Our class played LexiClash together!';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.navy,
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: '1080px',
            padding: '44px 56px',
            backgroundColor: C.navy,
            border: `6px solid ${C.lime}`,
            borderRadius: '16px',
            boxShadow: `14px 14px 0px ${C.black}`,
          }}
        >
          <div style={{ display: 'flex', fontSize: '24px', fontWeight: 900, color: C.lime, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '14px' }}>
            {p.modeLabel ? `Class win · ${p.modeLabel}` : 'Class win'}
          </div>
          <div style={{ display: 'flex', fontSize: '60px', fontWeight: 900, color: C.cream, lineHeight: 1.08, marginBottom: '34px' }}>{headline}</div>
          <div style={{ display: 'flex' }}>
            <Stat value={String(p.words)} label="Words" color={C.lime} />
            {p.students > 0 && <Stat value={String(p.students)} label="Players" color={C.cyan} />}
            {p.total > 0 && <Stat value={`${p.found}/${p.total}`} label="Lesson words" color={C.pink} />}
          </div>
          <div style={{ display: 'flex', marginTop: '36px', alignItems: 'center' }}>
            <span style={{ fontSize: '30px', fontWeight: 900, color: C.lime }}>Lexi</span>
            <span style={{ fontSize: '30px', fontWeight: 900, color: C.cyan }}>Clash</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: C.cream, marginLeft: '16px' }}>Word games for the classroom</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
