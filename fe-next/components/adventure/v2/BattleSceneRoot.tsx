'use client';

import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { gsap } from 'gsap';
import { useCombatStore } from '@/lib/adventure/v2/state/runStore';
import { BattleScene } from './scenes/BattleScene';
import { calculateDamage } from '@/lib/adventure/v2/engine/damageCalculator';
import { isValidWord, isComposableFromTiles } from '@/lib/adventure/v2/engine/wordValidator';
import { playSfx } from '@/lib/adventure/v2/audio/soundBus';
import { attachKeyboardBridge, findTileByLetter } from './input/RuneSlateInput';
import { BotLoop } from './BotLoop';
import type { Locale, TileId, Tile } from '@/lib/adventure/v2/types';
import type { AbilityId } from '@/lib/adventure/v2/abilities';

interface Props {
  onVictory: () => void;
  onDefeat: () => void;
  locale?: Locale;
}

export function BattleSceneRoot({ onVictory, onDefeat, locale = 'en' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const sceneRef = useRef<BattleScene | null>(null);
  const botLoopRef = useRef<BotLoop | null>(null);

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
        (tileId, letter) => handleTileTap(tileId, letter),
        () => handleSubmit(),
        () => handleUndo(),
        (abilityId) => handleAbilityPressed(abilityId),
      );
      scene.abilityBar.setLocale(locale);
      app.stage.addChild(scene);
      sceneRef.current = scene;

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
        if (tileId !== null) handleTileTap(tileId, letter);
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

    if (s.fsmState.type === 'player_compose') {
      s.fsmState.tilesUsed.forEach((id) => scene.runeSlate.markUsed(id));
      const tiles: Tile[] = s.fsmState.tilesUsed
        .map((id) => s.tiles[id])
        .filter(Boolean) as Tile[];
      const word = s.fsmState.word;
      const valid =
        word.length >= 3 && isValidWord(word, s.locale) && isComposableFromTiles(word, tiles);
      const dmg = valid ? calculateDamage(tiles, { critRoll: 1, runeBonusSum: 0, heroAtk: 1 }) : 0;
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

  function handleTileTap(tileId: TileId, letter: string) {
    const s = useCombatStore.getState();
    if (s.fsmState.type !== 'player_compose') return;
    const tile = s.tiles[tileId];
    if (!tile) return;

    // BLOCK ability mode: tap a bot-targeted tile to deny without consuming
    if (s.pendingAbility === 'block') {
      if (tile.targetedBy === 'bot') {
        botLoopRef.current?.invalidate();
        s.consumePendingAbility();
        playSfx('word_invalid'); // re-using existing sfx as a deny "thwack"
        return;
      }
      // Tapping a non-targeted tile while pending block → cancel pending mode
      s.setPendingAbility(null);
      return;
    }

    if (tile.claimedBy) return;

    // If bot was eyeing this tile, the player just stole it → invalidate bot's plan
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
    const dmg = calculateDamage(tiles, { critRoll: 1, runeBonusSum: 0, heroAtk: 1 });
    s.dispatch({ type: 'SUBMIT' });
    s.dispatch({ type: 'RESOLVE', damage: dmg });

    const usedIds = tiles.map((t) => t.id);
    const impact = sceneRef.current!.actorLayer.getEnemyImpactPoint();

    sceneRef.current!.castingGlyph.fireProjectile(impact.x, impact.y, () => {
      sceneRef.current?.actorLayer.flashEnemyHurt();
      playSfx('hit_enemy');
      screenShake(8, 5);

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
    store.applyHeroDamage(dmg);
    sceneRef.current?.actorLayer.flashHeroHurt();
    playSfx('hit_hero');
    screenShake(10, 6);

    // Defeat check
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
