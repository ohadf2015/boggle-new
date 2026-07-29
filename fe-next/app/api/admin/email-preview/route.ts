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

  const logoUrl = `${baseUrl}/logos/lexiclash_logo_english-min.webp`;

  // Neo-brutalist color palette (aligned with design system)
  const colors = {
    navy: '#1a1a2e',
    navyLight: '#16213e',
    navyCard: '#252545',
    lime: '#BFFF00',
    limeLight: '#D9FF66',
    limeMuted: '#A6D900',
    pink: '#FF1493',
    pinkLight: '#FF6BB8',
    cyan: '#00FFFF',
    cyanMuted: '#4DD9D9',
    purple: '#8B5CF6',
    orange: '#FF6B35',
    white: '#FFFFFF',
    black: '#000000',
    gray: '#666666',
    grayLight: '#9CA3AF',
    grayDark: '#374151',
  };

  const recipientName = 'Preview User';
  const playUrl = `${baseUrl}/en/daily`;
  const unsubscribeUrl = '#preview-unsubscribe';
  const currentYear = new Date().getFullYear();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Daily Challenge Email Preview</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap');

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      background-color: ${colors.navy};
      font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .button-cta:hover {
      transform: translate(2px, 2px);
      box-shadow: 3px 3px 0px ${colors.black} !important;
    }
  </style>
</head>
<body>
  <!-- Preview Banner -->
  <div style="background: linear-gradient(90deg, ${colors.pink}, ${colors.cyan}); color: ${colors.black}; text-align: center; padding: 10px; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
    EMAIL PREVIEW — This is how recipients will see your email
  </div>

  <!-- Email Container -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${colors.navy};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="${baseUrl}" target="_blank" style="text-decoration: none;">
                <img src="${logoUrl}" alt="LexiClash" width="140" style="display: block; max-width: 140px; height: auto;" />
              </a>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(180deg, ${colors.navyCard} 0%, ${colors.navyLight} 100%); border: 4px solid ${colors.black}; border-radius: 20px; box-shadow: 8px 8px 0px ${colors.black}; overflow: hidden;">

                <!-- Decorative Header Bar -->
                <tr>
                  <td style="background: linear-gradient(90deg, ${colors.lime} 0%, ${colors.cyan} 50%, ${colors.pink} 100%); height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>

                <!-- Card Content -->
                <tr>
                  <td style="padding: 32px 28px 36px;">

                    <!-- Live Badge & Puzzle Number -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="background-color: ${colors.pink}; padding: 6px 12px; border-radius: 4px 0 0 4px; border: 2px solid ${colors.black}; border-right: none;">
                                <span style="color: ${colors.white}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">● LIVE</span>
                              </td>
                              <td style="background-color: ${colors.lime}; padding: 6px 16px; border-radius: 0 4px 4px 0; border: 2px solid ${colors.black};">
                                <span style="color: ${colors.black}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">PUZZLE #${puzzleNumber}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Greeting -->
                    <h1 style="color: ${colors.white}; font-size: 32px; margin: 0 0 8px 0; font-weight: 700; text-align: center; line-height: 1.2;">
                      Hey ${recipientName}! 👋
                    </h1>

                    <!-- Tagline -->
                    <p style="color: ${colors.grayLight}; font-size: 18px; line-height: 1.5; margin: 0 0 28px 0; text-align: center; font-weight: 500;">
                      Your daily word challenge is ready.<br/>
                      <span style="color: ${colors.cyan}; font-weight: 600;">Same grid for everyone. Can you top the board?</span>
                    </p>

                    <!-- Feature Cards -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                      <tr>
                        <td width="33%" align="center" style="padding: 0 4px;">
                          <div style="background: rgba(191, 255, 0, 0.08); border: 2px solid ${colors.lime}; border-radius: 12px; padding: 16px 8px;">
                            <div style="width: 40px; height: 40px; background: ${colors.lime}; border-radius: 10px; border: 2px solid ${colors.black}; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; box-shadow: 2px 2px 0 ${colors.black};">
                              <span style="font-size: 20px; line-height: 1;">🎯</span>
                            </div>
                            <div style="color: ${colors.lime}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Same Grid</div>
                            <div style="color: ${colors.grayLight}; font-size: 11px; margin-top: 4px;">Fair for all</div>
                          </div>
                        </td>
                        <td width="33%" align="center" style="padding: 0 4px;">
                          <div style="background: rgba(255, 20, 147, 0.08); border: 2px solid ${colors.pink}; border-radius: 12px; padding: 16px 8px;">
                            <div style="width: 40px; height: 40px; background: ${colors.pink}; border-radius: 10px; border: 2px solid ${colors.black}; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; box-shadow: 2px 2px 0 ${colors.black};">
                              <span style="font-size: 20px; line-height: 1;">⚡</span>
                            </div>
                            <div style="color: ${colors.pink}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">One Shot</div>
                            <div style="color: ${colors.grayLight}; font-size: 11px; margin-top: 4px;">No retries</div>
                          </div>
                        </td>
                        <td width="33%" align="center" style="padding: 0 4px;">
                          <div style="background: rgba(0, 255, 255, 0.08); border: 2px solid ${colors.cyan}; border-radius: 12px; padding: 16px 8px;">
                            <div style="width: 40px; height: 40px; background: ${colors.cyan}; border-radius: 10px; border: 2px solid ${colors.black}; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; box-shadow: 2px 2px 0 ${colors.black};">
                              <span style="font-size: 20px; line-height: 1;">🏆</span>
                            </div>
                            <div style="color: ${colors.cyan}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Compete</div>
                            <div style="color: ${colors.grayLight}; font-size: 11px; margin-top: 4px;">Leaderboard</div>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="${playUrl}" target="_blank" class="button-cta" style="display: inline-block; background: linear-gradient(180deg, ${colors.lime} 0%, ${colors.limeMuted} 100%); color: ${colors.black}; font-size: 18px; font-weight: 700; text-decoration: none; padding: 16px 48px; border: 3px solid ${colors.black}; border-radius: 12px; box-shadow: 5px 5px 0px ${colors.black}; text-transform: uppercase; letter-spacing: 2px;">
                            ▶ &nbsp;PLAY NOW
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Streak Reminder -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                      <tr>
                        <td>
                          <div style="background: linear-gradient(90deg, rgba(255, 107, 53, 0.12) 0%, rgba(255, 107, 53, 0.04) 100%); border: 2px solid rgba(255, 107, 53, 0.3); border-left: 4px solid ${colors.orange}; border-radius: 8px; padding: 14px 16px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="32" valign="middle">
                                  <span style="font-size: 22px;">🔥</span>
                                </td>
                                <td valign="middle">
                                  <span style="color: ${colors.orange}; font-size: 14px; font-weight: 600; line-height: 1.4;">
                                    Don't break your streak! Play today to keep it alive.
                                  </span>
                                </td>
                              </tr>
                            </table>
                          </div>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px;">
              <!-- Social Proof -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <span style="color: ${colors.grayLight}; font-size: 13px; font-weight: 500;">
                      Join thousands of word hunters playing daily 🌍
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="border-top: 1px solid ${colors.grayDark};">&nbsp;</td>
                </tr>
              </table>

              <!-- Footer Links -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="color: ${colors.gray}; font-size: 12px; margin: 0 0 12px 0; line-height: 1.6;">
                      You're receiving this because you subscribed to daily challenges.
                    </p>
                    <p style="color: ${colors.gray}; font-size: 12px; margin: 0; line-height: 1.6;">
                      <a href="${unsubscribeUrl}" target="_blank" style="color: ${colors.grayLight}; text-decoration: underline;">Unsubscribe</a>
                      <span style="color: ${colors.grayDark};">&nbsp;&nbsp;•&nbsp;&nbsp;</span>
                      <a href="${baseUrl}" target="_blank" style="color: ${colors.grayLight}; text-decoration: underline;">Visit LexiClash</a>
                      <span style="color: ${colors.grayDark};">&nbsp;&nbsp;•&nbsp;&nbsp;</span>
                      <a href="${baseUrl}/en/privacy" target="_blank" style="color: ${colors.grayLight}; text-decoration: underline;">Privacy</a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Logo Footer -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <span style="color: ${colors.grayDark}; font-size: 11px;">© ${currentYear} LexiClash. Made with 💚 for word lovers.</span>
                  </td>
                </tr>
              </table>
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
