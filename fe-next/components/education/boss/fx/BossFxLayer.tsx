'use client';

import { memo, useEffect, useRef, useState, type RefObject } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';
import { BossProjectiles } from '../BossProjectiles';
import { bossImpactBus } from './bossFxBus';
import type { BossFxScene } from '@/lib/pixiFx/bossFxScene';
import styles from '../boss.module.css';

const WORD = 'absolute left-0 top-0 whitespace-nowrap font-neo-display font-black uppercase tracking-wide text-neo-white [text-shadow:0.15cqw_0.15cqw_0_#000] will-change-transform';
const DMG = 'pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-center font-neo-display font-black leading-none [text-shadow:0.2cqw_0.2cqw_0_#000]';

/** Feeds store changes into one Pixi scene; reduced motion or a failed WebGL init falls back to the DOM projectiles. */
export const BossFxLayer = memo(function BossFxLayer({ reducedMotion, shakeRef }: { reducedMotion: boolean; shakeRef: RefObject<HTMLElement | null> }) {
  const { t } = useLanguage();
  const labelsRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const hits = useClassroomBossStore((s) => (failed || reducedMotion ? s.view?.lastHits : undefined));
  const critText = t('classroomBoss.crit');
  const exposedText = t('classroomBoss.exposedTag');

  useEffect(() => {
    if (reducedMotion || failed) return undefined;
    const layer = labelsRef.current;
    const shakeEl = shakeRef.current;
    if (!layer) return undefined;
    let cancelled = false;
    let detach: (() => void) | null = null;
    let unsub: (() => void) | null = null;

    void (async () => {
      try {
        const [E, P, { BossFxScene }, { attachFxLayer }] = await Promise.all([
          import('@/lib/gameEngine'),
          import('@/lib/gameEngine/presets/particles'),
          import('@/lib/pixiFx/bossFxScene'),
          import('@/lib/pixiFx/fxLayers'),
        ]);
        if (cancelled) return;
        detach = attachFxLayer((ctx) => {
          const scene = new BossFxScene(
            ctx, E, P,
            {
              layer,
              wordClass: `${WORD} text-[2.4cqw]`,
              critWordClass: `${WORD} text-[2.9cqw] !text-neo-pink`,
              dmgClass: `${DMG} text-[2.6cqw] text-neo-white ${styles.pop}`,
              critDmgClass: `${DMG} text-[3.6cqw] text-neo-pink ${styles.pop}`,
              critText,
              exposedText,
            },
            () => layer.getBoundingClientRect(),
            (x, y) => {
              if (shakeEl) shakeEl.style.transform = x || y ? `translate3d(${x}px, ${y}px, 0)` : '';
            },
            (crit) => bossImpactBus.emit({ crit }),
          );
          unsub = wire(scene);
          return scene;
        }, () => {
          if (!cancelled) setFailed(true);
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
      detach?.();
      if (shakeEl) shakeEl.style.transform = '';
    };
  }, [reducedMotion, failed, shakeRef, critText, exposedText]);

  if (reducedMotion || failed) return <BossProjectiles hits={hits ?? []} />;
  return <div ref={labelsRef} className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden="true" />;
});

/** Store → scene, outside React render: the 1 Hz broadcast never re-renders the canvas tree. */
function wire(scene: BossFxScene): () => void {
  let seen = 0;
  let prev: ClassroomBossView | null = null;
  let prevAttack = 0;
  const apply = (view: ClassroomBossView | null, attack: ReturnType<typeof useClassroomBossStore.getState>['attack']) => {
    if (!view) {
      prev = null;
      seen = 0;
      return;
    }
    scene.setPhase(view.phase);
    const fresh = view.lastHits.filter((h) => h.id > seen).reverse();
    if (prev === null) seen = Math.max(0, ...view.lastHits.map((h) => h.id));
    else for (const h of fresh) {
      seen = Math.max(seen, h.id);
      scene.hit({ word: h.word, dmg: h.dmg, crit: h.crit, exposed: !!h.exposed, slot: h.id });
    }
    if ((view.telegraph?.kind ?? null) !== (prev?.telegraph?.kind ?? null)) scene.telegraph(view.telegraph?.kind ?? null);
    if (!!view.exposed !== !!prev?.exposed) scene.exposed(!!view.exposed);
    if (prev && view.staggers > prev.staggers) scene.stagger();
    if (attack && attack.id !== prevAttack) {
      prevAttack = attack.id;
      if (prev) scene.attack(attack.kind, attack.blocked);
    }
    if (view.status === 'defeated' && prev?.status !== 'defeated') scene.defeat();
    prev = view;
  };
  const s0 = useClassroomBossStore.getState();
  prevAttack = s0.attack?.id ?? 0;
  apply(s0.view, s0.attack);
  return useClassroomBossStore.subscribe((s) => apply(s.view, s.attack));
}
