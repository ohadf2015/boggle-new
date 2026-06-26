export interface ComboCodexSupabase {
  from(table: string): {
    select(columns: string): {
      eq(col: string, val: string): {
        single(): Promise<{ data: { discovered_combos: string[] } | null; error: unknown }>;
      };
    };
    upsert(
      row: Record<string, unknown>,
      opts: { onConflict: string },
    ): Promise<{ error: unknown }>;
  };
}

interface HandlerResult {
  status: number;
  data: Record<string, unknown>;
}

export function mergeDiscoveredCombos(
  existing: string[],
  incoming: string[],
): string[] {
  return [...new Set([...existing, ...incoming])];
}

export async function handleGetComboCodex(
  userId: string,
  supabase: ComboCodexSupabase,
): Promise<HandlerResult> {
  try {
    const { data, error } = await supabase
      .from('blast_combo_codex')
      .select('discovered_combos')
      .eq('user_id', userId)
      .single();

    if (error) {
      return {
        status: 200,
        data: { discoveredCombos: [] },
      };
    }

    return {
      status: 200,
      data: { discoveredCombos: data?.discovered_combos ?? [] },
    };
  } catch (err) {
    console.error('[COMBO CODEX API] GET error:', err);
    return { status: 500, data: { error: 'Internal server error' } };
  }
}

export async function handlePostComboCodex(
  userId: string,
  body: Record<string, unknown>,
  supabase: ComboCodexSupabase,
): Promise<HandlerResult> {
  if (!Array.isArray(body.discoveredCombos)) {
    return {
      status: 400,
      data: { error: 'discoveredCombos must be an array' },
    };
  }

  const incoming = body.discoveredCombos as string[];

  try {
    const { data: existing } = await supabase
      .from('blast_combo_codex')
      .select('discovered_combos')
      .eq('user_id', userId)
      .single();

    const existingCombos = existing?.discovered_combos ?? [];
    const merged = mergeDiscoveredCombos(existingCombos, incoming);

    const { error: upsertError } = await supabase
      .from('blast_combo_codex')
      .upsert(
        {
          user_id: userId,
          discovered_combos: merged,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (upsertError) {
      console.error('[COMBO CODEX API] Upsert error:', upsertError);
      return { status: 500, data: { error: 'Failed to save combo codex' } };
    }

    return { status: 200, data: { discoveredCombos: merged } };
  } catch (err) {
    console.error('[COMBO CODEX API] POST error:', err);
    return { status: 500, data: { error: 'Internal server error' } };
  }
}
