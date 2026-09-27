/**
 * Bump whenever the avatar ART changes (components/avatar/art/*, AvatarRenderer(Ssr),
 * avatarLayerRules). The PNG route (/api/avatar/png/:id) is cached with
 * s-maxage=7d keyed on the URL, and AvatarLite's `?v=` hash only covered the
 * player's config — so a redraw never reached anyone whose config didn't
 * change. Mixing this into the hash rolls every cached face at once.
 *
 * Dependency-free on purpose: AvatarLite is first-paint-critical and must not
 * pull in customAvatar/zod or the renderer.
 */
// 2026-09-24: full art redraw (components/avatar/art) + legacy id map.
// 2026-09-24 r2: legendary parts in gold leaf, slate edge on common tokens.
export const AVATAR_RENDER_VERSION = '2026-09-24.art3';
