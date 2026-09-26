/**
 * Dev-only: the TanStack Query devtools launcher (QueryProvider, NODE_ENV
 * development) is a fixed 48px button at the bottom-end corner — exactly
 * where the lobby's footer CTA ends (START BATTLE / READY UP, mirrored in
 * RTL). Hide it while a lobby screen is mounted; the rule unmounts with the
 * lobby so in-round screens keep the tool. Production renders nothing — the
 * launcher never ships there.
 */
export function LobbyDevChromeGuard() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <style data-lobby-dev-guard="">{'.tsqd-open-btn-container{display:none!important}'}</style>;
}
