/**
 * GET /api/avatar/png/:playerId
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
 * Failure mode: any render/db error → 404 (never 500), so push delivery and
 * AvatarLite's onError fallback both degrade to no image.
 */
import express, { type Request, type Response, type Router } from 'express';
import type { CustomAvatarConfig } from '../../shared/types/customAvatar';
import { getSupabase } from '../modules/supabaseServer';
import logger from '../utils/logger';

const router: Router = express.Router();

const PNG_SIZE = 256;
const CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';
const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

router.get('/:playerId', async (req: Request<{ playerId: string }>, res: Response): Promise<void> => {
  const { playerId } = req.params;
  if (!UUID_RE.test(playerId)) {
    res.status(400).type('text/plain').send('invalid playerId');
    return;
  }

  try {
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

    const config = data?.avatar_config as CustomAvatarConfig | null | undefined;
    if (!config || typeof config !== 'object') {
      res.status(404).type('text/plain').send('no avatar_config');
      return;
    }

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

    res.status(200).set({ 'Content-Type': 'image/png', 'Cache-Control': CACHE_CONTROL }).send(png);
  } catch (err) {
    logger.error('AVATAR_PNG', `render failed for ${playerId}: ${(err as Error).message}`);
    res.status(404).type('text/plain').send('render error');
  }
});

export default router;
