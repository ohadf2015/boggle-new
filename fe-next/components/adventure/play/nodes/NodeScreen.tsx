'use client';

/**
 * Router for the map's non-play nodes: one screen per kind, over the level.
 *
 * It owns the run snapshot taken when the node was ENTERED, so every screen can
 * print what the node really did (server run before → server run after) instead
 * of the promise its label made. The snapshot resets when the run moves.
 *
 * Contract for the caller (the act map / the level screen):
 *  - render while `nodeState` is set, INCLUDING the `loading` phase a choice
 *    puts the run into, and pass `busy` — otherwise every purchase unmounts the
 *    shop mid-flight;
 *  - `onChoice(index)` = the hook's `nodeChoice`; only send indices the screen
 *    left enabled (the endpoint answers a refusal with a 400 = the error screen);
 *  - `onLeave` = back to the act map.
 */
import { useEffect, useRef } from 'react';
import type { NodeState } from '@/lib/adventure/play/nodeResolve';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import { trackGrowthEvent } from '@/utils/growthTracking';
import EventScreen from './EventScreen';
import RestScreen from './RestScreen';
import ShopScreen from './ShopScreen';
import TreasureScreen from './TreasureScreen';

interface Props {
  state: NodeState;
  run: PublicRun;
  world: number;
  /** A choice is in flight: the screen stays put, its buttons go dead. */
  busy: boolean;
  onChoice: (index: number) => void;
  onLeave: () => void;
}

export default function NodeScreen({ state, run, world, busy, onChoice, onLeave }: Props) {
  const entered = useRef<{ node: string | null; run: PublicRun }>({ node: run.node, run });
  const firedRef = useRef(false);

  if (entered.current.node !== run.node) {
    entered.current = { node: run.node, run };
    firedRef.current = false;  // Reset the fired flag when node changes
  }
  const before = entered.current.run;

  // Fire adventure_node_entered once per node, with ref guard against rerenders
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    trackGrowthEvent('adventure_node_entered', {
      world,
      nodeKind: state.kind,
    });
  }, [state.kind, world]);

  if (state.kind === 'shop') {
    return <ShopScreen items={state.items} bought={state.bought} run={run} world={world} busy={busy} onBuy={onChoice} onLeave={onLeave} />;
  }
  if (state.kind === 'rest') {
    return <RestScreen heal={state.heal} taken={state.taken} run={run} before={before} world={world} busy={busy} onChoose={onChoice} onLeave={onLeave} />;
  }
  if (state.kind === 'treasure') {
    return <TreasureScreen offers={state.offers} taken={state.taken} relic={state.relic} gold={state.gold}
      run={run} world={world} busy={busy} onPick={onChoice} onLeave={onLeave} />;
  }
  return <EventScreen id={state.id} choices={state.choices} taken={state.taken} run={run} before={before} world={world} busy={busy} onChoose={onChoice} onLeave={onLeave} />;
}
