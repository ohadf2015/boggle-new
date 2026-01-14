import { NextResponse } from 'next/server';

/**
 * GET /api/admin/email-preview
 * Returns an HTML preview of the daily challenge email template
 * This endpoint is used by the admin dashboard to preview emails
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.com';

  // Calculate puzzle number (days since launch)
  const launchDate = new Date('2025-12-30');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - launchDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const puzzleNumber = Math.max(1, diffDays + 1);

  const logoUrl = `${baseUrl}/logos/lexiclash_logo_english-min.png`;
  const bannerUrl = `${baseUrl}/email/daily-banner.png`;

  // Neo-brutalist color palette
  const colors = {
    navy: '#1a1a2e',
    navyLight: '#252545',
    lime: '#CCFF00',
    pink: '#FF1493',
    cyan: '#00FFFF',
    orange: '#FF6B35',
    white: '#FFFFFF',
    black: '#000000',
    gray: '#666666',
    grayLight: '#888888',
  };

  const recipientName = 'Preview User';
  const playUrl = `${baseUrl}/en/daily`;
  const unsubscribeUrl = '#preview-unsubscribe';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Daily Challenge Email Preview</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.navy}; font-family: 'Fredoka', 'Rubik', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preview Banner -->
  <div style="background: linear-gradient(90deg, ${colors.pink}, ${colors.cyan}); color: ${colors.black}; text-align: center; padding: 8px; font-weight: bold; font-size: 12px;">
    EMAIL PREVIEW - This is how recipients will see your email
  </div>

  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: ${colors.navy};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" style="max-width: 520px; width: 100%; border-collapse: collapse;">

          <!-- Logo Row -->
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <a href="${baseUrl}" style="text-decoration: none;">
                <img src="${logoUrl}" alt="LexiClash" width="160" style="display: block; max-width: 160px; height: auto;" />
              </a>
            </td>
          </tr>

          <!-- Hero Banner -->
          <tr>
            <td style="padding-bottom: 0;">
              <a href="${playUrl}" style="text-decoration: none;">
                <img src="${bannerUrl}" alt="Daily Challenge" width="520" style="display: block; width: 100%; max-width: 520px; height: auto; border: 4px solid ${colors.black}; border-bottom: 0; border-radius: 16px 16px 0 0; box-shadow: 6px 0 0 ${colors.black};" />
              </a>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background: linear-gradient(180deg, ${colors.navyLight} 0%, ${colors.navy} 100%); border: 4px solid ${colors.black}; border-top: 0; border-radius: 0 0 16px 16px; padding: 24px 28px 28px; box-shadow: 6px 6px 0px ${colors.black};">

              <!-- Puzzle Number Badge -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                <tr>
                  <td align="center">
                    <span style="display: inline-block; background-color: ${colors.lime}; color: ${colors.black}; font-size: 13px; font-weight: 900; padding: 8px 20px; border: 3px solid ${colors.black}; border-radius: 50px; text-transform: uppercase; letter-spacing: 2px; box-shadow: 3px 3px 0 ${colors.black};">
                      ⚡ Puzzle #${puzzleNumber}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <h1 style="color: ${colors.white}; font-size: 26px; margin: 0 0 8px 0; font-weight: 800; text-align: center; line-height: 1.2;">
                ${recipientName}, ready to play?
              </h1>

              <!-- Tagline -->
              <p style="color: ${colors.cyan}; font-size: 18px; line-height: 1.4; margin: 0 0 20px 0; text-align: center; font-weight: 700;">
                Today's grid is live. Think you can beat it?
              </p>

              <!-- Value Props (compact grid) -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td width="33%" align="center" style="padding: 8px 4px;">
                    <div style="background: rgba(204, 255, 0, 0.1); border: 2px solid ${colors.lime}; border-radius: 8px; padding: 12px 8px;">
                      <div style="font-size: 20px; margin-bottom: 4px;">🎯</div>
                      <div style="color: ${colors.lime}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Same Grid</div>
                      <div style="color: ${colors.grayLight}; font-size: 9px; margin-top: 2px;">Fair play</div>
                    </div>
                  </td>
                  <td width="33%" align="center" style="padding: 8px 4px;">
                    <div style="background: rgba(255, 20, 147, 0.1); border: 2px solid ${colors.pink}; border-radius: 8px; padding: 12px 8px;">
                      <div style="font-size: 20px; margin-bottom: 4px;">⚡</div>
                      <div style="color: ${colors.pink}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">One Shot</div>
                      <div style="color: ${colors.grayLight}; font-size: 9px; margin-top: 2px;">No retries</div>
                    </div>
                  </td>
                  <td width="33%" align="center" style="padding: 8px 4px;">
                    <div style="background: rgba(0, 255, 255, 0.1); border: 2px solid ${colors.cyan}; border-radius: 8px; padding: 12px 8px;">
                      <div style="font-size: 20px; margin-bottom: 4px;">🏆</div>
                      <div style="color: ${colors.cyan}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Climb Up</div>
                      <div style="color: ${colors.grayLight}; font-size: 9px; margin-top: 2px;">Leaderboard</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CTA Button - Neo-Brutalist style -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${playUrl}" style="display: inline-block; background-color: ${colors.lime}; color: ${colors.black}; font-size: 20px; font-weight: 900; text-decoration: none; padding: 16px 48px; border: 4px solid ${colors.black}; border-radius: 12px; box-shadow: 5px 5px 0px ${colors.black}; text-transform: uppercase; letter-spacing: 3px;">
                      🎮 PLAY NOW
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Streak Reminder -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                  <td align="center">
                    <div style="background: linear-gradient(90deg, rgba(255, 107, 53, 0.15) 0%, rgba(255, 107, 53, 0.05) 100%); border-left: 4px solid ${colors.orange}; border-radius: 0 8px 8px 0; padding: 12px 16px;">
                      <span style="color: ${colors.orange}; font-size: 15px; font-weight: 700;">
                        🔥 Your streak is on the line — don't let it slip!
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px; text-align: center;">
              <p style="color: ${colors.gray}; font-size: 12px; margin: 0 0 8px 0; line-height: 1.6;">
                You're receiving this because you subscribed to daily challenges.
              </p>
              <p style="color: ${colors.grayLight}; font-size: 11px; margin: 0; line-height: 1.6;">
                <a href="${unsubscribeUrl}" style="color: ${colors.grayLight}; text-decoration: underline;">Unsubscribe</a>
                &nbsp;•&nbsp;
                <a href="${baseUrl}" style="color: ${colors.grayLight}; text-decoration: underline;">Visit LexiClash</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
