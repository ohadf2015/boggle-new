/**
 * BossUIManager — orchestrates all boss Phaser UI objects.
 *
 * Subscribes to boss:* bridge events and delegates to child objects:
 *  - BossHPBar: HP display with phase colors
 *  - BossAvatar: portrait with reaction tweens
 *  - BossTelegraph: attack warning overlay
 *  - BossDialogueBubble: taunt speech bubble
 *  - BossAttackEffect: camera flash, slash marks, damage numbers
 *
 * All state lives in React hooks. This manager is display-only.
 */

import type Phaser from 'phaser';
import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { BossHPBar } from './BossHPBar';
import { BossAvatar } from './BossAvatar';
import { BossTelegraph } from './BossTelegraph';
import { BossDialogueBubble } from './BossDialogueBubble';
import { BossAttackEffect } from './BossAttackEffect';

// ─── Layout constants ──────────────────────────────────────────────────────────

const HP_BAR_HEIGHT = 20;
const HP_BAR_WIDTH_RATIO = 0.6; // 60% of canvas width
const HP_BAR_Y = 30;
const AVATAR_SIZE = 48;
const DIALOGUE_OFFSET_Y = 80; // below avatar

export class BossUIManager {
  private scene: Phaser.Scene;
  private hpBar: BossHPBar | null = null;
  private avatar: BossAvatar | null = null;
  private telegraph: BossTelegraph | null = null;
  private dialogue: BossDialogueBubble | null = null;
  private unsubs: Array<() => void> = [];
  private isRTL = false;
  private reduceMotion = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  init(): void {
    this.unsubs.push(
      GameBridge.on('boss:init', (p) => this.handleInit(p)),
      GameBridge.on('boss:damage', (p) => this.handleDamage(p)),
      GameBridge.on('boss:ability:telegraph', (p) => this.handleTelegraph(p)),
      GameBridge.on('boss:ability:execute', (p) => this.handleExecute(p)),
      GameBridge.on('boss:taunt', (p) => this.handleTaunt(p)),
      GameBridge.on('boss:phase:change', (p) => this.handlePhaseChange(p)),
      GameBridge.on('boss:end', () => this.handleEnd()),
      GameBridge.on('accessibility:update', (p) => {
        this.isRTL = p.isRTL;
        this.reduceMotion = p.reduceMotion;
        this.dialogue?.setRTL(p.isRTL);
      }),
    );
  }

  destroy(): void {
    this.unsubs.forEach((unsub) => unsub());
    this.unsubs = [];
    this.destroyChildren();
  }

  // ─── Event handlers ──────────────────────────────────────────────────────────

  private handleInit(payload: {
    bossName: string;
    bossImagePath: string;
    maxHP: number;
    currentHP: number;
    phase: string;
  }): void {
    // Destroy previous children (in case of re-init)
    this.destroyChildren();

    const w = this.scene.scale.width;

    // Create HP bar (top center)
    const barWidth = Math.floor(w * HP_BAR_WIDTH_RATIO);
    const barX = (w - barWidth) / 2 + AVATAR_SIZE / 2 + 10;
    this.hpBar = new BossHPBar(this.scene, barX, HP_BAR_Y, barWidth, HP_BAR_HEIGHT);
    this.hpBar.updateHP(payload.currentHP, payload.maxHP, payload.phase);

    // Create avatar (left of HP bar)
    const avatarX = barX - AVATAR_SIZE / 2 - 10;
    this.avatar = new BossAvatar(this.scene, avatarX, HP_BAR_Y, AVATAR_SIZE);

    // Create telegraph (full canvas overlay)
    this.telegraph = new BossTelegraph(this.scene);

    // Create dialogue bubble (below avatar)
    const dialogueX = avatarX;
    const dialogueY = HP_BAR_Y + DIALOGUE_OFFSET_Y;
    this.dialogue = new BossDialogueBubble(this.scene, dialogueX, dialogueY);
    this.dialogue.setRTL(this.isRTL);
  }

  private handleDamage(payload: { currentHP: number; maxHP: number; phase: string }): void {
    this.hpBar?.updateHP(payload.currentHP, payload.maxHP, payload.phase);
    this.hpBar?.flash();
    this.avatar?.playHit();
  }

  private handleTelegraph(payload: {
    abilityId: string;
    abilityName: string;
    duration: number;
    targetTiles: number[];
  }): void {
    this.telegraph?.show(payload.abilityName, payload.duration);
  }

  private handleExecute(payload: { abilityName: string | null; damage: number }): void {
    this.telegraph?.hide();
    this.avatar?.playAttack();

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;

    BossAttackEffect.cameraFlash(this.scene, { reduceMotion: this.reduceMotion });
    BossAttackEffect.slashMarks(this.scene, cx, cy, { reduceMotion: this.reduceMotion });
    BossAttackEffect.damageNumber(this.scene, cx, cy - 30, payload.damage, { reduceMotion: this.reduceMotion });
  }

  private handleTaunt(payload: { text: string; bossName: string; visible: boolean }): void {
    if (payload.visible) {
      this.dialogue?.show(payload.bossName, payload.text);
    } else {
      this.dialogue?.hide();
    }
  }

  private handlePhaseChange(payload: { phase: string }): void {
    this.avatar?.setEnraged(payload.phase === 'enraged');
  }

  private handleEnd(): void {
    this.destroyChildren();
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  private destroyChildren(): void {
    this.hpBar?.destroy();
    this.avatar?.destroy();
    this.telegraph?.destroy();
    this.dialogue?.destroy();

    this.hpBar = null;
    this.avatar = null;
    this.telegraph = null;
    this.dialogue = null;
  }
}
