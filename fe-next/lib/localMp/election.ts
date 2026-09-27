/**
 * Deterministic host election for local-mesh MP. After a host drops
 * (`endpointLost`), every remaining peer runs THIS over the same set of
 * connected stable player IDs and converges on the same new host — no
 * negotiation round-trip needed on a lossy link.
 *
 * Rule: lexicographically highest stable player ID. Stable IDs (not transient
 * endpoint IDs) so the choice is identical across peers.
 */
export function electHost(connectedPlayerIds: string[]): string {
  if (connectedPlayerIds.length === 0) {
    throw new Error('electHost: no connected peers to elect from');
  }
  return connectedPlayerIds.reduce((max, id) => (id > max ? id : max));
}
