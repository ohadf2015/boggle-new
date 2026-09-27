/**
 * The MP 3-2-1-GO countdown. HostView / PlayerView (frozen routers) mount this
 * inside `MpCountdown`; the implementation is the ROUND piece's
 * `MpCountdownStage` — a solid navy stage that hides the board until GO.
 */
import { MpCountdownStage, __resetCountdownDupGuard, type CountdownPlayer, type MpCountdownStageProps } from './multiplayer/round/MpCountdownStage';

export type { CountdownPlayer };

/** Test-only reset to clear the dup-guard latch between test cases. */
export const __resetGoRipplesDupGuard = __resetCountdownDupGuard;

const GoRipplesAnimation = (props: MpCountdownStageProps) => <MpCountdownStage {...props} />;

export default GoRipplesAnimation;
