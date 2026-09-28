/**
 * GET /api/avatar/png/:playerId
 * GET /api/avatar/png/:playerId/v/:version
 *
 * Renders a player's `avatar_config` to a PNG — the face behind AvatarLite
 * (landing leaderboard, header) and FCM/Web Push imageUrl.
 *
 * Lives on Express, NOT app/api (historically Next's `react-server`
 * condition broke the old parts' client Contexts). Since the 2026-09 redraw
 * AvatarRendererSsr IS the browser compositor (components/avatar/art/
 * AvatarArt) — context-free and CSS-free — so the PNG is the same drawing
 * players see, frozen on its static hero frame.
 *
 * No stored config (or a non-uuid guest seed) → the same seeded face
 * `Avatar` draws (getSeededAvatarConfig(hashString(id))), so AvatarLite and
 * the full renderer never show two different people. Non-uuid seeds never
 * hit the DB; the global /api rate limiter covers the render cost.
 *
 * Versioned urls (`/v/:version` or `?v=`) get a long cache: the bust token
 * changes whenever the player edits their look (or art redraws), so the URL
 * itself is the invalidation key. Unversioned urls get a short cache so an
 * art redraw reaches old push-notification links within minutes.
 *
 * Failure mode: any render/db error → 404 (never 500), so push delivery and
 * AvatarLite's onError fallback both degrade to no image.
 */
import express, { type Request, type Response, type Router } from 'express';
import { getSeededAvatarConfig, hashString, type CustomAvatarConfig } from '../../shared/types/customAvatar';
import { getSupabase } from '../modules/supabaseServer';
import logger from '../utils/logger';

const router: Router = express.Router();

const PNG_SIZE = 256;
const CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';
const UNVERSIONED_CACHE_CONTROL = 'public, max-age=300';
const SEED_RE = /^[A-Za-z0-9_-]{1,64}$/;
const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const BUST_RE = /^[a-f0-9]{1,16}$/i;

type PngParams = { playerId: string; version?: string };

async function renderAvatarPng(req: Request<PngParams>, res: Response): Promise<void> {
  const { playerId, version } = req.params;
  if (!SEED_RE.test(playerId)) {
    res.status(400).type('text/plain').send('invalid playerId');
    return;
  }
  if (version !== undefined && !BUST_RE.test(version)) {
    res.status(400).type('text/plain').send('invalid version');
    return;
  }

  try {
    let config: CustomAvatarConfig | null | undefined;
    if (UUID_RE.test(playerId)) {
      const supabase = getSupabase();
      if (!supabase) {
        res.status(404).type('text/plain').send('db unavailable');
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('avatar_config')
        .eq('id', playerId)
        .maybeSingle();
      config = data?.avatar_config as CustomAvatarConfig | null | undefined;
    }
    if (!config || typeof config !== 'object') config = getSeededAvatarConfig(hashString(playerId));

    // Lazy: keeps React SSR + the art library + sharp off server boot.
    const [{ createElement }, { renderToStaticMarkup }, { default: AvatarRendererSsr }, { default: sharp }] =
      await Promise.all([
        import('react'),
        import('react-dom/server'),
        import('../../components/avatar/AvatarRendererSsr'),
        import('sharp'),
      ]);

    const svg = renderToStaticMarkup(createElement(AvatarRendererSsr, { config, size: PNG_SIZE, circular: true }));
    const png = await sharp(Buffer.from(svg)).resize(PNG_SIZE, PNG_SIZE).png({ compressionLevel: 9 }).toBuffer();

    const versioned = Boolean(version) || Boolean(req.query.v);
    res.status(200).set({
      'Content-Type': 'image/png',
      'Cache-Control': versioned ? CACHE_CONTROL : UNVERSIONED_CACHE_CONTROL,
    }).send(png);
  } catch (err) {
    logger.error('AVATAR_PNG', `render failed for ${playerId}: ${(err as Error).message}`);
    res.status(404).type('text/plain').send('render error');
  }
}

// Versioned path first so `/v/:version` is not swallowed as a playerId.
router.get('/:playerId/v/:version', renderAvatarPng);
router.get('/:playerId', renderAvatarPng);

export default router;
