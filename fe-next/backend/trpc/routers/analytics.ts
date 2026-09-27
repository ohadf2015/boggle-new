import { z } from 'zod';
import { router, loggedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import logger from '../../utils/logger';
import { cacheAside } from '../../cache/redisCache';

const { getSupabase, isSupabaseConfigured } = require('../../modules/supabaseServer');

export const analyticsRouter = router({
  track: loggedProcedure
    .input(z.object({
      event_type: z.string().min(1),
      session_id: z.string().optional(),
      guest_name: z.string().optional(),
      utm_source: z.string().optional(),
      utm_medium: z.string().optional(),
      utm_campaign: z.string().optional(),
      referrer: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isSupabaseConfigured()) {
        return { success: false, error: 'Analytics service not available' };
      }

      const supabase = getSupabase();
      // Only trust server-side geo middleware, never client headers
      const country_code = (ctx.req as any).geoData?.countryCode || null;

      const enrichedMetadata: Record<string, unknown> = {
        ...(input.metadata ?? {}),
        guest_name: input.guest_name || null,
        user_agent: ctx.req.headers['user-agent'] || null,
      };

      const { data, error } = await supabase
        .from('analytics_events')
        .insert({
          event_type: input.event_type,
          session_id: input.session_id || null,
          country_code,
          utm_source: input.utm_source || null,
          utm_medium: input.utm_medium || null,
          utm_campaign: input.utm_campaign || null,
          referrer: input.referrer || null,
          metadata: enrichedMetadata,
        })
        .select()
        .single();

      if (error) {
        logger.error('ANALYTICS_TRPC', `Track error: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true, event_id: data?.id };
    }),

  activePlayers: loggedProcedure
    .query(async () => {
      if (!isSupabaseConfigured()) {
        return { count: 0, error: 'Analytics service not available' };
      }

      try {
        const result = await cacheAside('analytics:activePlayers', async () => {
          const supabase = getSupabase();
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

          const { count, error } = await supabase
            .from('analytics_events')
            .select('session_id', { count: 'exact', head: true })
            .gte('created_at', fiveMinutesAgo)
            .not('session_id', 'is', null);

          if (error) {
            logger.error('ANALYTICS_TRPC', `Active players count error: ${error.message}`);
            return { count: 0, error: error.message };
          }

          const estimatedPlayers = Math.max(0, (count || 0) * 2.5);
          const roundedCount = Math.round(estimatedPlayers / 10) * 10;

          return { count: roundedCount, timestamp: new Date().toISOString() };
        }, 30);

        return result;
      } catch (error) {
        const err = error as Error;
        logger.error('ANALYTICS_TRPC', `Active players count error: ${err.message}`);
        return { count: 0, error: 'Failed to get active players count' };
      }
    }),
});
