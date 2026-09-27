/**
 * ModeGrid — shared email mode grid used by the welcome + reengagement emails.
 *
 * Renders a 2-column grid of public-mode tiles (see lib/email/welcomeModes).
 * Each tile is a link; the generated cube image carries the colour while the
 * name + tagline stay real text (blocked-image safe).
 *
 * KEY: the cube PNGs are baked on solid `#1a1a2e` navy with a white die-cut
 * mascot. Shrunk small on a *different* navy, the white mascot reads as a
 * broken white square. So the tile background is set to that EXACT navy and the
 * image bleeds seamlessly (no rounded box) — the mascot then floats as a
 * character, matching the landing cubes.
 */
import { Link, Img, Text } from '@react-email/components';
import type { WelcomeEmailMode } from '@/lib/email/welcomeModes';

export interface ModeGridPalette {
  /** MUST equal the cube image's baked navy (#1a1a2e) for a seamless blend. */
  tileBg: string;
  tileBorder: string;
  title: string;
  tagline: string;
  header: string;
  black: string;
}

export interface ModeGridProps {
  modes: WelcomeEmailMode[];
  rtl: boolean;
  dir: 'rtl' | 'ltr';
  /** hard-shadow X-offset sign ('' ltr, '-' rtl) */
  sh: string;
  /** localized section header label */
  header: string;
  palette: ModeGridPalette;
}

export function ModeGrid({ modes, rtl, dir, sh, header, palette }: ModeGridProps) {
  if (!modes || modes.length === 0) return null;

  const rows: WelcomeEmailMode[][] = [];
  for (let i = 0; i < modes.length; i += 2) rows.push(modes.slice(i, i + 2));

  return (
    <>
      <Text style={{
        color: palette.header,
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '2px',
        textTransform: 'uppercase' as const,
        textAlign: 'center',
        margin: '0 0 14px',
        direction: dir,
        fontFamily: "'Fredoka', Arial, sans-serif",
      }}>
        {header}
      </Text>

      {rows.map((row, ri) => (
        <table key={`mode-row-${ri}`} role="presentation" cellPadding={0} cellSpacing={0}
          width="100%" style={{ marginBottom: '10px' }}>
          <tr>
            {row.map((m) => (
              <td key={m.key} width="50%" valign="top"
                style={{ padding: rtl ? '0 0 0 5px' : '0 5px 0 0' }}>
                <Link href={m.href} target="_blank"
                  style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                  <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" dir={dir}
                    style={{
                      backgroundColor: palette.tileBg,
                      border: `2px solid ${palette.tileBorder}`,
                      borderRadius: '14px',
                      boxShadow: `${sh}3px 3px 0px ${palette.black}`,
                      height: '100%',
                    }}>
                    <tr>
                      {/* Cube image — bleeds seamlessly (no own radius/box); the
                          tile's matching navy hides the baked image background. */}
                      <td width="72" valign="middle"
                        style={{ padding: rtl ? '6px 4px 6px 0' : '6px 0 6px 4px' }}>
                        <Img
                          src={m.cubeImageUrl}
                          alt={m.title}
                          width="68"
                          height="68"
                          style={{
                            display: 'block',
                            width: '68px',
                            height: '68px',
                            border: 0,
                            outline: 'none',
                          }}
                        />
                      </td>
                      <td valign="middle"
                        style={{ padding: rtl ? '8px 6px 8px 2px' : '8px 2px 8px 6px', direction: dir }}>
                        <div style={{
                          color: palette.title, fontSize: '14px', fontWeight: 700,
                          lineHeight: 1.2, marginBottom: '3px',
                          fontFamily: "'Fredoka', Arial, sans-serif",
                        }}>
                          {m.title}
                        </div>
                        <div style={{ color: palette.tagline, fontSize: '11px', lineHeight: 1.35 }}>
                          {m.tagline}
                        </div>
                      </td>
                    </tr>
                  </table>
                </Link>
              </td>
            ))}
          </tr>
        </table>
      ))}
    </>
  );
}

export default ModeGrid;
