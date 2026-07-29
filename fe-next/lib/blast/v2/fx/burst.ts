import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { loadTexture } from './spritesheets';
import type { CellId } from '../types';

export function hexToNum(hex: string, fallback = 0xbfff00): number {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return fallback;
  const n = parseInt(clean, 16);
  return n >= 0 && n <= 0xffffff ? n : fallback;
}

function vibrateMedium(isHapticsEnabled: boolean) {
  if (!isHapticsEnabled || !navigator.vibrate) return;
  navigator.vibrate([40, 20, 40]);
}

function vibrateLight(isHapticsEnabled: boolean) {
  if (!isHapticsEnabled || !navigator.vibrate) return;
  navigator.vibrate([20, 10]);
}

function vibrateHeavy(isHapticsEnabled: boolean) {
  if (!isHapticsEnabled || !navigator.vibrate) return;
  navigator.vibrate([60, 30, 60, 30, 60]);
}

function vibrateSuccessChord(isHapticsEnabled: boolean) {
  if (!isHapticsEnabled || !navigator.vibrate) return;
  navigator.vibrate([100, 50, 50, 50]);
}

export async function playWordFoundFx(
  boardRef: React.RefObject<HTMLDivElement>,
  pixiStage: PIXI.Container,
  cells: CellId[],
  modeColor: string,
  prefersReducedMotion: boolean,
  isHapticsEnabled: boolean
) {
  vibrateMedium(isHapticsEnabled);

  const board = boardRef.current;
  if (!board) return;

  for (const id of cells) {
    const el = board.querySelector(`[data-cell-id="${id}"]`) as HTMLElement | null;
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    const x = rect.left - boardRect.left + rect.width / 2;
    const y = rect.top - boardRect.top + rect.height / 2;

    // Shatter sprite animation
    const tex = await loadTexture('shatter');
    if (tex && !prefersReducedMotion) {
      const sprite = new PIXI.Sprite(tex);
      sprite.x = x;
      sprite.y = y;
      sprite.tint = hexToNum(modeColor);
      pixiStage.addChild(sprite);

      let frameIndex = 0;
      const interval = setInterval(() => {
        frameIndex = (frameIndex + 1) % 8;
        if (frameIndex === 7) {
          clearInterval(interval);
          pixiStage.removeChild(sprite);
        }
      }, 25);
    }
  }
}

export async function playCascadeFx(
  boardRef: React.RefObject<HTMLDivElement>,
  pixiStage: PIXI.Container,
  cells: CellId[],
  modeColor: string,
  prefersReducedMotion: boolean,
  isHapticsEnabled: boolean
) {
  vibrateHeavy(isHapticsEnabled);

  const board = boardRef.current;
  if (!board) return;

  for (const id of cells) {
    const el = board.querySelector(`[data-cell-id="${id}"]`) as HTMLElement | null;
    if (!el) continue;

    const tex = await loadTexture('shatter');
    if (tex && !prefersReducedMotion) {
      const sprite = new PIXI.Sprite(tex);
      const rect = el.getBoundingClientRect();
      const boardRect = board.getBoundingClientRect();
      sprite.x = rect.left - boardRect.left + rect.width / 2;
      sprite.y = rect.top - boardRect.top + rect.height / 2;
      sprite.tint = hexToNum(modeColor);
      pixiStage.addChild(sprite);

      let frameIndex = 0;
      const interval = setInterval(() => {
        frameIndex = (frameIndex + 1) % 8;
        if (frameIndex === 7) {
          clearInterval(interval);
          pixiStage.removeChild(sprite);
        }
      }, 25);
    }
  }
}

export async function playBonusFx(
  boardRef: React.RefObject<HTMLDivElement>,
  pixiStage: PIXI.Container,
  cells: CellId[],
  modeColor: string,
  prefersReducedMotion: boolean,
  isHapticsEnabled: boolean
) {
  vibrateLight(isHapticsEnabled);

  const board = boardRef.current;
  if (!board) return;

  for (const id of cells) {
    const el = board.querySelector(`[data-cell-id="${id}"]`) as HTMLElement | null;
    if (!el || prefersReducedMotion) continue;

    gsap.to(el, {
      scale: 1.05,
      duration: 0.25,
      yoyo: true,
      repeat: 1,
    });
  }
}

export async function playDoubleBonusFx(
  boardRef: React.RefObject<HTMLDivElement>,
  pixiStage: PIXI.Container,
  cells: CellId[],
  modeColor: string,
  prefersReducedMotion: boolean,
  isHapticsEnabled: boolean
) {
  vibrateMedium(isHapticsEnabled);

  const board = boardRef.current;
  if (!board) return;

  for (const id of cells) {
    const el = board.querySelector(`[data-cell-id="${id}"]`) as HTMLElement | null;
    if (!el || prefersReducedMotion) continue;

    gsap.to(el, {
      scale: 1.1,
      duration: 0.4,
      yoyo: true,
      repeat: 1,
    });
  }
}

export async function playGemCollectedFx(
  boardRef: React.RefObject<HTMLDivElement>,
  pixiStage: PIXI.Container,
  cells: CellId[],
  modeColor: string,
  prefersReducedMotion: boolean,
  isHapticsEnabled: boolean
) {
  vibrateHeavy(isHapticsEnabled);

  const board = boardRef.current;
  if (!board) return;

  for (const id of cells) {
    const el = board.querySelector(`[data-cell-id="${id}"]`) as HTMLElement | null;
    if (!el || prefersReducedMotion) continue;

    gsap.to(el, {
      scale: 1.15,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
    });
  }
}

export async function playFrozenThawFx(
  boardRef: React.RefObject<HTMLDivElement>,
  pixiStage: PIXI.Container,
  cells: CellId[],
  modeColor: string,
  prefersReducedMotion: boolean,
  isHapticsEnabled: boolean
) {
  vibrateMedium(isHapticsEnabled);

  const board = boardRef.current;
  if (!board) return;

  for (const id of cells) {
    const el = board.querySelector(`[data-cell-id="${id}"]`) as HTMLElement | null;
    if (!el) continue;

    const tex = await loadTexture('frozen_crack');
    if (tex) {
      const sprite = new PIXI.Sprite(tex);
      const rect = el.getBoundingClientRect();
      const boardRect = board.getBoundingClientRect();
      sprite.x = rect.left - boardRect.left + rect.width / 2;
      sprite.y = rect.top - boardRect.top + rect.height / 2;
      pixiStage.addChild(sprite);

      let frameIndex = 0;
      const interval = setInterval(() => {
        frameIndex = (frameIndex + 1) % 6;
        if (frameIndex === 5) {
          clearInterval(interval);
          pixiStage.removeChild(sprite);
        }
      }, 116);
    }
  }
}

export async function playInvalidFx(
  boardRef: React.RefObject<HTMLDivElement>,
  boardEl: Element,
  modeColor: string,
  prefersReducedMotion: boolean,
  isHapticsEnabled: boolean
) {
  vibrateLight(isHapticsEnabled);

  if (!prefersReducedMotion && boardEl instanceof HTMLElement) {
    const path = boardEl.querySelector('svg [data-testid="selection-path"]');
    if (path instanceof SVGElement) {
      gsap.to(path, {
        fill: '#FF3366',
        duration: 0.2,
        yoyo: true,
        repeat: 1,
      });
    }
  }
}

export async function playGravityCollapseFx(staggerMs: number) {
  // No Pixi FX — Plan 2 handles layout animation
}

export async function playLateralSlideFx(
  from: CellId,
  to: CellId,
  prefersReducedMotion: boolean,
  isHapticsEnabled: boolean
) {
  vibrateLight(isHapticsEnabled);
}

export async function playLevelCompleteFx(
  boardRef: React.RefObject<HTMLDivElement>,
  pixiStage: PIXI.Container,
  modeColor: string,
  prefersReducedMotion: boolean,
  isHapticsEnabled: boolean
) {
  vibrateSuccessChord(isHapticsEnabled);

  if (prefersReducedMotion) return;

  const boardRect = boardRef.current?.getBoundingClientRect();
  if (!boardRect) return;

  const centerX = boardRect.width / 2;
  const centerY = boardRect.height / 2;

  for (let i = 0; i < 25; i++) {
    const particle = new PIXI.Graphics();
    particle.beginFill(Math.random() > 0.5 ? 0xffff00 : 0xffffff);
    particle.drawCircle(0, 0, 2);
    particle.endFill();
    particle.x = centerX;
    particle.y = centerY;
    pixiStage.addChild(particle);

    gsap.to(particle, {
      y: centerY + Math.random() * 200,
      x: centerX + (Math.random() - 0.5) * 200,
      alpha: 0,
      duration: 2.5,
      onComplete: () => {
        pixiStage.removeChild(particle);
      },
    });
  }
}

export async function playChestProgressFillFx(
  pixiStage: PIXI.Container,
  modeColor: string,
  isHapticsEnabled: boolean
) {
  vibrateLight(isHapticsEnabled);
}

export async function playChestUnlockFx(
  pixiStage: PIXI.Container,
  modeColor: string,
  isHapticsEnabled: boolean
) {
  vibrateMedium(isHapticsEnabled);
}

export async function playChestOpenFx(
  pixiStage: PIXI.Container,
  tier: 'wood' | 'silver' | 'gold' | 'legendary',
  modeColor: string,
  prefersReducedMotion: boolean,
  isHapticsEnabled: boolean
) {
  vibrateHeavy(isHapticsEnabled);

  const chestMap = {
    wood: 'chest_wood',
    silver: 'chest_silver',
    gold: 'chest_gold',
    legendary: 'chest_legendary',
  } as const;

  const tex = await loadTexture(chestMap[tier]);
  if (tex) {
    const sprite = new PIXI.Sprite(tex);
    sprite.x = 200;
    sprite.y = 300;
    pixiStage.addChild(sprite);

    const duration =
      tier === 'legendary' ? 6 : tier === 'gold' || tier === 'silver' ? 4.5 : 3.5;
    gsap.to(sprite, {
      scale: 1.2,
      duration,
      onComplete: () => {
        pixiStage.removeChild(sprite);
      },
    });
  }
}

export async function playAvatarPartDropFx(
  pixiStage: PIXI.Container,
  isHapticsEnabled: boolean
) {
  vibrateHeavy(isHapticsEnabled);
}

export async function playHintShuffleFx(
  boardRef: React.RefObject<HTMLDivElement>,
  pixiStage: PIXI.Container,
  prefersReducedMotion: boolean,
  isHapticsEnabled: boolean
) {
  vibrateLight(isHapticsEnabled);

  const board = boardRef.current;
  if (!board) return;

  const cells = board.querySelectorAll('[data-cell-id]');
  cells.forEach((cell, idx) => {
    if (cell instanceof HTMLElement && !prefersReducedMotion) {
      gsap.to(cell, {
        opacity: 0.5,
        duration: 0.8,
        delay: idx * 0.03,
        yoyo: true,
        repeat: 1,
      });
    }
  });
}

export async function playHintRevealLetterFx(
  boardRef: React.RefObject<HTMLDivElement>,
  cell: CellId,
  prefersReducedMotion: boolean,
  isHapticsEnabled: boolean
) {
  vibrateMedium(isHapticsEnabled);

  const board = boardRef.current;
  if (!board || prefersReducedMotion) return;

  const el = board.querySelector(`[data-cell-id="${cell}"]`);
  if (el instanceof HTMLElement) {
    gsap.to(el, {
      boxShadow: '0 0 20px gold',
      duration: 2,
    });
  }
}

export async function playHintRevealWordFx(
  boardRef: React.RefObject<HTMLDivElement>,
  cells: CellId[],
  modeColor: string,
  prefersReducedMotion: boolean,
  isHapticsEnabled: boolean
) {
  vibrateMedium(isHapticsEnabled);

  const board = boardRef.current;
  if (!board || prefersReducedMotion) return;

  for (const cell of cells) {
    const el = board.querySelector(`[data-cell-id="${cell}"]`);
    if (el instanceof HTMLElement) {
      gsap.to(el, {
        scale: 1.1,
        duration: 1.8,
        delay: cells.indexOf(cell) * 0.1,
      });
    }
  }
}
