/**
 * useWordClubs Hook
 *
 * Fetches the current user's word clubs and their member leaderboards.
 * Provides functions to create, join (via invite code), and leave clubs.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type {
  WordClub,
  WordClubMember,
  CreateClubPayload,
} from '@/shared/types/growth';

export interface UseWordClubsReturn {
  myClubs: WordClub[];
  currentClub: WordClub | null;
  members: WordClubMember[];
  loading: boolean;
  createClub: (payload: CreateClubPayload) => Promise<WordClub | null>;
  joinClub: (inviteCode: string) => Promise<boolean>;
  leaveClub: (clubId: string) => Promise<boolean>;
  selectClub: (clubId: string) => void;
}

function parseClub(row: Record<string, unknown>): WordClub {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    ownerId: row.owner_id as string,
    maxMembers: (row.max_members as number) ?? 50,
    inviteCode: row.invite_code as string,
    isPublic: (row.is_public as boolean) ?? false,
    weeklyXpTotal: (row.weekly_xp_total as number) ?? 0,
    memberCount: (row.member_count as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

function parseMember(row: Record<string, unknown>): WordClubMember {
  return {
    id: row.id as string,
    clubId: row.club_id as string,
    userId: row.user_id as string,
    displayName: row.display_name as string | undefined,
    avatarConfig: row.avatar_config as string | undefined,
    weeklyXp: (row.weekly_xp as number) ?? 0,
    totalXp: (row.total_xp as number) ?? 0,
    gamesThisWeek: (row.games_this_week as number) ?? 0,
    bestWordThisWeek: row.best_word_this_week as string | undefined,
    role: (row.role as WordClubMember['role']) ?? 'member',
    joinedAt: row.joined_at as string,
  };
}

export function useWordClubs(): UseWordClubsReturn {
  const { user } = useAuth();
  const [myClubs, setMyClubs] = useState<WordClub[]>([]);
  const [currentClub, setCurrentClub] = useState<WordClub | null>(null);
  const [members, setMembers] = useState<WordClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchClubs = useCallback(async () => {
    if (!user?.id || !supabase) {
      setLoading(false);
      return;
    }

    try {
      // Get club IDs the user belongs to
      const { data: memberRows, error: memberError } = await supabase
        .from('word_club_members')
        .select('club_id')
        .eq('user_id', user.id);

      if (memberError || !memberRows || memberRows.length === 0) {
        setMyClubs([]);
        setLoading(false);
        return;
      }

      const clubIds = memberRows.map((r) => (r as Record<string, unknown>).club_id as string);

      const { data: clubRows, error: clubError } = await supabase
        .from('word_clubs')
        .select('*')
        .in('id', clubIds);

      if (clubError || !clubRows) {
        setMyClubs([]);
      } else {
        const clubs = clubRows.map((r) => parseClub(r as Record<string, unknown>));
        setMyClubs(clubs);
        if (clubs.length > 0 && !currentClub) {
          setCurrentClub(clubs[0]);
        }
      }
    } catch {
      setMyClubs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentClub]);

  // Fetch members when currentClub changes
  const fetchMembers = useCallback(async () => {
    if (!currentClub?.id || !supabase) {
      setMembers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('word_club_members')
        .select('*')
        .eq('club_id', currentClub.id)
        .order('weekly_xp', { ascending: false });

      if (error || !data) {
        setMembers([]);
      } else {
        setMembers(data.map((r) => parseMember(r as Record<string, unknown>)));
      }
    } catch {
      setMembers([]);
    }
  }, [currentClub?.id]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchClubs();
  }, [fetchClubs]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const selectClub = useCallback(
    (clubId: string) => {
      const club = myClubs.find((c) => c.id === clubId) ?? null;
      setCurrentClub(club);
    },
    [myClubs],
  );

  const createClub = useCallback(
    async (payload: CreateClubPayload): Promise<WordClub | null> => {
      if (!user?.id || !supabase) return null;

      try {
        // Generate a simple invite code
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const { data, error } = await supabase
          .from('word_clubs')
          .insert({
            name: payload.name,
            description: payload.description ?? '',
            owner_id: user.id,
            max_members: payload.maxMembers ?? 50,
            invite_code: inviteCode,
            is_public: payload.isPublic ?? false,
            weekly_xp_total: 0,
            member_count: 1,
          })
          .select('*')
          .single();

        if (error || !data) return null;

        const club = parseClub(data as Record<string, unknown>);

        // Add creator as owner member
        await supabase.from('word_club_members').insert({
          club_id: club.id,
          user_id: user.id,
          role: 'owner',
          weekly_xp: 0,
          total_xp: 0,
          games_this_week: 0,
        });

        setMyClubs((prev) => [club, ...prev]);
        setCurrentClub(club);
        return club;
      } catch {
        return null;
      }
    },
    [user?.id],
  );

  const joinClub = useCallback(
    async (inviteCode: string): Promise<boolean> => {
      if (!user?.id || !supabase) return false;

      try {
        const { data: clubData, error: clubError } = await supabase
          .from('word_clubs')
          .select('*')
          .eq('invite_code', inviteCode.toUpperCase())
          .single();

        if (clubError || !clubData) return false;

        const club = parseClub(clubData as Record<string, unknown>);

        // Check if already a member
        if (myClubs.some((c) => c.id === club.id)) return false;

        const { error: joinError } = await supabase.from('word_club_members').insert({
          club_id: club.id,
          user_id: user.id,
          role: 'member',
          weekly_xp: 0,
          total_xp: 0,
          games_this_week: 0,
        });

        if (joinError) return false;

        setMyClubs((prev) => [...prev, club]);
        return true;
      } catch {
        return false;
      }
    },
    [user?.id, myClubs],
  );

  const leaveClub = useCallback(
    async (clubId: string): Promise<boolean> => {
      if (!user?.id || !supabase) return false;

      try {
        const { error } = await supabase
          .from('word_club_members')
          .delete()
          .eq('club_id', clubId)
          .eq('user_id', user.id);

        if (error) return false;

        setMyClubs((prev) => prev.filter((c) => c.id !== clubId));
        if (currentClub?.id === clubId) {
          setCurrentClub(null);
          setMembers([]);
        }
        return true;
      } catch {
        return false;
      }
    },
    [user?.id, currentClub?.id],
  );

  return {
    myClubs,
    currentClub,
    members,
    loading,
    createClub,
    joinClub,
    leaveClub,
    selectClub,
  };
}
