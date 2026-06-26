export type BlastProgressPayload = {
  currentLevel: number;
  maxLevelCleared: number;
  coins: number;
  chestNumber: number;
  chestProgress: number;
  unlocksSeen: Record<string, unknown>;
  locale: string;
};

const MAX_CLAIM_LEVEL = 1000;

export type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
      };
    };
    insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
    update: (row: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ error: unknown }>;
    };
  };
};

export async function handleGetBlastProgress(
  userId: string,
  supabase: SupabaseLike,
  defaultLocale = 'en',
): Promise<{ data: BlastProgressPayload; status: number }> {
  try {
    const { data } = await supabase
      .from('blast_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) {
      return {
        status: 200,
        data: {
          currentLevel: 1,
          maxLevelCleared: 0,
          coins: 0,
          chestNumber: 1,
          chestProgress: 0,
          unlocksSeen: {},
          locale: defaultLocale,
        },
      };
    }

    return {
      status: 200,
      data: {
        currentLevel: (data.current_level as number) ?? 1,
        maxLevelCleared: (data.max_level_cleared as number) ?? 0,
        coins: (data.total_coins_earned_blast as number) ?? 0,
        chestNumber: (data.current_chest_number as number) ?? 1,
        chestProgress: Number(data.current_chest_progress ?? 0),
        unlocksSeen: (data.unlocks_seen as Record<string, unknown>) ?? {},
        locale: (data.locale as string) ?? defaultLocale,
      },
    };
  } catch {
    return {
      status: 500,
      data: {
        currentLevel: 1,
        maxLevelCleared: 0,
        coins: 0,
        chestNumber: 1,
        chestProgress: 0,
        unlocksSeen: {},
        locale: defaultLocale,
      },
    };
  }
}

export async function handleClaimBlastProgress(
  userId: string,
  supabase: SupabaseLike,
  claimLevel: number,
  defaultLocale = 'en',
): Promise<{ data: { currentLevel: number }; status: number }> {
  try {
    const { data } = await supabase
      .from('blast_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    const serverLevel = (data?.current_level as number) ?? (data ? 1 : 0);

    if (!Number.isInteger(claimLevel) || claimLevel < 1 || claimLevel > MAX_CLAIM_LEVEL) {
      return { status: 200, data: { currentLevel: data ? serverLevel : 1 } };
    }

    if (!data) {
      await supabase.from('blast_progress').insert({
        user_id: userId,
        current_level: claimLevel,
        locale: defaultLocale,
      });
      return { status: 200, data: { currentLevel: claimLevel } };
    }

    if (claimLevel <= serverLevel) {
      return { status: 200, data: { currentLevel: serverLevel } };
    }

    await supabase.from('blast_progress').update({ current_level: claimLevel }).eq('user_id', userId);
    return { status: 200, data: { currentLevel: claimLevel } };
  } catch {
    return { status: 500, data: { currentLevel: 1 } };
  }
}
