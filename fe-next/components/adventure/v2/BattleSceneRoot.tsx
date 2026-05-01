'use client';

import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { gsap } from 'gsap';
import { useCombatStore } from '@/lib/adventure/v2/state/runStore';
import { BattleScene } from './scenes/BattleScene';
import { calculateDamage } from '@/lib/adventure/v2/engine/damageCalculator';
import { isValidWord, isComposableFromTiles } from '@/lib/adventure/v2/engine/wordValidator';
import { pickBotWord } from '@/lib/adventure/v2/engine/botWordPicker';
import { playSfx } from '@/lib/adventure/v2/audio/soundBus';
import { attachKeyboardBridge, findTileByLetter } from './input/RuneSlateInput';
import { botComposeToResolve } from '@/lib/adventure/v2/fsm';
import type { TileId, Tile } from '@/lib/adventure/v2/types';

interface Props {
  onVictory: () => void;
  onDefeat: () => void;
}

export function BattleSceneRoot({ onVictory, onDefeat }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const sceneRef = useRef<BattleScene | null>(null);

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
      );
      app.stage.addChild(scene);
      sceneRef.current = scene;

      useCombatStore.getState().startNewBattle();
      useCombatStore.getState().dispatch({ type: 'START_TURN' });
      syncSceneFromStore();
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

    if (s.fsmState.type === 'player_compose') {
      s.fsmState.tilesUsed.forEach((id) => scene.runeSlate.markUsed(id));
      const tiles: Tile[] = s.fsmState.tilesUsed
        .map((id) => s.tiles[id])
        .filter(Boolean) as Tile[];
      const word = s.fsmState.word;
      const valid =
        word.length >= 3 && isValidWord(word) && isComposableFromTiles(word, tiles);
      const dmg = valid ? calculateDamage(tiles, { critRoll: 1, runeBonusSum: 0, heroAtk: 1 }) : 0;
      scene.castingGlyph.showWord(word, dmg, word.length < 3 ? true : valid);
    }

    if (s.fsmState.type === 'victory') {
      playSfx('victory');
      onVictory();
    }
    if (s.fsmState.type === 'defeat') {
      playSfx('defeat');
      onDefeat();
    }
  }

  function handleTileTap(tileId: TileId, letter: string) {
    const s = useCombatStore.getState();
    if (s.fsmState.type !== 'player_compose') return;
    const tile = s.tiles[tileId];
    if (!tile || tile.claimedBy) return;
    s.dispatch({ type: 'TILE_TAP', tileId, letter });
    playSfx('tile_tap');
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

    if (word.length < 3 || !isValidWord(word) || !isComposableFromTiles(word, tiles)) {
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
      s.dispatch({ type: 'PLAYER_RESOLVED', enemyHpRemaining: post.enemyHp });
      s.refillUsedTiles(usedIds);

      if (useCombatStore.getState().fsmState.type !== 'bot_compose') return;

      // BOT TURN
      runBotTurn();
    });
  }

  function runBotTurn() {
    const s = useCombatStore.getState();
    const scene = sceneRef.current;
    if (!scene) return;

    // 65% chance bot picks a word; 35% pass to give breathing room
    const botActs = Math.random() < 0.65;
    const pick = botActs ? pickBotWord(s.tiles) : null;

    const finalize = () => {
      // Decay claims first, THEN refresh tiles, THEN rescue if stuck
      s.tickClaimDecay();
      s.rescueIfStuck();
      if (useCombatStore.getState().fsmState.type === 'tile_refresh') {
        s.dispatch({ type: 'TILE_REFRESH_DONE' });
      }
      s.dispatch({ type: 'START_TURN' });
    };

    if (!pick) {
      // Bot passes — short banner, no damage
      scene.botBanner.show('', 0, 450, () => {
        s.dispatch({ type: 'BOT_RESOLVED', heroHpRemaining: s.heroHp });
        finalize();
      });
      return;
    }

    const botTiles: Tile[] = pick.tileIds.map((id) => s.tiles[id]).filter(Boolean) as Tile[];
    const botDamage = calculateDamage(botTiles, { critRoll: 1, runeBonusSum: 0, heroAtk: 0.7 });

    s.dispatch({ type: 'BOT_PICKED', word: pick.word, tilesClaimed: pick.tileIds, damage: botDamage });
    s.claimTilesForBot(pick.tileIds, 1);
    scene.runeSlate.flashBotClaim(pick.tileIds);

    scene.botBanner.show(pick.word, botDamage, 600, () => {
      useCombatStore.setState({ fsmState: botComposeToResolve(useCombatStore.getState().fsmState) });

      s.applyHeroDamage(botDamage);
      sceneRef.current?.actorLayer.flashHeroHurt();
      playSfx('hit_hero');
      screenShake(10, 6);

      const after = useCombatStore.getState();
      s.dispatch({ type: 'BOT_RESOLVED', heroHpRemaining: after.heroHp });
      finalize();
    });
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', maxWidth: '1920px', margin: '0 auto' }}
    />
  );
}
