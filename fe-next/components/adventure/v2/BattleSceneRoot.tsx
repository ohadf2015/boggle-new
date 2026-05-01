'use client';

import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { gsap } from 'gsap';
import { useCombatStore } from '@/lib/adventure/v2/state/runStore';
import { BattleScene } from './scenes/BattleScene';
import { calculateDamage } from '@/lib/adventure/v2/engine/damageCalculator';
import { isValidWord, isComposableFromTiles } from '@/lib/adventure/v2/engine/wordValidator';
import { playSfx } from '@/lib/adventure/v2/audio/soundBus';
import type { TileId, Tile } from '@/lib/adventure/v2/types';

interface Props {
  onVictory: () => void;
  onDefeat: () => void;
}

export function BattleSceneRoot({ onVictory, onDefeat }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const sceneRef = useRef<BattleScene | null>(null);
  const enemyTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    return () => {
      mounted = false;
      unsub();
      if (enemyTurnTimerRef.current) clearTimeout(enemyTurnTimerRef.current);
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
      const tiles: Tile[] = s.fsmState.tilesUsed.map((id) => s.tiles[id]).filter(Boolean) as Tile[];
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

  function handleSubmit() {
    const s = useCombatStore.getState();
    if (s.fsmState.type !== 'player_compose') return;

    const word = s.fsmState.word;
    const tiles: Tile[] = s.fsmState.tilesUsed.map((id) => s.tiles[id]).filter(Boolean) as Tile[];

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

      // Screen shake
      const stage = appRef.current?.stage;
      if (stage) {
        const ox = stage.position.x;
        gsap.fromTo(
          stage.position,
          { x: ox - 8 },
          { x: ox, duration: 0.04, repeat: 5, yoyo: true, ease: 'power1.inOut' },
        );
      }

      s.applyEnemyDamage(dmg);
      const post = useCombatStore.getState();
      const nextEnemyDamage = post.enemyAtk;
      s.dispatch({
        type: 'PLAYER_RESOLVED',
        enemyHpRemaining: post.enemyHp,
        nextEnemyDamage,
      });
      s.refillUsedTiles(usedIds);

      if (useCombatStore.getState().fsmState.type !== 'enemy_telegraph') return;

      enemyTurnTimerRef.current = setTimeout(() => {
        if (useCombatStore.getState().fsmState.type !== 'enemy_telegraph') return;
        s.dispatch({ type: 'ENEMY_TELEGRAPH_DONE' });
        s.applyHeroDamage(nextEnemyDamage);
        sceneRef.current?.actorLayer.flashHeroHurt();
        playSfx('hit_hero');
        s.dispatch({
          type: 'ENEMY_RESOLVED',
          heroHpRemaining: useCombatStore.getState().heroHp,
        });
        if (useCombatStore.getState().fsmState.type === 'tile_refresh') {
          s.dispatch({ type: 'TILE_REFRESH_DONE' });
          s.dispatch({ type: 'START_TURN' });
        }
      }, 800);
    });
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', maxWidth: '1920px', margin: '0 auto' }}
    />
  );
}
