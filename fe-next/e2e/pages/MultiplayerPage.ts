import { type Page, type Locator, expect } from '@playwright/test';
import { submitRealWord } from '../helpers/grid-solver';

/**
 * Page Object for the multiplayer flow.
 * Covers room list, room creation, lobby, and in-game interactions.
 */
export class MultiplayerPage {
  readonly page: Page;

  // Room List
  readonly roomListView: Locator;
  readonly createRoomButton: Locator;
  readonly refreshButton: Locator;

  // Create Room Modal
  readonly createRoomModal: Locator;
  readonly roomNameInput: Locator;
  readonly hostNameInput: Locator;
  readonly languageSelector: Locator;
  readonly confirmCreateButton: Locator;

  // Join Room Modal
  readonly joinRoomModal: Locator;
  readonly joinNameInput: Locator;
  readonly confirmJoinButton: Locator;

  // Lobby
  readonly waitingStatus: Locator;
  readonly editNameButton: Locator;
  readonly nameEditInput: Locator;
  readonly nameSaveButton: Locator;
  readonly editAvatarButton: Locator;
  readonly desktopChatArea: Locator;
  readonly startGameButton: Locator;
  readonly inviteLink: Locator;
  readonly playerRoster: Locator;

  // In-Game
  readonly gameGrid: Locator;
  readonly wordInput: Locator;
  readonly submitWordButton: Locator;
  readonly leaderboard: Locator;
  readonly timerDisplay: Locator;

  // Results
  readonly resultsView: Locator;
  readonly playAgainButton: Locator;
  readonly returnToLobbyButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Room List
    this.roomListView = page.locator('[data-testid="room-list-view"]');
    this.createRoomButton = page.getByRole('button', { name: /create.*room|צור.*חדר/i });
    this.refreshButton = page.getByRole('button', { name: /refresh|רענן/i });

    // Create Room Modal
    this.createRoomModal = page.locator('[data-testid="create-room-modal"]');
    this.roomNameInput = page.locator('input[placeholder*="room"], input[name="roomName"]');
    this.hostNameInput = page.locator(
      'input[placeholder*="name"], input[placeholder*="username"], input[name="hostUsername"]'
    );
    this.languageSelector = page.locator('[data-testid="language-selector"], select[name="language"]');
    this.confirmCreateButton = page.getByRole('button', { name: /create|צור|start/i }).last();

    // Join Room Modal
    this.joinRoomModal = page.locator('[data-testid="join-room-modal"]');
    this.joinNameInput = page.locator('input[placeholder*="name"], input[name="username"]');
    this.confirmJoinButton = page.getByRole('button', { name: /join|הצטרף/i }).last();

    // Lobby
    this.waitingStatus = page.locator('[data-testid="waiting-status"]');
    this.editNameButton = page.locator('[data-testid="edit-name-button"]');
    this.nameEditInput = page.locator('[data-testid="name-edit-input"]');
    this.nameSaveButton = page.locator('[data-testid="name-save-button"]');
    this.editAvatarButton = page.locator('[data-testid="edit-avatar-button"]');
    this.desktopChatArea = page.locator('[data-testid="desktop-chat-area"]');
    this.startGameButton = page.getByRole('button', { name: /start.*game|התחל.*משחק/i });
    this.inviteLink = page.locator('[class*="invite"], [data-testid*="invite"]');
    this.playerRoster = page.locator('[class*="roster"], [class*="player-list"]');

    // In-Game
    // The board renders as `[role="grid"]` with `[role="gridcell"]` children
    // (see components/GridComponent.tsx) — no data-testid on either. Keep the
    // looser class/testid probe as a fallback for older/alternate layouts.
    this.gameGrid = page
      .locator('[role="grid"]')
      .or(page.locator('[class*="grid-container"], [data-testid*="grid"]'));
    this.wordInput = page.locator('input[type="text"][placeholder*="word"], [class*="word-input"]');
    this.submitWordButton = page.getByRole('button', { name: /submit|שלח/i });
    this.leaderboard = page.locator('[class*="leaderboard"]');
    this.timerDisplay = page.locator('[class*="timer"], [data-testid*="timer"]');

    // Results
    this.resultsView = page.locator('[class*="results"], [data-testid*="results"]');
    this.playAgainButton = page.getByRole('button', { name: /play.*again|שחק.*שוב/i });
    this.returnToLobbyButton = page.getByRole('button', { name: /lobby|return|חזור/i });
  }

  /** Navigate to multiplayer page */
  async visit(locale = 'en') {
    await this.page.goto(`/${locale}/multiplayer`);
    await this.page.waitForLoadState('networkidle');
  }

  /** Open create room modal and fill details */
  async createRoom(hostName: string, options?: { language?: string }) {
    await this.createRoomButton.click();
    await expect(this.createRoomModal.or(this.page.locator('[role="dialog"]'))).toBeVisible({
      timeout: 5_000,
    });
    // Fill host name if input visible
    const hostInput = this.hostNameInput;
    if (await hostInput.isVisible().catch(() => false)) {
      await hostInput.fill(hostName);
    }
    // Select language if provided
    if (options?.language) {
      const langSelect = this.languageSelector;
      if (await langSelect.isVisible().catch(() => false)) {
        await langSelect.selectOption(options.language);
      }
    }
    await this.confirmCreateButton.click();
  }

  /** Click on a room in the room list to join */
  async clickRoom(gameCode: string) {
    await this.page.locator(`[data-testid="room-${gameCode}"]`).click();
  }

  /** Join a room via the join modal */
  async joinRoom(playerName: string) {
    await expect(this.joinRoomModal.or(this.page.locator('[role="dialog"]'))).toBeVisible({
      timeout: 5_000,
    });
    if (await this.joinNameInput.isVisible().catch(() => false)) {
      await this.joinNameInput.fill(playerName);
    }
    await this.confirmJoinButton.click();
  }

  /** Edit name in the lobby */
  async editLobbyName(newName: string) {
    await this.editNameButton.click();
    await this.nameEditInput.fill(newName);
    await this.nameSaveButton.click();
  }

  /** Wait for the game to start (grid becomes visible) */
  async waitForGameStart() {
    await expect(this.gameGrid).toBeVisible({ timeout: 15_000 });
  }

  /** Wait for results to appear */
  async waitForResults() {
    await expect(this.resultsView).toBeVisible({ timeout: 60_000 });
  }

  /** The live found-words ladder row for a given word (components/multiplayer/desktop/WordsLadder.tsx) */
  wordLadderRow(word: string): Locator {
    return this.page.locator(`[data-testid="ladder-row-${word}"]`);
  }

  /** Read the current board, ask the solver for a real word, and submit it via a drag gesture */
  async submitRealWord(baseURL: string, language = 'en'): Promise<string> {
    return submitRealWord(this.page, baseURL, language);
  }
}
