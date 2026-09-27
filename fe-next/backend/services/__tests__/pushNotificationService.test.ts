/**
 * Push Notification Service Tests
 *
 * Tests for gift notification action URLs to ensure they navigate
 * to valid routes instead of 404 pages.
 */

// Valid routes that exist in the app (under [locale]/)
const VALID_APP_ROUTES = [
  '/',
  '/profile',
  '/daily',
  '/multiplayer',
  '/singleplayer',
  '/adventure',
  '/about',
  '/leaderboard',
  '/friends',
  '/settings',
];

// Route that does NOT exist - '/gifts' is NOT a valid route
const INVALID_ROUTES = ['/gifts'];

describe('pushNotificationService', () => {
  describe('projectId resolution (FCM send path)', () => {
    it('sendToToken must resolve projectId from GOOGLE_CREDENTIALS_JSON when FCM_PROJECT_ID is unset', () => {
      // GIVEN: Source of pushNotificationService
      const fs = require('fs');
      const path = require('path');
      const serviceFilePath = path.join(__dirname, '..', 'pushNotificationService.ts');
      const serviceContent = fs.readFileSync(serviceFilePath, 'utf-8');

      // WHEN: We inspect the sendToToken function body
      const sendFnMatch = serviceContent.match(
        /async function sendToToken\([\s\S]*?\n\}\n/
      );
      expect(sendFnMatch).not.toBeNull();
      const sendBody = sendFnMatch![0];

      // THEN: sendToToken must NOT read FCM_PROJECT_ID directly without fallback.
      // Either it receives projectId as a parameter, or it calls a shared resolver.
      // The raw `process.env.FCM_PROJECT_ID` read with no GOOGLE_CREDENTIALS_JSON
      // fallback is the bug — assert it's gone.
      const rawEnvRead = /const\s+projectId\s*=\s*process\.env\.FCM_PROJECT_ID\s*;/;
      expect(sendBody).not.toMatch(rawEnvRead);
    });
  });

  describe('push_error observability', () => {
    it('sendToUsers must persist real FCM error body in push_error, not a count string', () => {
      const fs = require('fs');
      const path = require('path');
      const serviceFilePath = path.join(__dirname, '..', 'pushNotificationService.ts');
      const serviceContent = fs.readFileSync(serviceFilePath, 'utf-8');

      // Find the UPDATE payload on user_notifications
      const updateBlock = serviceContent.match(
        /\.from\(['"]user_notifications['"]\)\s*\.update\(\{[\s\S]*?push_error:[\s\S]*?\}\)/
      );
      expect(updateBlock).not.toBeNull();
      const body = updateBlock![0];

      // The old bug: literal "tokens failed" count string — must be gone.
      expect(body).not.toMatch(/\$\{result\.failed\}\s*tokens\s*failed/);

      // Must serialize result.errors so real FCM error text is diagnosable in DB.
      expect(body).toMatch(/result\.errors/);
    });
  });

  describe('gift notification action URL', () => {
    it('should use a valid action_url that does not lead to 404', async () => {
      // GIVEN: We read the pushNotificationService source
      const fs = require('fs');
      const path = require('path');
      const serviceFilePath = path.join(__dirname, '..', 'pushNotificationService.ts');
      const serviceContent = fs.readFileSync(serviceFilePath, 'utf-8');

      // WHEN: We look for the gift notification actionUrl
      // The pattern we're looking for is: actionUrl: '/some-path'
      const actionUrlMatch = serviceContent.match(/actionUrl:\s*['"]([^'"]+)['"]/g);

      expect(actionUrlMatch).not.toBeNull();
      expect(actionUrlMatch!.length).toBeGreaterThan(0);

      // Extract the actual URL values
      const actionUrls = actionUrlMatch!.map((match: string) => {
        const urlMatch = match.match(/['"]([^'"]+)['"]/);
        return urlMatch ? urlMatch[1] : null;
      }).filter(Boolean);

      // THEN: Each action URL should be a valid route
      for (const url of actionUrls) {
        // The URL should NOT be '/gifts' (which leads to 404)
        expect(INVALID_ROUTES).not.toContain(url);

        // The URL should be one of the valid routes
        expect(VALID_APP_ROUTES).toContain(url);
      }
    });

    it('gift notification should navigate to home page where gift modal auto-shows', async () => {
      // GIVEN: We read the pushNotificationService source
      const fs = require('fs');
      const path = require('path');
      const serviceFilePath = path.join(__dirname, '..', 'pushNotificationService.ts');
      const serviceContent = fs.readFileSync(serviceFilePath, 'utf-8');

      // WHEN: We look at the sendGiftNotifications function
      // Find the section where gift notification is created
      const giftNotificationSection = serviceContent.match(
        /const notification:\s*NotificationPayload\s*=\s*\{[\s\S]*?actionUrl:\s*['"]([^'"]+)['"]/
      );

      expect(giftNotificationSection).not.toBeNull();

      const giftActionUrl = giftNotificationSection![1];

      // THEN: Gift notifications should navigate to '/' (home page)
      // because the gift modal auto-shows in the Header on any page with Header
      // and '/' is guaranteed to have the Header
      expect(giftActionUrl).toBe('/');
    });
  });
});
