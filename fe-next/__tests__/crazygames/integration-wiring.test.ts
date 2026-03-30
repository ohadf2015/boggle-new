/**
 * CrazyGames Integration Wiring Tests
 *
 * Verifies that CrazyGames hooks are actually imported and used
 * in the components that should call them. These are static analysis
 * tests — they read source files and check for expected imports/calls.
 *
 * This catches regressions where hooks get accidentally removed from components.
 */
import fs from 'fs';
import path from 'path';

const FE_ROOT = path.resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(FE_ROOT, relativePath), 'utf-8');
}

describe('CrazyGames Integration Wiring', () => {
  describe('Midgame ads wired in all results screens', () => {
    const resultsScreens = [
      'components/views/ResultsPage.tsx',
      'components/singleplayer/SinglePlayerResults.tsx',
      'components/daily/DailyChallengeResults.tsx',
      // BlastResults.tsx was removed during blast mode rebuild
    ];

    resultsScreens.forEach((screenPath) => {
      it(`${screenPath} imports useCrazyGamesAds`, () => {
        const source = readSource(screenPath);
        expect(source).toContain("useCrazyGamesAds");
      });

      it(`${screenPath} calls requestMidgameAd`, () => {
        const source = readSource(screenPath);
        expect(source).toContain('requestMidgameAd');
      });
    });
  });

  describe('Lifecycle hook wired in game screens', () => {
    const gameScreens = [
      'components/game/InGameScreen.tsx',
      'components/adventure/AdventureGame.tsx',
      'components/daily/DailyChallengeGame.tsx',
      'components/views/ResultsPage.tsx',
    ];

    gameScreens.forEach((screenPath) => {
      it(`${screenPath} imports useCrazyGamesLifecycle`, () => {
        const source = readSource(screenPath);
        expect(source).toContain('useCrazyGamesLifecycle');
      });
    });
  });

  describe('Invite button wired in multiplayer flow', () => {
    it('MultiplayerFlow imports useCrazyGamesInvite', () => {
      const source = readSource('components/multiplayer/MultiplayerFlow.tsx');
      expect(source).toContain('useCrazyGamesInvite');
    });

    it('MultiplayerFlow calls showInviteButton (via cgShowInvite)', () => {
      const source = readSource('components/multiplayer/MultiplayerFlow.tsx');
      expect(source).toContain('cgShowInvite');
    });
  });

  describe('OAuth hiding on CrazyGames platform', () => {
    it('OAuthButtonGroup checks CrazyGames platform', () => {
      const source = readSource('components/auth/shared/OAuthButtonGroup.tsx');
      expect(source).toMatch(/isOnCrazyGamesPlatform|useCrazyGames|CrazyGamesSDK/);
    });

    it('AuthButton handles CrazyGames auth', () => {
      const source = readSource('components/auth/AuthButton.tsx');
      expect(source).toMatch(/useCrazyGamesAuth|CrazyGames/);
    });
  });

  describe('Chat disable wired', () => {
    it('RoomChat imports useCrazyGamesChatDisabled', () => {
      const source = readSource('components/RoomChat.tsx');
      expect(source).toContain('useCrazyGamesChatDisabled');
    });
  });

  describe('Scroll prevention uses hook (not inline)', () => {
    it('CrazyGamesSDK imports useCrazyGamesScrollPrevention', () => {
      const source = readSource('components/CrazyGamesSDK.tsx');
      expect(source).toContain("import { useCrazyGamesScrollPrevention }");
    });

    it('CrazyGamesSDK does NOT contain inline preventScroll function', () => {
      const source = readSource('components/CrazyGamesSDK.tsx');
      // Ensure the duplicate code was removed — no inline preventScroll definition
      expect(source).not.toMatch(/const preventScroll = \(event: WheelEvent\)/);
    });
  });

  describe('SDK loading lifecycle is deferred', () => {
    it('sdkGameLoadingStop uses requestIdleCallback with timeout fallback', () => {
      const source = readSource('components/CrazyGamesScriptServer.tsx');
      expect(source).toContain('requestIdleCallback');
      expect(source).toContain('sdkGameLoadingStop');
    });
  });

  describe('Token verification endpoint exists', () => {
    it('CrazyGames token verification route exists', () => {
      const routePath = path.join(FE_ROOT, 'app/api/auth/verify-crazygames/route.ts');
      expect(fs.existsSync(routePath)).toBe(true);
    });

    it('Xsolla webhook verification route exists', () => {
      const routePath = path.join(FE_ROOT, 'app/api/purchases/verify-xsolla/route.ts');
      expect(fs.existsSync(routePath)).toBe(true);
    });
  });

  describe('Invite params persisted to sessionStorage', () => {
    it('CrazyGamesSDK persists invite params', () => {
      const source = readSource('components/CrazyGamesSDK.tsx');
      expect(source).toContain('cg_invite_params');
      expect(source).toContain('sessionStorage');
    });

    it('getInviteParam falls back to sessionStorage', () => {
      const source = readSource('components/CrazyGamesSDK.tsx');
      // The getInviteParam callback should check sessionStorage as fallback
      const getInviteParamSection = source.split('const getInviteParam')[1]?.split('const getInviteParams')[0] ?? '';
      expect(getInviteParamSection).toContain('sessionStorage');
    });
  });
});
