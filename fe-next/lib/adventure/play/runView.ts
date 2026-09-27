/**
 * The run as every adventure endpoint hands it back: signed token + public run
 * + the act map and the legal next moves. The map is DERIVED from the run seed
 * on both sides, so /start and /node can never disagree about it (the asymmetric
 * -paths class of bug) and it never has to be trusted from the client.
 */
import { buildRunMap, reachableFrom, type RunMap } from './runMap';
import { signRun, publicRun, type PublicRun, type RunPayload } from './runToken';

export interface RunView {
  runToken: string;
  run: PublicRun;
  map: RunMap;
  currentNode: string | null;
  reachable: string[];
}

export function runView(run: RunPayload, secret: string): RunView {
  const map = buildRunMap(run.seed, run.w);
  return {
    runToken: signRun(run, secret),
    run: publicRun(run),
    map,
    currentNode: run.node,
    reachable: reachableFrom(map, run.node),
  };
}

export const runMapOf = (run: Pick<RunPayload, 'seed' | 'w'>): RunMap => buildRunMap(run.seed, run.w);
