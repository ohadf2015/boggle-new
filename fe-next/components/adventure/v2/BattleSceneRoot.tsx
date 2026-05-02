'use client';

import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { gsap } from 'gsap';
import { useCombatStore } from '@/lib/adventure/v2/state/runStore';
import { BattleScene } from './scenes/BattleScene';
import { calculateDamage } from '@/lib/adventure/v2/engine/damageCalculator';
import { calculatePlayerDamage } from '@/lib/adventure/v2/engine/applyDamageBonuses';
import { isValidWord, isComposableFromTiles } from '@/lib/adventure/v2/engine/wordValidator';
import { playSfx } from '@/lib/adventure/v2/audio/soundBus';
import { attachKeyboardBridge, findTileByLetter } from './input/RuneSlateInput';
import { BotLoop } from './BotLoop';
import { areAdjacent } from '@/lib/adventure/v2/engine/adjacency';
import { ENEMY_DEFS } from '@/lib/adventure/v2/enemies';
import type { Locale, TileId, Tile } from '@/lib/adventure/v2/types';
import type { AbilityId } from '@/lib/adventure/v2/abilities';

const SLATE_COLS = 4;

const VOWELS_EN = new Set(['A', 'E', 'I', 'O', 'U']);
const VOWELS_HE = new Set(['א', 'ה', 'ו', 'י']);

function previewBonus(
  tiles: Tile[],
  word: string,
  store: ReturnType<typeof useCombatStore.getState>,
): number {
  let bonus = 0;
  const upgrades = new Set(store.equippedUpgrades);
  if (upgrades.has('vowel_surge')) {
    const set = store.locale === 'he' ? VOWELS_HE : VOWELS_EN;
    const count = tiles.filter((t) => set.has(t.letter.toUpperCase())).length;
    if (count >= 3) bonus += 0.5;
  }
  if (upgrades.has('long_word_rage') && word.length >= 6) bonus += 0.5;
  return bonus;
}

interface Props {
  onVictory: () => void;
  onDefeat: () => void;
  locale?: Locale;
  enemyId?: string;
}

export function BattleSceneRoot({
  onVictory,
  onDefeat,
  locale = 'en',
  enemyId = 'apprentice',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const sceneRef = useRef<BattleScene | null>(null);
  const botLoopRef = useRef<BotLoop | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const app = new Application();
      await app.init({
        width: 1920,
        height: 1080,
        background: 0x1a1a2e,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      if (!mounted || !containerRef.current) {
        app.destroy(true);
        return;
      }
      containerRef.current.appendChild(app.canvas);
      app.canvas.style.width = '100%';
      app.canvas.style.height = 'auto';
      app.canvas.style.maxWidth = '1920px';
      app.canvas.style.display = 'block';
      appRef.current = app;

      const scene = new BattleScene(
        (tileId, letter) => handleDragStart(tileId, letter),
        () => handleSubmit(),
        () => handleUndo(),
        (abilityId) => handleAbilityPressed(abilityId),
      );
      scene.abilityBar.setLocale(locale);
      scene.buildSidebar.setLocale(locale);
      const enemy = ENEMY_DEFS[enemyId] ?? ENEMY_DEFS.apprentice;
      scene.actorLayer.setEnemyName(locale === 'he' ? enemy.nameHe : enemy.name, enemy.isBoss);
      scene.actorLayer.setEnemyWeakness(
        locale === 'he' ? enemy.weaknessLabelHe : enemy.weaknessLabel,
      );
      scene.actorLayer.setHeroName(locale === 'he' ? 'גיבור · רמה 1' : 'HERO · Lv. 1');
      // Apply enemy stats to store
      useCombatStore.setState({
        enemyHp: enemy.hp,
        enemyMaxHp: enemy.hp,
        enemyAtk: enemy.atk,
      });
      // Drag extension: pointer-over a tile while drag is active
      scene.runeSlate.onTileEnter = (tileId, letter) => handleDragEnter(tileId, letter);
      app.stage.addChild(scene);
      sceneRef.current = scene;

      // Global pointerup → finalize drag (submit if path valid)
      const onWindowUp = () => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          handleSubmit();
        }
      };
      window.addEventListener('pointerup', onWindowUp);
      window.addEventListener('pointercancel', onWindowUp);
      // Stash for cleanup
      (app as Application & { _cleanup?: () => void })._cleanup = () => {
        window.removeEventListener('pointerup', onWindowUp);
        window.removeEventListener('pointercancel', onWindowUp);
      };

      useCombatStore.getState().startNewBattle(locale);
      useCombatStore.getState().dispatch({ type: 'START_TURN' });
      syncSceneFromStore();

      // Start the bot's continuous reveal loop
      const loop = new BotLoop(
        (word, dmg, tileIds) => handleBotWordCompleted(word, dmg, tileIds),
        (tileId) => handleBotTargetReveal(tileId),
      );
      botLoopRef.current = loop;
      loop.start();
    })();

    const unsub = useCombatStore.subscribe(() => syncSceneFromStore());

    const bridge = attachKeyboardBridge({
      onLetterKey: (letter) => {
        const s = useCombatStore.getState();
        if (s.fsmState.type !== 'player_compose') return;
        const tileId = findTileByLetter(s.tiles, s.fsmState.tilesUsed, letter);
        if (tileId === null) return;
        // Keyboard input must respect adjacency (parity with drag)
        const path = s.fsmState.tilesUsed;
        if (path.length > 0) {
          const last = path[path.length - 1];
          if (!areAdjacent(last, tileId, SLATE_COLS)) return;
        }
        s.dispatch({ type: 'TILE_TAP', tileId, letter });
        playSfx('tile_tap');
      },
      onBackspace: () => handleUndo(),
      onEnter: () => handleSubmit(),
    });

    return () => {
      mounted = false;
      unsub();
      bridge.destroy();
      botLoopRef.current?.stop();
      botLoopRef.current = null;
      const cleanup = (appRef.current as (Application & { _cleanup?: () => void }) | null)?._cleanup;
      cleanup?.();
      sceneRef.current?.destroy({ children: true });
      appRef.current?.destroy(true, { children: true, texture: true });
      sceneRef.current = null;
      appRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncSceneFromStore() {
    const s = useCombatStore.getState();
    const scene = sceneRef.current;
    if (!scene) return;

    scene.actorLayer.updateHp(s.heroHp, s.heroMaxHp, s.enemyHp, s.enemyMaxHp);
    scene.runeSlate.setTiles(s.tiles);
    scene.abilityBar.setAbilities(s.abilities, s.pendingAbility);
    scene.buildSidebar.setEquipped(s.equippedUpgrades);

    if (s.fsmState.type === 'player_compose') {
      s.fsmState.tilesUsed.forEach((id) => scene.runeSlate.markUsed(id));
      const tiles: Tile[] = s.fsmState.tilesUsed
        .map((id) => s.tiles[id])
        .filter(Boolean) as Tile[];
      const word = s.fsmState.word;
      const valid =
        word.length >= 3 && isValidWord(word, s.locale) && isComposableFromTiles(word, tiles);
      // Preview damage WITHOUT critical roll (deterministic preview); critical resolves on submit
      const dmg = valid
        ? calculateDamage(tiles, { critRoll: 1, runeBonusSum: previewBonus(tiles, word, s), heroAtk: 1 })
        : 0;
      scene.castingGlyph.showWord(word, dmg, word.length < 3 ? true : valid);
    }

    if (s.fsmState.type === 'victory') {
      botLoopRef.current?.stop();
      playSfx('victory');
      onVictory();
    }
    if (s.fsmState.type === 'defeat') {
      botLoopRef.current?.stop();
      playSfx('defeat');
      onDefeat();
    }
  }

  function handleDragStart(tileId: TileId, letter: string) {
    const s = useCombatStore.getState();
    if (s.fsmState.type !== 'player_compose') return;
    const tile = s.tiles[tileId];
    if (!tile) return;

    // BLOCK ability: tap bot-targeted tile to deny w/o consuming
    if (s.pendingAbility === 'block') {
      if (tile.targetedBy === 'bot') {
        botLoopRef.current?.invalidate();
        s.consumePendingAbility();
        playSfx('word_invalid');
        return;
      }
      s.setPendingAbility(null);
      return;
    }

    // STEAL ability: tap bot-CLAIMED tile to free it + add to compose
    if (s.pendingAbility === 'steal') {
      if (tile.claimedBy === 'bot') {
        useCombatStore.setState({
          tiles: s.tiles.map((t) =>
            t.id === tileId ? { ...t, claimedBy: null, claimTurnsRemaining: 0 } : t,
          ),
        });
        s.consumePendingAbility();
        s.dispatch({ type: 'TILE_TAP', tileId, letter: tile.letter });
        playSfx('tile_tap');
      }
      s.setPendingAbility(null);
      return;
    }

    if (tile.claimedBy) return;

    // Start a fresh drag: clear any prior compose, then add this tile
    if (s.fsmState.tilesUsed.length > 0) {
      // Reset prior path by undoing each tile in reverse
      for (let i = s.fsmState.tilesUsed.length - 1; i >= 0; i--) {
        s.dispatch({ type: 'TILE_UNDO', tileId: s.fsmState.tilesUsed[i] });
      }
    }

    if (tile.targetedBy === 'bot') {
      botLoopRef.current?.invalidate();
    }

    isDraggingRef.current = true;
    s.dispatch({ type: 'TILE_TAP', tileId, letter });
    playSfx('tile_tap');
  }

  function handleDragEnter(tileId: TileId, letter: string) {
    if (!isDraggingRef.current) return;
    const s = useCombatStore.getState();
    if (s.fsmState.type !== 'player_compose') return;
    const tile = s.tiles[tileId];
    if (!tile || tile.claimedBy) return;

    const path = s.fsmState.tilesUsed;
    if (path.length === 0) return;

    // Drag-back-undo: hovering over the second-to-last tile = pop the last
    if (path.length >= 2 && path[path.length - 2] === tileId) {
      const last = path[path.length - 1];
      s.dispatch({ type: 'TILE_UNDO', tileId: last });
      playSfx('tile_undo');
      return;
    }

    // Already in path → ignore
    if (path.includes(tileId)) return;

    // Adjacency check against last tile
    const last = path[path.length - 1];
    if (!areAdjacent(last, tileId, SLATE_COLS)) return;

    if (tile.targetedBy === 'bot') {
      botLoopRef.current?.invalidate();
    }
    s.dispatch({ type: 'TILE_TAP', tileId, letter });
    playSfx('tile_tap');
  }

  function handleAbilityPressed(id: AbilityId) {
    const s = useCombatStore.getState();
    if (s.fsmState.type !== 'player_compose') return;
    const ability = s.abilities.find((a) => a.id === id);
    if (!ability || ability.cooldownRemaining > 0) return;
    // Toggle: pressing the same ability twice cancels pending mode
    if (s.pendingAbility === id) {
      s.setPendingAbility(null);
      return;
    }
    s.setPendingAbility(id);
  }

  function handleUndo() {
    const s = useCombatStore.getState();
    if (s.fsmState.type !== 'player_compose') return;
    const lastId = s.fsmState.tilesUsed[s.fsmState.tilesUsed.length - 1];
    if (lastId === undefined) return;
    s.dispatch({ type: 'TILE_UNDO', tileId: lastId });
    sceneRef.current?.runeSlate.unmarkUsed(lastId);
    playSfx('tile_undo');
  }

  function screenShake(amplitude = 8, repeats = 5) {
    const stage = appRef.current?.stage;
    if (!stage) return;
    const ox = stage.position.x;
    gsap.fromTo(
      stage.position,
      { x: ox - amplitude },
      { x: ox, duration: 0.04, repeat: repeats, yoyo: true, ease: 'power1.inOut' },
    );
  }

  function handleSubmit() {
    const s = useCombatStore.getState();
    if (s.fsmState.type !== 'player_compose') return;

    const word = s.fsmState.word;
    const tiles: Tile[] = s.fsmState.tilesUsed
      .map((id) => s.tiles[id])
      .filter(Boolean) as Tile[];

    if (word.length < 3 || !isValidWord(word, s.locale) || !isComposableFromTiles(word, tiles)) {
      playSfx('word_invalid');
      sceneRef.current?.castingGlyph.shakeInvalid();
      return;
    }

    playSfx('word_submit');
    const enemy = ENEMY_DEFS[enemyId] ?? ENEMY_DEFS.apprentice;
    const damageResult = calculatePlayerDamage({
      tiles,
      word,
      upgrades: s.equippedUpgrades,
      locale: s.locale,
      enemyWeakness: enemy.weakness,
    });
    const dmg = damageResult.damage;
    const isWeak = damageResult.weak;
    s.dispatch({ type: 'SUBMIT' });
    s.dispatch({ type: 'RESOLVE', damage: dmg });

    // HEAL ON WORD passive
    if (s.equippedUpgrades.includes('heal_on_word')) {
      s.applyHeroHeal(1);
    }

    const usedIds = tiles.map((t) => t.id);
    const impact = sceneRef.current!.actorLayer.getEnemyImpactPoint();

    sceneRef.current!.castingGlyph.fireProjectile(impact.x, impact.y, () => {
      const isCrit = damageResult.crit;
      sceneRef.current?.actorLayer.flashEnemyHurt(dmg, isCrit, isWeak);
      playSfx('hit_enemy');
      screenShake(isCrit ? 14 : 8, isCrit ? 8 : 5);

      s.applyEnemyDamage(dmg);
      const post = useCombatStore.getState();

      // Victory check
      if (post.enemyHp <= 0) {
        s.dispatch({ type: 'PLAYER_RESOLVED', enemyHpRemaining: 0 });
        return;
      }

      // Refill used tiles + auto-rescue if deadlocked + tick ability cooldowns
      s.refillUsedTiles(usedIds);
      s.tickClaimDecay();
      s.rescueIfStuck();
      s.tickAbilityCooldowns();

      // Reset FSM to next compose phase
      s.dispatch({ type: 'PLAYER_RESOLVED', enemyHpRemaining: post.enemyHp });
      // PLAYER_RESOLVED would normally enter bot_compose; we no longer use that —
      // force back to player_compose for the next turn.
      useCombatStore.setState({
        fsmState: { type: 'player_compose', word: '', tilesUsed: [] },
      });
    });
  }

  function handleBotTargetReveal(_tileId: TileId) {
    // Visual feedback handled by RuneSlateLayer.setTiles via store subscribe.
    // Optional: small SFX cue
    // playSfx('tile_undo'); // re-using existing sfx as a soft tick
  }

  function handleBotWordCompleted(word: string, dmg: number, tileIds: TileId[]) {
    const scene = sceneRef.current;
    if (!scene) return;

    scene.runeSlate.flashBotClaim(tileIds);
    scene.botBanner.show(word, dmg, 700, () => {});

    const store = useCombatStore.getState();

    // WORD SHIELD passive — first incoming damage post-cast is blocked
    const blocked = store.consumeWordShield();
    if (blocked) {
      sceneRef.current?.actorLayer.flashHeroHurt(0);
      playSfx('word_invalid');
      screenShake(4, 3);
      return;
    }

    store.applyHeroDamage(dmg);
    sceneRef.current?.actorLayer.flashHeroHurt(dmg);
    playSfx('hit_hero');
    screenShake(10, 6);

    const after = useCombatStore.getState();
    if (after.heroHp <= 0) {
      store.setDefeat();
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', maxWidth: '1920px', margin: '0 auto' }}
    />
  );
}
