export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievement_definitions: {
        Row: {
          base_description_key: string
          base_name_key: string
          category: string
          created_at: string
          icon: string
          id: string
          is_secret: boolean | null
          key: string
        }
        Insert: {
          base_description_key: string
          base_name_key: string
          category: string
          created_at?: string
          icon: string
          id?: string
          is_secret?: boolean | null
          key: string
        }
        Update: {
          base_description_key?: string
          base_name_key?: string
          category?: string
          created_at?: string
          icon?: string
          id?: string
          is_secret?: boolean | null
          key?: string
        }
        Relationships: []
      }
      achievement_tiers: {
        Row: {
          achievement_id: string
          id: string
          threshold: number
          tier: string
          tier_order: number
        }
        Insert: {
          achievement_id: string
          id?: string
          threshold: number
          tier: string
          tier_order: number
        }
        Update: {
          achievement_id?: string
          id?: string
          threshold?: number
          tier?: string
          tier_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "achievement_tiers_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_alerts: {
        Row: {
          alert_code: string
          fired_at: string
          id: string
          message: string
          metric_value: number | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          silenced_until: string | null
          threshold_value: number | null
        }
        Insert: {
          alert_code: string
          fired_at?: string
          id?: string
          message: string
          metric_value?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          silenced_until?: string | null
          threshold_value?: number | null
        }
        Update: {
          alert_code?: string
          fired_at?: string
          id?: string
          message?: string
          metric_value?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          silenced_until?: string | null
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "admin_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_gift_messages: {
        Row: {
          badge_id: string | null
          claimed: boolean | null
          claimed_at: string | null
          coin_amount: number | null
          created_at: string | null
          id: string
          image_url: string | null
          message: string
          recipient_id: string
          sender_id: string
          template_type: string | null
          title: string
          updated_at: string | null
          xp_amount: number | null
        }
        Insert: {
          badge_id?: string | null
          claimed?: boolean | null
          claimed_at?: string | null
          coin_amount?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          message: string
          recipient_id: string
          sender_id: string
          template_type?: string | null
          title: string
          updated_at?: string | null
          xp_amount?: number | null
        }
        Update: {
          badge_id?: string | null
          claimed?: boolean | null
          claimed_at?: string | null
          coin_amount?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          message?: string
          recipient_id?: string
          sender_id?: string
          template_type?: string | null
          title?: string
          updated_at?: string | null
          xp_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_gift_messages_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "collectible_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_gift_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "admin_gift_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_gift_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "admin_gift_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          country_code: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          player_id: string | null
          referrer: string | null
          session_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          player_id?: string | null
          referrer?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          player_id?: string | null
          referrer?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "analytics_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_completions: {
        Row: {
          accuracy: number | null
          assignment_id: string
          completed_at: string
          id: string
          score: number | null
          student_id: string
          time_spent_seconds: number | null
        }
        Insert: {
          accuracy?: number | null
          assignment_id: string
          completed_at?: string
          id?: string
          score?: number | null
          student_id: string
          time_spent_seconds?: number | null
        }
        Update: {
          accuracy?: number | null
          assignment_id?: string
          completed_at?: string
          id?: string
          score?: number | null
          student_id?: string
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_completions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "teacher_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_completions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "assignment_completions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      async_board_challenges: {
        Row: {
          accepted_at: string | null
          challenged_best_word: string | null
          challenged_id: string
          challenged_score: number | null
          challenged_words: Json | null
          challenger_best_word: string | null
          challenger_id: string
          challenger_score: number | null
          challenger_words: Json | null
          completed_at: string | null
          created_at: string
          duration_seconds: number
          expires_at: string
          game_mode: string
          grid_seed: string | null
          grid_size: number
          id: string
          language: string
          letter_grid: Json
          message: string | null
          played_at: string | null
          status: string
          winner_user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          challenged_best_word?: string | null
          challenged_id: string
          challenged_score?: number | null
          challenged_words?: Json | null
          challenger_best_word?: string | null
          challenger_id: string
          challenger_score?: number | null
          challenger_words?: Json | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number
          expires_at?: string
          game_mode?: string
          grid_seed?: string | null
          grid_size?: number
          id?: string
          language?: string
          letter_grid: Json
          message?: string | null
          played_at?: string | null
          status?: string
          winner_user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          challenged_best_word?: string | null
          challenged_id?: string
          challenged_score?: number | null
          challenged_words?: Json | null
          challenger_best_word?: string | null
          challenger_id?: string
          challenger_score?: number | null
          challenger_words?: Json | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number
          expires_at?: string
          game_mode?: string
          grid_seed?: string | null
          grid_size?: number
          id?: string
          language?: string
          letter_grid?: Json
          message?: string | null
          played_at?: string | null
          status?: string
          winner_user_id?: string | null
        }
        Relationships: []
      }
      blast_personal_bests: {
        Row: {
          best_clear_percentage: number
          best_max_combo: number
          best_score: number
          difficulty: string
          id: string
          total_games: number
          total_words: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          best_clear_percentage?: number
          best_max_combo?: number
          best_score?: number
          difficulty?: string
          id?: string
          total_games?: number
          total_words?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          best_clear_percentage?: number
          best_max_combo?: number
          best_score?: number
          difficulty?: string
          id?: string
          total_games?: number
          total_words?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blast_personal_bests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "blast_personal_bests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blast_results: {
        Row: {
          best_word: string | null
          clear_percentage: number
          created_at: string | null
          difficulty: string
          id: string
          language: string
          max_combo: number
          score: number
          stars: number
          tiles_cleared: number
          total_tiles: number
          user_id: string
          words_found: number
        }
        Insert: {
          best_word?: string | null
          clear_percentage?: number
          created_at?: string | null
          difficulty?: string
          id?: string
          language?: string
          max_combo?: number
          score?: number
          stars?: number
          tiles_cleared?: number
          total_tiles?: number
          user_id: string
          words_found?: number
        }
        Update: {
          best_word?: string | null
          clear_percentage?: number
          created_at?: string | null
          difficulty?: string
          id?: string
          language?: string
          max_combo?: number
          score?: number
          stars?: number
          tiles_cleared?: number
          total_tiles?: number
          user_id?: string
          words_found?: number
        }
        Relationships: [
          {
            foreignKeyName: "blast_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "blast_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_difficulty_params: {
        Row: {
          adjusted_max_delay: number
          adjusted_min_delay: number
          adjusted_miss_chance: number
          adjusted_start_delay: number
          adjusted_words_per_minute: number
          adjusted_wrong_word_chance: number
          avg_player_mmr: number | null
          avg_score_per_game: number | null
          avg_score_per_minute: number | null
          avg_words_per_game: number | null
          avg_words_per_minute: number | null
          calculated_at: string
          created_at: string
          difficulty: string
          id: string
          language: string
          sample_size: number
          updated_at: string
          wrong_word_rate: number | null
        }
        Insert: {
          adjusted_max_delay?: number
          adjusted_min_delay?: number
          adjusted_miss_chance?: number
          adjusted_start_delay?: number
          adjusted_words_per_minute?: number
          adjusted_wrong_word_chance?: number
          avg_player_mmr?: number | null
          avg_score_per_game?: number | null
          avg_score_per_minute?: number | null
          avg_words_per_game?: number | null
          avg_words_per_minute?: number | null
          calculated_at?: string
          created_at?: string
          difficulty: string
          id?: string
          language: string
          sample_size?: number
          updated_at?: string
          wrong_word_rate?: number | null
        }
        Update: {
          adjusted_max_delay?: number
          adjusted_min_delay?: number
          adjusted_miss_chance?: number
          adjusted_start_delay?: number
          adjusted_words_per_minute?: number
          adjusted_wrong_word_chance?: number
          avg_player_mmr?: number | null
          avg_score_per_game?: number | null
          avg_score_per_minute?: number | null
          avg_words_per_game?: number | null
          avg_words_per_minute?: number | null
          calculated_at?: string
          created_at?: string
          difficulty?: string
          id?: string
          language?: string
          sample_size?: number
          updated_at?: string
          wrong_word_rate?: number | null
        }
        Relationships: []
      }
      bot_word_blacklist: {
        Row: {
          blacklisted_by: string | null
          created_at: string | null
          id: string
          language: string
          reason: string | null
          word: string
        }
        Insert: {
          blacklisted_by?: string | null
          created_at?: string | null
          id?: string
          language: string
          reason?: string | null
          word: string
        }
        Update: {
          blacklisted_by?: string | null
          created_at?: string | null
          id?: string
          language?: string
          reason?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_word_blacklist_blacklisted_by_fkey"
            columns: ["blacklisted_by"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "bot_word_blacklist_blacklisted_by_fkey"
            columns: ["blacklisted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_score_history: {
        Row: {
          attention: number
          created_at: string
          drills_completed: number
          flexibility: number
          games_played: number
          id: string
          overall_score: number
          period_start: string
          period_type: string
          processing_speed: number
          user_id: string
          vocabulary: number
          working_memory: number
        }
        Insert: {
          attention: number
          created_at?: string
          drills_completed?: number
          flexibility: number
          games_played?: number
          id?: string
          overall_score: number
          period_start: string
          period_type: string
          processing_speed: number
          user_id: string
          vocabulary: number
          working_memory: number
        }
        Update: {
          attention?: number
          created_at?: string
          drills_completed?: number
          flexibility?: number
          games_played?: number
          id?: string
          overall_score?: number
          period_start?: string
          period_type?: string
          processing_speed?: number
          user_id?: string
          vocabulary?: number
          working_memory?: number
        }
        Relationships: []
      }
      brain_scores: {
        Row: {
          attention: number
          created_at: string
          current_streak: number
          drills_completed: number
          flexibility: number
          games_analyzed: number
          id: string
          last_activity_at: string | null
          longest_streak: number
          overall_score: number
          processing_speed: number
          tier: string
          tier_progress: number
          updated_at: string
          user_id: string
          vocabulary: number
          working_memory: number
        }
        Insert: {
          attention?: number
          created_at?: string
          current_streak?: number
          drills_completed?: number
          flexibility?: number
          games_analyzed?: number
          id?: string
          last_activity_at?: string | null
          longest_streak?: number
          overall_score?: number
          processing_speed?: number
          tier?: string
          tier_progress?: number
          updated_at?: string
          user_id: string
          vocabulary?: number
          working_memory?: number
        }
        Update: {
          attention?: number
          created_at?: string
          current_streak?: number
          drills_completed?: number
          flexibility?: number
          games_analyzed?: number
          id?: string
          last_activity_at?: string | null
          longest_streak?: number
          overall_score?: number
          processing_speed?: number
          tier?: string
          tier_progress?: number
          updated_at?: string
          user_id?: string
          vocabulary?: number
          working_memory?: number
        }
        Relationships: []
      }
      buzz_challenge_requests: {
        Row: {
          created_at: string
          guest_fingerprint: string | null
          id: number
          language: string
          player_id: string | null
          processed_at: string | null
          reason: string | null
          request_date: string
          status: string
        }
        Insert: {
          created_at?: string
          guest_fingerprint?: string | null
          id?: number
          language: string
          player_id?: string | null
          processed_at?: string | null
          reason?: string | null
          request_date?: string
          status?: string
        }
        Update: {
          created_at?: string
          guest_fingerprint?: string | null
          id?: number
          language?: string
          player_id?: string | null
          processed_at?: string | null
          reason?: string | null
          request_date?: string
          status?: string
        }
        Relationships: []
      }
      buzz_image_cache: {
        Row: {
          category: string
          created_at: string | null
          first_used_date: string
          id: number
          image_prompt: string | null
          image_url: string
          last_used_date: string
          storage_path: string | null
          times_reused: number | null
          trending_topic: string
        }
        Insert: {
          category: string
          created_at?: string | null
          first_used_date: string
          id?: number
          image_prompt?: string | null
          image_url: string
          last_used_date: string
          storage_path?: string | null
          times_reused?: number | null
          trending_topic: string
        }
        Update: {
          category?: string
          created_at?: string | null
          first_used_date?: string
          id?: number
          image_prompt?: string | null
          image_url?: string
          last_used_date?: string
          storage_path?: string | null
          times_reused?: number | null
          trending_topic?: string
        }
        Relationships: []
      }
      buzz_prompt_examples: {
        Row: {
          challenge_type: string
          created_at: string
          created_by: string | null
          feedback: string
          id: number
          improved_answer: string | null
          improved_prompt: string | null
          is_active: boolean
          language: string
          original_answer: string
          original_prompt: string
          trend_topic: string | null
          usage_count: number
        }
        Insert: {
          challenge_type: string
          created_at?: string
          created_by?: string | null
          feedback: string
          id?: number
          improved_answer?: string | null
          improved_prompt?: string | null
          is_active?: boolean
          language: string
          original_answer: string
          original_prompt: string
          trend_topic?: string | null
          usage_count?: number
        }
        Update: {
          challenge_type?: string
          created_at?: string
          created_by?: string | null
          feedback?: string
          id?: number
          improved_answer?: string | null
          improved_prompt?: string | null
          is_active?: boolean
          language?: string
          original_answer?: string
          original_prompt?: string
          trend_topic?: string | null
          usage_count?: number
        }
        Relationships: []
      }
      buzz_prompt_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: number
          is_active: boolean
          language: string | null
          name: string
          placeholders: Json | null
          template_content: string
          template_type: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: number
          is_active?: boolean
          language?: string | null
          name: string
          placeholders?: Json | null
          template_content: string
          template_type: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: number
          is_active?: boolean
          language?: string | null
          name?: string
          placeholders?: Json | null
          template_content?: string
          template_type?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      buzz_streaks: {
        Row: {
          current_streak: number | null
          favorite_topics: Json | null
          last_played_date: string | null
          longest_streak: number | null
          player_id: string
          total_challenges_completed: number | null
          updated_at: string | null
        }
        Insert: {
          current_streak?: number | null
          favorite_topics?: Json | null
          last_played_date?: string | null
          longest_streak?: number | null
          player_id: string
          total_challenges_completed?: number | null
          updated_at?: string | null
        }
        Update: {
          current_streak?: number | null
          favorite_topics?: Json | null
          last_played_date?: string | null
          longest_streak?: number | null
          player_id?: string
          total_challenges_completed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buzz_streaks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "buzz_streaks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_signals: {
        Row: {
          avg_session_length_seconds: number | null
          created_at: string
          days_since_improvement: number
          games_per_session: number | null
          id: string
          intervention_sent: boolean
          intervention_type: string | null
          notification_dismissals: number
          risk_level: string
          risk_score: number
          score_trend: number | null
          signal_date: string
          social_interactions: number
          streak_freeze_used: boolean
          user_id: string
        }
        Insert: {
          avg_session_length_seconds?: number | null
          created_at?: string
          days_since_improvement?: number
          games_per_session?: number | null
          id?: string
          intervention_sent?: boolean
          intervention_type?: string | null
          notification_dismissals?: number
          risk_level?: string
          risk_score?: number
          score_trend?: number | null
          signal_date?: string
          social_interactions?: number
          streak_freeze_used?: boolean
          user_id: string
        }
        Update: {
          avg_session_length_seconds?: number | null
          created_at?: string
          days_since_improvement?: number
          games_per_session?: number | null
          id?: string
          intervention_sent?: boolean
          intervention_type?: string | null
          notification_dismissals?: number
          risk_level?: string
          risk_score?: number
          score_trend?: number | null
          signal_date?: string
          social_interactions?: number
          streak_freeze_used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      classroom_memberships: {
        Row: {
          classroom_id: string
          id: string
          joined_at: string | null
          student_id: string
        }
        Insert: {
          classroom_id: string
          id?: string
          joined_at?: string | null
          student_id: string
        }
        Update: {
          classroom_id?: string
          id?: string
          joined_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_memberships_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          created_at: string | null
          id: string
          join_code: string
          language: string | null
          name: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          join_code: string
          language?: string | null
          name: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          join_code?: string
          language?: string | null
          name?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      collectible_items: {
        Row: {
          category: string
          cost: number
          created_at: string | null
          description_key: string
          icon: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name_key: string
          rarity: string
          sort_order: number | null
          unlock_requirement: Json | null
          updated_at: string | null
        }
        Insert: {
          category: string
          cost: number
          created_at?: string | null
          description_key: string
          icon: string
          id: string
          image_url?: string | null
          is_active?: boolean | null
          name_key: string
          rarity: string
          sort_order?: number | null
          unlock_requirement?: Json | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          cost?: number
          created_at?: string | null
          description_key?: string
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name_key?: string
          rarity?: string
          sort_order?: number | null
          unlock_requirement?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      community_board_plays: {
        Row: {
          board_id: string | null
          completed_at: string | null
          custom_avatar: Json | null
          display_name: string
          guest_fingerprint: string | null
          id: string
          longest_word: string | null
          player_id: string | null
          score: number
          time_seconds: number | null
          word_count: number
        }
        Insert: {
          board_id?: string | null
          completed_at?: string | null
          custom_avatar?: Json | null
          display_name: string
          guest_fingerprint?: string | null
          id?: string
          longest_word?: string | null
          player_id?: string | null
          score: number
          time_seconds?: number | null
          word_count: number
        }
        Update: {
          board_id?: string | null
          completed_at?: string | null
          custom_avatar?: Json | null
          display_name?: string
          guest_fingerprint?: string | null
          id?: string
          longest_word?: string | null
          player_id?: string | null
          score?: number
          time_seconds?: number | null
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_board_plays_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "community_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      community_board_ratings: {
        Row: {
          board_id: string
          created_at: string | null
          player_id: string
          rating: number
        }
        Insert: {
          board_id: string
          created_at?: string | null
          player_id: string
          rating: number
        }
        Update: {
          board_id?: string
          created_at?: string | null
          player_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_board_ratings_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "community_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      community_board_reports: {
        Row: {
          board_id: string | null
          created_at: string | null
          id: string
          reason: string
          reporter_id: string | null
        }
        Insert: {
          board_id?: string | null
          created_at?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
        }
        Update: {
          board_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_board_reports_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "community_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      community_boards: {
        Row: {
          board_code: string
          cover_image_url: string | null
          created_at: string | null
          creator_avatar: Json | null
          creator_display_name: string
          creator_guest_fingerprint: string | null
          creator_id: string | null
          creator_profile_picture_url: string | null
          description: string | null
          difficulty: string
          featured: boolean | null
          featured_at: string | null
          grid: Json
          grid_size: number
          id: string
          is_public: boolean | null
          language: string
          moderation_status: string | null
          play_count: number | null
          rating_count: number | null
          rating_sum: number | null
          seed_words: string[] | null
          timer_seconds: number
          title: string
          total_findable_words: number
        }
        Insert: {
          board_code: string
          cover_image_url?: string | null
          created_at?: string | null
          creator_avatar?: Json | null
          creator_display_name: string
          creator_guest_fingerprint?: string | null
          creator_id?: string | null
          creator_profile_picture_url?: string | null
          description?: string | null
          difficulty?: string
          featured?: boolean | null
          featured_at?: string | null
          grid: Json
          grid_size?: number
          id?: string
          is_public?: boolean | null
          language: string
          moderation_status?: string | null
          play_count?: number | null
          rating_count?: number | null
          rating_sum?: number | null
          seed_words?: string[] | null
          timer_seconds?: number
          title: string
          total_findable_words: number
        }
        Update: {
          board_code?: string
          cover_image_url?: string | null
          created_at?: string | null
          creator_avatar?: Json | null
          creator_display_name?: string
          creator_guest_fingerprint?: string | null
          creator_id?: string | null
          creator_profile_picture_url?: string | null
          description?: string | null
          difficulty?: string
          featured?: boolean | null
          featured_at?: string | null
          grid?: Json
          grid_size?: number
          id?: string
          is_public?: boolean | null
          language?: string
          moderation_status?: string | null
          play_count?: number | null
          rating_count?: number | null
          rating_sum?: number | null
          seed_words?: string[] | null
          timer_seconds?: number
          title?: string
          total_findable_words?: number
        }
        Relationships: []
      }
      community_word_approvals: {
        Row: {
          approved_by: string | null
          created_at: string | null
          game_code: string
          id: string
          word_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          game_code: string
          id?: string
          word_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          game_code?: string
          id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_word_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "community_word_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_words: {
        Row: {
          approval_count: number | null
          created_at: string | null
          first_approved_at: string | null
          first_approved_by: string | null
          first_approved_in_game: string | null
          id: string
          language: string
          last_approved_at: string | null
          last_approved_by: string | null
          last_approved_in_game: string | null
          promoted_at: string | null
          promoted_to_dictionary: boolean | null
          updated_at: string | null
          word: string
        }
        Insert: {
          approval_count?: number | null
          created_at?: string | null
          first_approved_at?: string | null
          first_approved_by?: string | null
          first_approved_in_game?: string | null
          id?: string
          language?: string
          last_approved_at?: string | null
          last_approved_by?: string | null
          last_approved_in_game?: string | null
          promoted_at?: string | null
          promoted_to_dictionary?: boolean | null
          updated_at?: string | null
          word: string
        }
        Update: {
          approval_count?: number | null
          created_at?: string | null
          first_approved_at?: string | null
          first_approved_by?: string | null
          first_approved_in_game?: string | null
          id?: string
          language?: string
          last_approved_at?: string | null
          last_approved_by?: string | null
          last_approved_in_game?: string | null
          promoted_at?: string | null
          promoted_to_dictionary?: boolean | null
          updated_at?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_words_first_approved_by_fkey"
            columns: ["first_approved_by"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "community_words_first_approved_by_fkey"
            columns: ["first_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_words_last_approved_by_fkey"
            columns: ["last_approved_by"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "community_words_last_approved_by_fkey"
            columns: ["last_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connections_feedback: {
        Row: {
          created_at: string
          gave_up: boolean
          id: string
          locale: string
          puzzle_id: string
          rating: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          gave_up?: boolean
          id?: string
          locale: string
          puzzle_id: string
          rating: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          gave_up?: boolean
          id?: string
          locale?: string
          puzzle_id?: string
          rating?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      curriculum_word_lists: {
        Row: {
          created_at: string | null
          created_by: string | null
          curriculum_standard: string | null
          description: string | null
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          is_active: boolean | null
          language: string
          name: string
          subject: Database["public"]["Enums"]["curriculum_subject"]
          updated_at: string | null
          word_count: number | null
          words: Json
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          curriculum_standard?: string | null
          description?: string | null
          grade_level: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_active?: boolean | null
          language?: string
          name: string
          subject?: Database["public"]["Enums"]["curriculum_subject"]
          updated_at?: string | null
          word_count?: number | null
          words?: Json
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          curriculum_standard?: string | null
          description?: string | null
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_active?: boolean | null
          language?: string
          name?: string
          subject?: Database["public"]["Enums"]["curriculum_subject"]
          updated_at?: string | null
          word_count?: number | null
          words?: Json
        }
        Relationships: []
      }
      custom_puzzle_attempts: {
        Row: {
          attempt_words: Json | null
          attempts_used: number
          avatar_color: string | null
          avatar_emoji: string | null
          avatar_image: string | null
          beat_creator: boolean | null
          clue_tokens_earned: number | null
          clue_tokens_spent: number | null
          completed_at: string | null
          country_code: string | null
          display_name: string
          efficiency_score: number | null
          guest_fingerprint: string | null
          hints_unlocked: number | null
          id: string
          life_remaining: number | null
          player_id: string | null
          profile_picture_url: string | null
          puzzle_id: string
          solved: boolean
          target_word: string | null
          words_discovered: Json | null
        }
        Insert: {
          attempt_words?: Json | null
          attempts_used?: number
          avatar_color?: string | null
          avatar_emoji?: string | null
          avatar_image?: string | null
          beat_creator?: boolean | null
          clue_tokens_earned?: number | null
          clue_tokens_spent?: number | null
          completed_at?: string | null
          country_code?: string | null
          display_name: string
          efficiency_score?: number | null
          guest_fingerprint?: string | null
          hints_unlocked?: number | null
          id?: string
          life_remaining?: number | null
          player_id?: string | null
          profile_picture_url?: string | null
          puzzle_id: string
          solved?: boolean
          target_word?: string | null
          words_discovered?: Json | null
        }
        Update: {
          attempt_words?: Json | null
          attempts_used?: number
          avatar_color?: string | null
          avatar_emoji?: string | null
          avatar_image?: string | null
          beat_creator?: boolean | null
          clue_tokens_earned?: number | null
          clue_tokens_spent?: number | null
          completed_at?: string | null
          country_code?: string | null
          display_name?: string
          efficiency_score?: number | null
          guest_fingerprint?: string | null
          hints_unlocked?: number | null
          id?: string
          life_remaining?: number | null
          player_id?: string | null
          profile_picture_url?: string | null
          puzzle_id?: string
          solved?: boolean
          target_word?: string | null
          words_discovered?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_puzzle_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "custom_puzzle_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_puzzle_attempts_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "custom_puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_puzzles: {
        Row: {
          created_at: string | null
          creator_attempts_used: number
          creator_display_name: string
          creator_efficiency_score: number
          creator_guest_fingerprint: string | null
          creator_id: string | null
          creator_solved: boolean
          expires_at: string | null
          grid: Json
          id: string
          language: string
          puzzle_code: string
          target_word: string
          total_plays: number | null
        }
        Insert: {
          created_at?: string | null
          creator_attempts_used?: number
          creator_display_name: string
          creator_efficiency_score?: number
          creator_guest_fingerprint?: string | null
          creator_id?: string | null
          creator_solved?: boolean
          expires_at?: string | null
          grid: Json
          id?: string
          language: string
          puzzle_code: string
          target_word: string
          total_plays?: number | null
        }
        Update: {
          created_at?: string | null
          creator_attempts_used?: number
          creator_display_name?: string
          creator_efficiency_score?: number
          creator_guest_fingerprint?: string | null
          creator_id?: string | null
          creator_solved?: boolean
          expires_at?: string | null
          grid?: Json
          id?: string
          language?: string
          puzzle_code?: string
          target_word?: string
          total_plays?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_puzzles_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "custom_puzzles_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_buzz_attempts: {
        Row: {
          challenge_id: number | null
          challenges_solved: Json | null
          completed: boolean | null
          completion_time_seconds: number | null
          guest_fingerprint: string | null
          id: string
          player_id: string | null
          score: number | null
          submitted_at: string | null
        }
        Insert: {
          challenge_id?: number | null
          challenges_solved?: Json | null
          completed?: boolean | null
          completion_time_seconds?: number | null
          guest_fingerprint?: string | null
          id?: string
          player_id?: string | null
          score?: number | null
          submitted_at?: string | null
        }
        Update: {
          challenge_id?: number | null
          challenges_solved?: Json | null
          completed?: boolean | null
          completion_time_seconds?: number | null
          guest_fingerprint?: string | null
          id?: string
          player_id?: string | null
          score?: number | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_buzz_attempts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_buzz_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "daily_buzz_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_buzz_challenges: {
        Row: {
          ai_model: string | null
          challenges: Json
          generated_at: string | null
          id: number
          image_alt_text: string | null
          image_category: string | null
          image_generated_at: string | null
          image_generation_cost_usd: number | null
          image_prompt: string | null
          image_url: string | null
          language: string
          puzzle_date: string
          region: string
          serp_api_response: Json | null
          social_content: Json | null
          trending_summary: string | null
          trending_topics: Json
        }
        Insert: {
          ai_model?: string | null
          challenges: Json
          generated_at?: string | null
          id?: number
          image_alt_text?: string | null
          image_category?: string | null
          image_generated_at?: string | null
          image_generation_cost_usd?: number | null
          image_prompt?: string | null
          image_url?: string | null
          language: string
          puzzle_date: string
          region: string
          serp_api_response?: Json | null
          social_content?: Json | null
          trending_summary?: string | null
          trending_topics: Json
        }
        Update: {
          ai_model?: string | null
          challenges?: Json
          generated_at?: string | null
          id?: number
          image_alt_text?: string | null
          image_category?: string | null
          image_generated_at?: string | null
          image_generation_cost_usd?: number | null
          image_prompt?: string | null
          image_url?: string | null
          language?: string
          puzzle_date?: string
          region?: string
          serp_api_response?: Json | null
          social_content?: Json | null
          trending_summary?: string | null
          trending_topics?: Json
        }
        Relationships: []
      }
      daily_challenge_word_bank: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          blocked_reason: string | null
          category: string | null
          created_at: string | null
          difficulty_score: number | null
          fetch_date: string | null
          id: string
          interestingness_score: number | null
          language: string
          last_used_at: string | null
          source: string
          source_article_title: string | null
          source_article_url: string | null
          status: string
          times_used: number | null
          validation_status: string | null
          word: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          category?: string | null
          created_at?: string | null
          difficulty_score?: number | null
          fetch_date?: string | null
          id?: string
          interestingness_score?: number | null
          language: string
          last_used_at?: string | null
          source?: string
          source_article_title?: string | null
          source_article_url?: string | null
          status?: string
          times_used?: number | null
          validation_status?: string | null
          word: string
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          category?: string | null
          created_at?: string | null
          difficulty_score?: number | null
          fetch_date?: string | null
          id?: string
          interestingness_score?: number | null
          language?: string
          last_used_at?: string | null
          source?: string
          source_article_title?: string | null
          source_article_url?: string | null
          status?: string
          times_used?: number | null
          validation_status?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenge_word_bank_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "daily_challenge_word_bank_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenges: {
        Row: {
          bonus_reward: Json | null
          challenge_date: string
          challenge_tier: string
          challenge_type: string
          claimed: boolean | null
          claimed_at: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          current_value: number | null
          description: string
          id: string
          player_id: string
          target_value: number
          title: string
          xp_reward: number
        }
        Insert: {
          bonus_reward?: Json | null
          challenge_date: string
          challenge_tier: string
          challenge_type: string
          claimed?: boolean | null
          claimed_at?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          description: string
          id?: string
          player_id: string
          target_value: number
          title: string
          xp_reward: number
        }
        Update: {
          bonus_reward?: Json | null
          challenge_date?: string
          challenge_tier?: string
          challenge_type?: string
          claimed?: boolean | null
          claimed_at?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string
          id?: string
          player_id?: string
          target_value?: number
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenges_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "daily_challenges_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_puzzle_attempts: {
        Row: {
          avatar_color: string | null
          avatar_config: Json | null
          avatar_emoji: string | null
          avatar_image: string | null
          completed_at: string | null
          country_code: string | null
          display_name: string | null
          guest_fingerprint: string | null
          id: string
          language: string
          longest_word: string | null
          longest_word_length: number | null
          player_id: string | null
          profile_picture_url: string | null
          puzzle_date: string
          puzzle_number: number
          score: number
          share_method: string | null
          shared: boolean | null
          shared_at: string | null
          started_at: string | null
          time_seconds: number | null
          word_count: number
          words_by_length: Json | null
        }
        Insert: {
          avatar_color?: string | null
          avatar_config?: Json | null
          avatar_emoji?: string | null
          avatar_image?: string | null
          completed_at?: string | null
          country_code?: string | null
          display_name?: string | null
          guest_fingerprint?: string | null
          id?: string
          language?: string
          longest_word?: string | null
          longest_word_length?: number | null
          player_id?: string | null
          profile_picture_url?: string | null
          puzzle_date: string
          puzzle_number: number
          score: number
          share_method?: string | null
          shared?: boolean | null
          shared_at?: string | null
          started_at?: string | null
          time_seconds?: number | null
          word_count: number
          words_by_length?: Json | null
        }
        Update: {
          avatar_color?: string | null
          avatar_config?: Json | null
          avatar_emoji?: string | null
          avatar_image?: string | null
          completed_at?: string | null
          country_code?: string | null
          display_name?: string | null
          guest_fingerprint?: string | null
          id?: string
          language?: string
          longest_word?: string | null
          longest_word_length?: number | null
          player_id?: string | null
          profile_picture_url?: string | null
          puzzle_date?: string
          puzzle_number?: number
          score?: number
          share_method?: string | null
          shared?: boolean | null
          shared_at?: string | null
          started_at?: string | null
          time_seconds?: number | null
          word_count?: number
          words_by_length?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_puzzle_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "daily_puzzle_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_puzzles: {
        Row: {
          average_score: number | null
          average_words: number | null
          created_at: string | null
          grid_seed: string
          id: string
          language: string
          puzzle_date: string
          puzzle_number: number
          top_score: number | null
          top_word_count: number | null
          total_attempts: number | null
          total_completions: number | null
          updated_at: string | null
        }
        Insert: {
          average_score?: number | null
          average_words?: number | null
          created_at?: string | null
          grid_seed: string
          id?: string
          language?: string
          puzzle_date: string
          puzzle_number: number
          top_score?: number | null
          top_word_count?: number | null
          total_attempts?: number | null
          total_completions?: number | null
          updated_at?: string | null
        }
        Update: {
          average_score?: number | null
          average_words?: number | null
          created_at?: string | null
          grid_seed?: string
          id?: string
          language?: string
          puzzle_date?: string
          puzzle_number?: number
          top_score?: number | null
          top_word_count?: number | null
          total_attempts?: number | null
          total_completions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_retry_tokens: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          language: string
          puzzle_date: string
          token: string
          use_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          language: string
          puzzle_date: string
          token: string
          use_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          language?: string
          puzzle_date?: string
          token?: string
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_retry_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "daily_retry_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_target_words: {
        Row: {
          ai_reason: string | null
          ai_selected: boolean | null
          created_at: string | null
          grid: Json | null
          grid_generated_at: string | null
          id: string
          language: string
          override_at: string | null
          override_by: string | null
          override_word: string | null
          puzzle_date: string
          puzzle_number: number
          source_article_url: string | null
          target_word: string
          theme_context: string | null
          updated_at: string | null
          word_source: string | null
        }
        Insert: {
          ai_reason?: string | null
          ai_selected?: boolean | null
          created_at?: string | null
          grid?: Json | null
          grid_generated_at?: string | null
          id?: string
          language: string
          override_at?: string | null
          override_by?: string | null
          override_word?: string | null
          puzzle_date: string
          puzzle_number: number
          source_article_url?: string | null
          target_word: string
          theme_context?: string | null
          updated_at?: string | null
          word_source?: string | null
        }
        Update: {
          ai_reason?: string | null
          ai_selected?: boolean | null
          created_at?: string | null
          grid?: Json | null
          grid_generated_at?: string | null
          id?: string
          language?: string
          override_at?: string | null
          override_by?: string | null
          override_word?: string | null
          puzzle_date?: string
          puzzle_number?: number
          source_article_url?: string | null
          target_word?: string
          theme_context?: string | null
          updated_at?: string | null
          word_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_target_words_override_by_fkey"
            columns: ["override_by"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "daily_target_words_override_by_fkey"
            columns: ["override_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_word_hunt_attempts: {
        Row: {
          attempt_words: Json
          attempts_used: number
          avatar_color: string | null
          avatar_emoji: string | null
          clue_tokens_earned: number | null
          clue_tokens_spent: number | null
          completed_at: string
          country_code: string | null
          created_at: string
          display_name: string
          efficiency_score: number | null
          extra_tries: number
          guest_fingerprint: string | null
          hints_unlocked: number | null
          id: string
          language: string
          life_remaining: number | null
          player_id: string | null
          puzzle_date: string
          puzzle_number: number
          solved: boolean
          target_word: string
          words_discovered: Json | null
        }
        Insert: {
          attempt_words: Json
          attempts_used: number
          avatar_color?: string | null
          avatar_emoji?: string | null
          clue_tokens_earned?: number | null
          clue_tokens_spent?: number | null
          completed_at?: string
          country_code?: string | null
          created_at?: string
          display_name: string
          efficiency_score?: number | null
          extra_tries?: number
          guest_fingerprint?: string | null
          hints_unlocked?: number | null
          id?: string
          language: string
          life_remaining?: number | null
          player_id?: string | null
          puzzle_date: string
          puzzle_number: number
          solved: boolean
          target_word: string
          words_discovered?: Json | null
        }
        Update: {
          attempt_words?: Json
          attempts_used?: number
          avatar_color?: string | null
          avatar_emoji?: string | null
          clue_tokens_earned?: number | null
          clue_tokens_spent?: number | null
          completed_at?: string
          country_code?: string | null
          created_at?: string
          display_name?: string
          efficiency_score?: number | null
          extra_tries?: number
          guest_fingerprint?: string | null
          hints_unlocked?: number | null
          id?: string
          language?: string
          life_remaining?: number | null
          player_id?: string | null
          puzzle_date?: string
          puzzle_number?: number
          solved?: boolean
          target_word?: string
          words_discovered?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_word_hunt_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "daily_word_hunt_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_word_of_day: {
        Row: {
          created_at: string | null
          date: string
          found_count: number | null
          id: string
          language: string
          total_players: number | null
          word: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          found_count?: number | null
          id?: string
          language?: string
          total_players?: number | null
          word: string
        }
        Update: {
          created_at?: string | null
          date?: string
          found_count?: number | null
          id?: string
          language?: string
          total_players?: number | null
          word?: string
        }
        Relationships: []
      }
      daily_word_of_day_players: {
        Row: {
          created_at: string | null
          date: string
          found: boolean | null
          id: string
          player_id: string
          word: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          found?: boolean | null
          id?: string
          player_id: string
          word: string
        }
        Update: {
          created_at?: string | null
          date?: string
          found?: boolean | null
          id?: string
          player_id?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_word_of_day_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "daily_word_of_day_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_word_wheel_attempts: {
        Row: {
          avatar_color: string | null
          avatar_emoji: string | null
          avatar_image: string | null
          center_letter: string | null
          completed_at: string
          country_code: string | null
          created_at: string
          display_name: string
          guest_fingerprint: string | null
          id: string
          language: string
          longest_word: string | null
          longest_word_length: number | null
          player_id: string | null
          puzzle_date: string
          puzzle_number: number
          score: number
          time_seconds: number
          word_count: number
          words_found: Json
        }
        Insert: {
          avatar_color?: string | null
          avatar_emoji?: string | null
          avatar_image?: string | null
          center_letter?: string | null
          completed_at?: string
          country_code?: string | null
          created_at?: string
          display_name: string
          guest_fingerprint?: string | null
          id?: string
          language: string
          longest_word?: string | null
          longest_word_length?: number | null
          player_id?: string | null
          puzzle_date: string
          puzzle_number: number
          score?: number
          time_seconds?: number
          word_count?: number
          words_found?: Json
        }
        Update: {
          avatar_color?: string | null
          avatar_emoji?: string | null
          avatar_image?: string | null
          center_letter?: string | null
          completed_at?: string
          country_code?: string | null
          created_at?: string
          display_name?: string
          guest_fingerprint?: string | null
          id?: string
          language?: string
          longest_word?: string | null
          longest_word_length?: number | null
          player_id?: string | null
          puzzle_date?: string
          puzzle_number?: number
          score?: number
          time_seconds?: number
          word_count?: number
          words_found?: Json
        }
        Relationships: [
          {
            foreignKeyName: "daily_word_wheel_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "daily_word_wheel_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      difficulty_tracking: {
        Row: {
          difficulty_offset: number
          game_mode: string
          id: string
          last_adjustment_at: string
          recent_games: number
          recent_wins: number
          updated_at: string
          user_id: string
          win_rate: number | null
        }
        Insert: {
          difficulty_offset?: number
          game_mode?: string
          id?: string
          last_adjustment_at?: string
          recent_games?: number
          recent_wins?: number
          updated_at?: string
          user_id: string
          win_rate?: number | null
        }
        Update: {
          difficulty_offset?: number
          game_mode?: string
          id?: string
          last_adjustment_at?: string
          recent_games?: number
          recent_wins?: number
          updated_at?: string
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      drill_progress: {
        Row: {
          avg_score: number | null
          created_at: string
          drill_type: string
          high_score: number
          id: string
          last_played_at: string | null
          level: number
          total_plays: number
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_score?: number | null
          created_at?: string
          drill_type: string
          high_score?: number
          id?: string
          last_played_at?: string | null
          level?: number
          total_plays?: number
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_score?: number | null
          created_at?: string
          drill_type?: string
          high_score?: number
          id?: string
          last_played_at?: string | null
          level?: number
          total_plays?: number
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      drill_sessions: {
        Row: {
          created_at: string | null
          domain_score_earned: number | null
          drill_type: string
          duration_seconds: number | null
          extra_data: Json | null
          id: string
          level: number
          score: number | null
          user_id: string
          words_found: number | null
        }
        Insert: {
          created_at?: string | null
          domain_score_earned?: number | null
          drill_type: string
          duration_seconds?: number | null
          extra_data?: Json | null
          id?: string
          level: number
          score?: number | null
          user_id: string
          words_found?: number | null
        }
        Update: {
          created_at?: string | null
          domain_score_earned?: number | null
          drill_type?: string
          duration_seconds?: number | null
          extra_data?: Json | null
          id?: string
          level?: number
          score?: number | null
          user_id?: string
          words_found?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drill_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "drill_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_turns: {
        Row: {
          board_state_snapshot: Json | null
          completed_at: string | null
          duel_id: string
          id: string
          player_id: string
          score: number
          started_at: string
          words_found: Json
        }
        Insert: {
          board_state_snapshot?: Json | null
          completed_at?: string | null
          duel_id: string
          id?: string
          player_id: string
          score?: number
          started_at?: string
          words_found?: Json
        }
        Update: {
          board_state_snapshot?: Json | null
          completed_at?: string | null
          duel_id?: string
          id?: string
          player_id?: string
          score?: number
          started_at?: string
          words_found?: Json
        }
        Relationships: [
          {
            foreignKeyName: "duel_turns_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "student_duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_turns_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "duel_turns_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          language: string | null
          source: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      event_participation: {
        Row: {
          event_id: string
          id: string
          joined_at: string
          rewards_claimed: boolean
          score: number
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          joined_at?: string
          rewards_claimed?: boolean
          score?: number
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          joined_at?: string
          rewards_claimed?: boolean
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participation_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          config: Json
          created_at: string
          description: string
          end_time: string
          id: string
          name: string
          rewards: Json
          start_time: string
          status: string
          type: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string
          end_time: string
          id?: string
          name: string
          rewards?: Json
          start_time: string
          status?: string
          type: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string
          end_time?: string
          id?: string
          name?: string
          rewards?: Json
          start_time?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          admin_only: boolean | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          flag_name: string
          rollout_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          admin_only?: boolean | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          flag_name: string
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_only?: boolean | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          flag_name?: string
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      friend_challenges: {
        Row: {
          accepted_at: string | null
          challenge_id: string | null
          challenge_type: string | null
          challenged_id: string | null
          challenger_id: string | null
          completed_at: string | null
          created_at: string | null
          expires_at: string
          game_language: string | null
          game_mode: string | null
          id: string
          message: string | null
          responded_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          challenge_id?: string | null
          challenge_type?: string | null
          challenged_id?: string | null
          challenger_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string
          game_language?: string | null
          game_mode?: string | null
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          challenge_id?: string | null
          challenge_type?: string | null
          challenged_id?: string | null
          challenger_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string
          game_language?: string | null
          game_mode?: string | null
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_challenges_challenged_id_fkey"
            columns: ["challenged_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "friend_challenges_challenged_id_fkey"
            columns: ["challenged_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "friend_challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_messages: {
        Row: {
          created_at: string | null
          deleted_for_recipient: boolean | null
          deleted_for_sender: boolean | null
          id: string
          message: string
          read: boolean | null
          read_at: string | null
          recipient_id: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_for_recipient?: boolean | null
          deleted_for_sender?: boolean | null
          id?: string
          message: string
          read?: boolean | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_for_recipient?: boolean | null
          deleted_for_sender?: boolean | null
          id?: string
          message?: string
          read?: boolean | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "friend_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "friend_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "friends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_audit_log: {
        Row: {
          event_type: string
          game_code: string
          id: string
          metadata: Json
          player_id: string | null
          score_delta: number | null
          timestamp_ms: number
          word: string | null
        }
        Insert: {
          event_type: string
          game_code: string
          id?: string
          metadata?: Json
          player_id?: string | null
          score_delta?: number | null
          timestamp_ms: number
          word?: string | null
        }
        Update: {
          event_type?: string
          game_code?: string
          id?: string
          metadata?: Json
          player_id?: string | null
          score_delta?: number | null
          timestamp_ms?: number
          word?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_audit_log_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "game_audit_log_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_cognitive_scores: {
        Row: {
          attention: number
          avg_word_length: number | null
          created_at: string
          flexibility: number
          game_duration_seconds: number | null
          game_session_id: string | null
          grid_size: number | null
          hints_used: number | null
          id: string
          legendary_word_count: number | null
          max_combo: number | null
          processing_speed: number
          rare_word_count: number | null
          unique_word_lengths: number | null
          user_id: string
          vocabulary: number
          words_per_minute: number | null
          working_memory: number
        }
        Insert: {
          attention: number
          avg_word_length?: number | null
          created_at?: string
          flexibility: number
          game_duration_seconds?: number | null
          game_session_id?: string | null
          grid_size?: number | null
          hints_used?: number | null
          id?: string
          legendary_word_count?: number | null
          max_combo?: number | null
          processing_speed: number
          rare_word_count?: number | null
          unique_word_lengths?: number | null
          user_id: string
          vocabulary: number
          words_per_minute?: number | null
          working_memory: number
        }
        Update: {
          attention?: number
          avg_word_length?: number | null
          created_at?: string
          flexibility?: number
          game_duration_seconds?: number | null
          game_session_id?: string | null
          grid_size?: number | null
          hints_used?: number | null
          id?: string
          legendary_word_count?: number | null
          max_combo?: number | null
          processing_speed?: number
          rare_word_count?: number | null
          unique_word_lengths?: number | null
          user_id?: string
          vocabulary?: number
          words_per_minute?: number | null
          working_memory?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_cognitive_scores_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_results: {
        Row: {
          created_at: string | null
          game_code: string
          game_mode: string
          id: string
          is_ranked: boolean | null
          language: string | null
          longest_word: string | null
          placement: number | null
          player_id: string
          score: number | null
          time_played: number | null
          word_count: number | null
        }
        Insert: {
          created_at?: string | null
          game_code: string
          game_mode?: string
          id?: string
          is_ranked?: boolean | null
          language?: string | null
          longest_word?: string | null
          placement?: number | null
          player_id: string
          score?: number | null
          time_played?: number | null
          word_count?: number | null
        }
        Update: {
          created_at?: string | null
          game_code?: string
          game_mode?: string
          id?: string
          is_ranked?: boolean | null
          language?: string | null
          longest_word?: string | null
          placement?: number | null
          player_id?: string
          score?: number | null
          time_played?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "game_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          attempts_used: number | null
          browser: string | null
          clues_used: number | null
          completed: boolean | null
          completed_at: string | null
          country: string | null
          created_at: string | null
          daily_puzzle_number: number | null
          device_type: string | null
          difficulty: string | null
          duration_seconds: number | null
          final_rank: number | null
          guest_session_id: string | null
          id: string
          is_first_game: boolean | null
          language: string
          life_gained: number | null
          life_remaining: number | null
          mode: string
          player_count: number | null
          referrer_source: string | null
          room_code: string | null
          score: number | null
          started_at: string
          target_found: boolean | null
          target_word: string | null
          tokens_earned: number | null
          tokens_spent: number | null
          user_id: string | null
          words_found: Json | null
        }
        Insert: {
          attempts_used?: number | null
          browser?: string | null
          clues_used?: number | null
          completed?: boolean | null
          completed_at?: string | null
          country?: string | null
          created_at?: string | null
          daily_puzzle_number?: number | null
          device_type?: string | null
          difficulty?: string | null
          duration_seconds?: number | null
          final_rank?: number | null
          guest_session_id?: string | null
          id?: string
          is_first_game?: boolean | null
          language: string
          life_gained?: number | null
          life_remaining?: number | null
          mode: string
          player_count?: number | null
          referrer_source?: string | null
          room_code?: string | null
          score?: number | null
          started_at?: string
          target_found?: boolean | null
          target_word?: string | null
          tokens_earned?: number | null
          tokens_spent?: number | null
          user_id?: string | null
          words_found?: Json | null
        }
        Update: {
          attempts_used?: number | null
          browser?: string | null
          clues_used?: number | null
          completed?: boolean | null
          completed_at?: string | null
          country?: string | null
          created_at?: string | null
          daily_puzzle_number?: number | null
          device_type?: string | null
          difficulty?: string | null
          duration_seconds?: number | null
          final_rank?: number | null
          guest_session_id?: string | null
          id?: string
          is_first_game?: boolean | null
          language?: string
          life_gained?: number | null
          life_remaining?: number | null
          mode?: string
          player_count?: number | null
          referrer_source?: string | null
          room_code?: string | null
          score?: number | null
          started_at?: string
          target_found?: boolean | null
          target_word?: string | null
          tokens_earned?: number | null
          tokens_spent?: number | null
          user_id?: string | null
          words_found?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      ghost_rivals: {
        Row: {
          created_at: string | null
          id: string
          player_id: string
          player_score: number | null
          rival_id: string
          rival_score: number | null
          week_start: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_id: string
          player_score?: number | null
          rival_id: string
          rival_score?: number | null
          week_start: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          player_id?: string
          player_score?: number | null
          rival_id?: string
          rival_score?: number | null
          week_start?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ghost_rivals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "ghost_rivals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghost_rivals_rival_id_fkey"
            columns: ["rival_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "ghost_rivals_rival_id_fkey"
            columns: ["rival_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_history: {
        Row: {
          amount: number
          cost: number
          created_at: string
          gift_type: string
          id: string
          recipient_id: string
          sender_id: string
          xp_awarded: number
        }
        Insert: {
          amount?: number
          cost?: number
          created_at?: string
          gift_type: string
          id?: string
          recipient_id: string
          sender_id: string
          xp_awarded?: number
        }
        Update: {
          amount?: number
          cost?: number
          created_at?: string
          gift_type?: string
          id?: string
          recipient_id?: string
          sender_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_history_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "gift_history_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_history_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "gift_history_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_sessions: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          first_visit_at: string | null
          id: string
          language: string | null
          last_visit_at: string | null
          linked_at: string | null
          referrer: string | null
          session_id: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          first_visit_at?: string | null
          id?: string
          language?: string | null
          last_visit_at?: string | null
          linked_at?: string | null
          referrer?: string | null
          session_id: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          first_visit_at?: string | null
          id?: string
          language?: string | null
          last_visit_at?: string | null
          linked_at?: string | null
          referrer?: string | null
          session_id?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      guest_tokens: {
        Row: {
          claimed_by: string | null
          created_at: string | null
          id: string
          stats: Json | null
          token_hash: string
          updated_at: string | null
        }
        Insert: {
          claimed_by?: string | null
          created_at?: string | null
          id?: string
          stats?: Json | null
          token_hash: string
          updated_at?: string | null
        }
        Update: {
          claimed_by?: string | null
          created_at?: string | null
          id?: string
          stats?: Json | null
          token_hash?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_tokens_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "guest_tokens_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      head_to_head: {
        Row: {
          created_at: string | null
          draws: number | null
          id: string
          last_game_at: string | null
          player1_id: string
          player1_total_score: number | null
          player1_wins: number | null
          player2_id: string
          player2_total_score: number | null
          player2_wins: number | null
          total_games: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          draws?: number | null
          id?: string
          last_game_at?: string | null
          player1_id: string
          player1_total_score?: number | null
          player1_wins?: number | null
          player2_id: string
          player2_total_score?: number | null
          player2_wins?: number | null
          total_games?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          draws?: number | null
          id?: string
          last_game_at?: string | null
          player1_id?: string
          player1_total_score?: number | null
          player1_wins?: number | null
          player2_id?: string
          player2_total_score?: number | null
          player2_wins?: number | null
          total_games?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "head_to_head_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "head_to_head_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "head_to_head_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "head_to_head_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invalid_word_submissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auto_promoted_at: string | null
          auto_promoted_by: string | null
          created_at: string | null
          first_appealed_at: string | null
          first_submitted_at: string | null
          id: string
          language: string
          last_appealed_at: string | null
          last_submitted_at: string | null
          milog_attempts: number | null
          milog_error: string | null
          milog_rejected_reason: string | null
          milog_status: string | null
          milog_url: string | null
          milog_verified_at: string | null
          milog_word_type: string | null
          player_appeal_count: number | null
          reason: string | null
          submission_count: number | null
          updated_at: string | null
          word: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          auto_promoted_at?: string | null
          auto_promoted_by?: string | null
          created_at?: string | null
          first_appealed_at?: string | null
          first_submitted_at?: string | null
          id?: string
          language?: string
          last_appealed_at?: string | null
          last_submitted_at?: string | null
          milog_attempts?: number | null
          milog_error?: string | null
          milog_rejected_reason?: string | null
          milog_status?: string | null
          milog_url?: string | null
          milog_verified_at?: string | null
          milog_word_type?: string | null
          player_appeal_count?: number | null
          reason?: string | null
          submission_count?: number | null
          updated_at?: string | null
          word: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          auto_promoted_at?: string | null
          auto_promoted_by?: string | null
          created_at?: string | null
          first_appealed_at?: string | null
          first_submitted_at?: string | null
          id?: string
          language?: string
          last_appealed_at?: string | null
          last_submitted_at?: string | null
          milog_attempts?: number | null
          milog_error?: string | null
          milog_rejected_reason?: string | null
          milog_status?: string | null
          milog_url?: string | null
          milog_verified_at?: string | null
          milog_word_type?: string | null
          player_appeal_count?: number | null
          reason?: string | null
          submission_count?: number | null
          updated_at?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "invalid_word_submissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "invalid_word_submissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard: {
        Row: {
          avatar_color: string | null
          avatar_config: Json | null
          avatar_emoji: string | null
          avatar_image: string | null
          created_at: string | null
          current_level: number | null
          display_name: string | null
          games_played: number | null
          games_won: number | null
          id: string
          last_updated: string | null
          player_id: string
          profile_picture_url: string | null
          rank_position: number | null
          ranked_mmr: number | null
          total_score: number | null
          total_xp: number | null
          username: string
        }
        Insert: {
          avatar_color?: string | null
          avatar_config?: Json | null
          avatar_emoji?: string | null
          avatar_image?: string | null
          created_at?: string | null
          current_level?: number | null
          display_name?: string | null
          games_played?: number | null
          games_won?: number | null
          id?: string
          last_updated?: string | null
          player_id: string
          profile_picture_url?: string | null
          rank_position?: number | null
          ranked_mmr?: number | null
          total_score?: number | null
          total_xp?: number | null
          username: string
        }
        Update: {
          avatar_color?: string | null
          avatar_config?: Json | null
          avatar_emoji?: string | null
          avatar_image?: string | null
          created_at?: string | null
          current_level?: number | null
          display_name?: string | null
          games_played?: number | null
          games_won?: number | null
          id?: string
          last_updated?: string | null
          player_id?: string
          profile_picture_url?: string | null
          rank_position?: number | null
          ranked_mmr?: number | null
          total_score?: number | null
          total_xp?: number | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "leaderboard_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_snapshots: {
        Row: {
          classroom_id: string
          created_at: string
          id: string
          rank_position: number
          snapshot_date: string
          student_id: string
          time_scope: string
          total_xp: number
        }
        Insert: {
          classroom_id: string
          created_at?: string
          id?: string
          rank_position: number
          snapshot_date: string
          student_id: string
          time_scope: string
          total_xp?: number
        }
        Update: {
          classroom_id?: string
          created_at?: string
          id?: string
          rank_position?: number
          snapshot_date?: string
          student_id?: string
          time_scope?: string
          total_xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_snapshots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "leaderboard_snapshots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_history: {
        Row: {
          created_at: string
          id: string
          league_id: string
          position: number
          promoted: boolean
          relegated: boolean
          rewards_claimed: boolean
          tier: string
          user_id: string
          week_end: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          position: number
          promoted?: boolean
          relegated?: boolean
          rewards_claimed?: boolean
          tier: string
          user_id: string
          week_end: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          position?: number
          promoted?: boolean
          relegated?: boolean
          rewards_claimed?: boolean
          tier?: string
          user_id?: string
          week_end?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_history_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_members: {
        Row: {
          display_name: string | null
          final_position: number | null
          id: string
          joined_at: string
          league_id: string
          user_id: string
          weekly_xp: number
        }
        Insert: {
          display_name?: string | null
          final_position?: number | null
          id?: string
          joined_at?: string
          league_id: string
          user_id: string
          weekly_xp?: number
        }
        Update: {
          display_name?: string | null
          final_position?: number | null
          id?: string
          joined_at?: string
          league_id?: string
          user_id?: string
          weekly_xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          id: string
          member_count: number
          status: string
          tier: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_count?: number
          status?: string
          tier?: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          member_count?: number
          status?: string
          tier?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      lesson_assignments: {
        Row: {
          classroom_id: string
          created_at: string | null
          due_date: string | null
          id: string
          lesson_id: string
        }
        Insert: {
          classroom_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          lesson_id: string
        }
        Update: {
          classroom_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_assignments_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_templates: {
        Row: {
          allow_late_join: boolean
          board_cols: number | null
          board_rows: number | null
          created_at: string
          difficulty: string
          id: string
          is_default: boolean
          lesson_id: string
          min_word_length: number
          name: string
          teacher_id: string
          timer_seconds: number
          updated_at: string
        }
        Insert: {
          allow_late_join?: boolean
          board_cols?: number | null
          board_rows?: number | null
          created_at?: string
          difficulty?: string
          id?: string
          is_default?: boolean
          lesson_id: string
          min_word_length?: number
          name: string
          teacher_id: string
          timer_seconds?: number
          updated_at?: string
        }
        Update: {
          allow_late_join?: boolean
          board_cols?: number | null
          board_rows?: number | null
          created_at?: string
          difficulty?: string
          id?: string
          is_default?: boolean
          lesson_id?: string
          min_word_length?: number
          name?: string
          teacher_id?: string
          timer_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_templates_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      level_attempts: {
        Row: {
          attempt_count: number
          best_score: number
          best_time_remaining: number
          best_words: number
          consecutive_failures: number
          first_attempt_at: string
          id: string
          last_attempt_at: string
          level: number
          objective_progress: Json
          user_id: string
          world: number
        }
        Insert: {
          attempt_count?: number
          best_score?: number
          best_time_remaining?: number
          best_words?: number
          consecutive_failures?: number
          first_attempt_at?: string
          id?: string
          last_attempt_at?: string
          level: number
          objective_progress?: Json
          user_id: string
          world: number
        }
        Update: {
          attempt_count?: number
          best_score?: number
          best_time_remaining?: number
          best_words?: number
          consecutive_failures?: number
          first_attempt_at?: string
          id?: string
          last_attempt_at?: string
          level?: number
          objective_progress?: Json
          user_id?: string
          world?: number
        }
        Relationships: []
      }
      level_completions: {
        Row: {
          best_score: number | null
          best_words: number | null
          completed_at: string | null
          id: string
          level: number
          stars: number | null
          user_id: string
          world: number
        }
        Insert: {
          best_score?: number | null
          best_words?: number | null
          completed_at?: string | null
          id?: string
          level: number
          stars?: number | null
          user_id: string
          world: number
        }
        Update: {
          best_score?: number | null
          best_words?: number | null
          completed_at?: string | null
          id?: string
          level?: number
          stars?: number | null
          user_id?: string
          world?: number
        }
        Relationships: []
      }
      moderation_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          reason: string
          resolved_at: string | null
          target_player_id: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason: string
          resolved_at?: string | null
          target_player_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string
          resolved_at?: string | null
          target_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "moderation_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_target_player_id_fkey"
            columns: ["target_player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "moderation_actions_target_player_id_fkey"
            columns: ["target_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mystery_rewards_log: {
        Row: {
          awarded_at: string | null
          game_code: string | null
          id: string
          player_id: string
          reward_type: string
          reward_value: string
          trigger_type: string
        }
        Insert: {
          awarded_at?: string | null
          game_code?: string | null
          id?: string
          player_id: string
          reward_type: string
          reward_value: string
          trigger_type: string
        }
        Update: {
          awarded_at?: string | null
          game_code?: string | null
          id?: string
          player_id?: string
          reward_type?: string
          reward_value?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mystery_rewards_log_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "mystery_rewards_log_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_collectibles: {
        Row: {
          acquired_at: string | null
          collectible_id: string
          equipped_slot: string | null
          id: string
          is_equipped: boolean | null
          player_id: string
        }
        Insert: {
          acquired_at?: string | null
          collectible_id: string
          equipped_slot?: string | null
          id?: string
          is_equipped?: boolean | null
          player_id: string
        }
        Update: {
          acquired_at?: string | null
          collectible_id?: string
          equipped_slot?: string | null
          id?: string
          is_equipped?: boolean | null
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_collectibles_collectible_id_fkey"
            columns: ["collectible_id"]
            isOneToOne: false
            referencedRelation: "collectible_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_collectibles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_collectibles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_daily_missions: {
        Row: {
          adventure_celebrated: boolean
          adventure_completed: boolean | null
          brain_drill_completed: boolean | null
          community_celebrated: boolean
          community_completed: boolean | null
          created_at: string | null
          grand_slam_celebrated: boolean
          grand_slam_claimed: boolean | null
          grand_slam_reward: Json | null
          id: string
          mission_date: string
          player_id: string
          word_hunt_celebrated: boolean
          word_hunt_completed: boolean | null
        }
        Insert: {
          adventure_celebrated?: boolean
          adventure_completed?: boolean | null
          brain_drill_completed?: boolean | null
          community_celebrated?: boolean
          community_completed?: boolean | null
          created_at?: string | null
          grand_slam_celebrated?: boolean
          grand_slam_claimed?: boolean | null
          grand_slam_reward?: Json | null
          id?: string
          mission_date?: string
          player_id: string
          word_hunt_celebrated?: boolean
          word_hunt_completed?: boolean | null
        }
        Update: {
          adventure_celebrated?: boolean
          adventure_completed?: boolean | null
          brain_drill_completed?: boolean | null
          community_celebrated?: boolean
          community_completed?: boolean | null
          created_at?: string | null
          grand_slam_celebrated?: boolean
          grand_slam_claimed?: boolean | null
          grand_slam_reward?: Json | null
          id?: string
          mission_date?: string
          player_id?: string
          word_hunt_celebrated?: boolean
          word_hunt_completed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "player_daily_missions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_daily_missions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_engagement: {
        Row: {
          avg_session_length: number | null
          calendar_days_claimed: number[] | null
          calendar_month: number | null
          calendar_year: number | null
          comeback_bonus_claimed: boolean | null
          comeback_bonus_expires_at: string | null
          comeback_xp_multiplier: number | null
          created_at: string | null
          current_streak: number | null
          games_today: number | null
          last_login_date: string | null
          last_played_at: string | null
          last_session_date: string | null
          longest_streak: number | null
          player_id: string
          power_hour_activated_date: string | null
          power_hour_expires_at: string | null
          streak_freezes_available: number | null
          streak_protected_until: string | null
          total_sessions: number | null
          updated_at: string | null
        }
        Insert: {
          avg_session_length?: number | null
          calendar_days_claimed?: number[] | null
          calendar_month?: number | null
          calendar_year?: number | null
          comeback_bonus_claimed?: boolean | null
          comeback_bonus_expires_at?: string | null
          comeback_xp_multiplier?: number | null
          created_at?: string | null
          current_streak?: number | null
          games_today?: number | null
          last_login_date?: string | null
          last_played_at?: string | null
          last_session_date?: string | null
          longest_streak?: number | null
          player_id: string
          power_hour_activated_date?: string | null
          power_hour_expires_at?: string | null
          streak_freezes_available?: number | null
          streak_protected_until?: string | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_session_length?: number | null
          calendar_days_claimed?: number[] | null
          calendar_month?: number | null
          calendar_year?: number | null
          comeback_bonus_claimed?: boolean | null
          comeback_bonus_expires_at?: string | null
          comeback_xp_multiplier?: number | null
          created_at?: string | null
          current_streak?: number | null
          games_today?: number | null
          last_login_date?: string | null
          last_played_at?: string | null
          last_session_date?: string | null
          longest_streak?: number | null
          player_id?: string
          power_hour_activated_date?: string | null
          power_hour_expires_at?: string | null
          streak_freezes_available?: number | null
          streak_protected_until?: string | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_engagement_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_engagement_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_inventory: {
        Row: {
          category: string
          earned_at: string | null
          id: string
          item_id: string
          item_type: string
          quantity: number | null
          rarity: string
          source_level: number | null
          source_world: number | null
          user_id: string
        }
        Insert: {
          category: string
          earned_at?: string | null
          id?: string
          item_id: string
          item_type: string
          quantity?: number | null
          rarity: string
          source_level?: number | null
          source_world?: number | null
          user_id: string
        }
        Update: {
          category?: string
          earned_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          quantity?: number | null
          rarity?: string
          source_level?: number | null
          source_world?: number | null
          user_id?: string
        }
        Relationships: []
      }
      player_progression: {
        Row: {
          adventure_achievement_counts: Json | null
          chapter_quest_progress: Json | null
          created_at: string | null
          current_level: number | null
          current_world: number | null
          endless_high_floor: number | null
          gold: number | null
          player_level: number | null
          total_stars: number | null
          updated_at: string | null
          upgrades: Json | null
          user_id: string
          word_album: string[] | null
          word_album_claimed_milestones: number[] | null
          xp: number | null
        }
        Insert: {
          adventure_achievement_counts?: Json | null
          chapter_quest_progress?: Json | null
          created_at?: string | null
          current_level?: number | null
          current_world?: number | null
          endless_high_floor?: number | null
          gold?: number | null
          player_level?: number | null
          total_stars?: number | null
          updated_at?: string | null
          upgrades?: Json | null
          user_id: string
          word_album?: string[] | null
          word_album_claimed_milestones?: number[] | null
          xp?: number | null
        }
        Update: {
          adventure_achievement_counts?: Json | null
          chapter_quest_progress?: Json | null
          created_at?: string | null
          current_level?: number | null
          current_world?: number | null
          endless_high_floor?: number | null
          gold?: number | null
          player_level?: number | null
          total_stars?: number | null
          updated_at?: string | null
          upgrades?: Json | null
          user_id?: string
          word_album?: string[] | null
          word_album_claimed_milestones?: number[] | null
          xp?: number | null
        }
        Relationships: []
      }
      player_recaps: {
        Row: {
          best_combo: number
          best_score: number
          created_at: string
          favorite_mode: string | null
          games_won: number
          id: string
          improvement_percent: number | null
          longest_word: string | null
          period_end: string
          period_start: string
          period_type: string
          rank_change: number
          rarest_word: string | null
          streak_days: number
          total_games: number
          total_score: number
          total_words: number
          unique_words_found: number
          user_id: string
        }
        Insert: {
          best_combo?: number
          best_score?: number
          created_at?: string
          favorite_mode?: string | null
          games_won?: number
          id?: string
          improvement_percent?: number | null
          longest_word?: string | null
          period_end: string
          period_start: string
          period_type: string
          rank_change?: number
          rarest_word?: string | null
          streak_days?: number
          total_games?: number
          total_score?: number
          total_words?: number
          unique_words_found?: number
          user_id: string
        }
        Update: {
          best_combo?: number
          best_score?: number
          created_at?: string
          favorite_mode?: string | null
          games_won?: number
          id?: string
          improvement_percent?: number | null
          longest_word?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          rank_change?: number
          rarest_word?: string | null
          streak_days?: number
          total_games?: number
          total_score?: number
          total_words?: number
          unique_words_found?: number
          user_id?: string
        }
        Relationships: []
      }
      player_words: {
        Row: {
          created_at: string | null
          first_submitted_at: string | null
          first_submitted_by: string | null
          first_submitted_in_game: string | null
          id: string
          language: string
          last_submitted_at: string | null
          last_submitted_by: string | null
          last_submitted_in_game: string | null
          times_found_by_bots: number | null
          times_submitted: number | null
          updated_at: string | null
          word: string
        }
        Insert: {
          created_at?: string | null
          first_submitted_at?: string | null
          first_submitted_by?: string | null
          first_submitted_in_game?: string | null
          id?: string
          language?: string
          last_submitted_at?: string | null
          last_submitted_by?: string | null
          last_submitted_in_game?: string | null
          times_found_by_bots?: number | null
          times_submitted?: number | null
          updated_at?: string | null
          word: string
        }
        Update: {
          created_at?: string | null
          first_submitted_at?: string | null
          first_submitted_by?: string | null
          first_submitted_in_game?: string | null
          id?: string
          language?: string
          last_submitted_at?: string | null
          last_submitted_by?: string | null
          last_submitted_in_game?: string | null
          times_found_by_bots?: number | null
          times_submitted?: number | null
          updated_at?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_words_first_submitted_by_fkey"
            columns: ["first_submitted_by"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_words_first_submitted_by_fkey"
            columns: ["first_submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_words_last_submitted_by_fkey"
            columns: ["last_submitted_by"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_words_last_submitted_by_fkey"
            columns: ["last_submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_wrong_words: {
        Row: {
          first_submitted_at: string
          id: string
          language: string
          last_submitted_at: string
          times_submitted: number
          word: string
        }
        Insert: {
          first_submitted_at?: string
          id?: string
          language?: string
          last_submitted_at?: string
          times_submitted?: number
          word: string
        }
        Update: {
          first_submitted_at?: string
          id?: string
          language?: string
          last_submitted_at?: string
          times_submitted?: number
          word?: string
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          accuracy: number | null
          cards_correct: number
          cards_reviewed: number
          classroom_id: string | null
          completed_at: string | null
          duration_seconds: number | null
          id: string
          lesson_id: string
          max_combo: number | null
          mode: string | null
          practice_type: string
          results: Json | null
          score: number
          started_at: string
          student_id: string
          time_spent_seconds: number
          total_score: number
          vocabulary_words_found: string[]
          words_attempted: number
          words_correct: number
          words_found: string[]
          xp_awarded: number | null
        }
        Insert: {
          accuracy?: number | null
          cards_correct?: number
          cards_reviewed?: number
          classroom_id?: string | null
          completed_at?: string | null
          duration_seconds?: number | null
          id?: string
          lesson_id: string
          max_combo?: number | null
          mode?: string | null
          practice_type: string
          results?: Json | null
          score?: number
          started_at?: string
          student_id: string
          time_spent_seconds?: number
          total_score?: number
          vocabulary_words_found?: string[]
          words_attempted?: number
          words_correct?: number
          words_found?: string[]
          xp_awarded?: number | null
        }
        Update: {
          accuracy?: number | null
          cards_correct?: number
          cards_reviewed?: number
          classroom_id?: string | null
          completed_at?: string | null
          duration_seconds?: number | null
          id?: string
          lesson_id?: string
          max_combo?: number | null
          mode?: string | null
          practice_type?: string
          results?: Json | null
          score?: number
          started_at?: string
          student_id?: string
          time_spent_seconds?: number
          total_score?: number
          vocabulary_words_found?: string[]
          words_attempted?: number
          words_correct?: number
          words_found?: string[]
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          achievement_counts: Json | null
          admin_role: string | null
          avatar_color: string | null
          avatar_config: Json | null
          avatar_emoji: string | null
          avatar_image: string | null
          ban_reason: string | null
          banned_until: string | null
          blast_access: boolean
          casual_games: number | null
          casual_wins: number | null
          country_code: string | null
          created_at: string | null
          current_level: number | null
          daily_email_subscribed: boolean | null
          display_name: string | null
          email_unsubscribe_token: string | null
          equipped_cosmetics: Json | null
          free_hints_available: number | null
          gift_modal_dismissed_at: string | null
          has_customized_profile: boolean | null
          id: string
          is_admin: boolean | null
          is_banned: boolean
          language: string | null
          last_daily_email_sent_at: string | null
          last_daily_push_sent_at: string | null
          last_game_at: string | null
          last_reengagement_email_sent_at: string | null
          last_seen_at: string | null
          lifetime_coins_earned: number | null
          lifetime_xp: number | null
          longest_word: string | null
          longest_word_length: number | null
          mp_best_streak_classic: number | null
          mp_best_streak_wordhunt: number | null
          mp_win_streak_classic: number | null
          mp_win_streak_wordhunt: number | null
          peak_mmr: number | null
          player_title: string | null
          practice_graduated_at: string | null
          premium_avatar_parts: Json | null
          prestige_level: number | null
          prestige_multiplier: number | null
          prestige_unlocks: Json | null
          profile_picture_provider: string | null
          profile_picture_url: string | null
          purchased_cosmetics: string[] | null
          ranked_games: number | null
          ranked_mmr: number | null
          ranked_wins: number | null
          referral_code: string | null
          referral_count: number | null
          referral_reward_xp: number | null
          referred_by: string | null
          referrer: string | null
          season_peak_tier: Json | null
          streak_freeze_count: number | null
          timezone: string | null
          total_coins: number | null
          total_games: number | null
          total_hints_used: number | null
          total_score: number | null
          total_time_played: number | null
          total_words: number | null
          total_xp: number | null
          unique_days_played: number | null
          updated_at: string | null
          user_role: Database["public"]["Enums"]["user_role"] | null
          username: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          achievement_counts?: Json | null
          admin_role?: string | null
          avatar_color?: string | null
          avatar_config?: Json | null
          avatar_emoji?: string | null
          avatar_image?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          blast_access?: boolean
          casual_games?: number | null
          casual_wins?: number | null
          country_code?: string | null
          created_at?: string | null
          current_level?: number | null
          daily_email_subscribed?: boolean | null
          display_name?: string | null
          email_unsubscribe_token?: string | null
          equipped_cosmetics?: Json | null
          free_hints_available?: number | null
          gift_modal_dismissed_at?: string | null
          has_customized_profile?: boolean | null
          id: string
          is_admin?: boolean | null
          is_banned?: boolean
          language?: string | null
          last_daily_email_sent_at?: string | null
          last_daily_push_sent_at?: string | null
          last_game_at?: string | null
          last_reengagement_email_sent_at?: string | null
          last_seen_at?: string | null
          lifetime_coins_earned?: number | null
          lifetime_xp?: number | null
          longest_word?: string | null
          longest_word_length?: number | null
          mp_best_streak_classic?: number | null
          mp_best_streak_wordhunt?: number | null
          mp_win_streak_classic?: number | null
          mp_win_streak_wordhunt?: number | null
          peak_mmr?: number | null
          player_title?: string | null
          practice_graduated_at?: string | null
          premium_avatar_parts?: Json | null
          prestige_level?: number | null
          prestige_multiplier?: number | null
          prestige_unlocks?: Json | null
          profile_picture_provider?: string | null
          profile_picture_url?: string | null
          purchased_cosmetics?: string[] | null
          ranked_games?: number | null
          ranked_mmr?: number | null
          ranked_wins?: number | null
          referral_code?: string | null
          referral_count?: number | null
          referral_reward_xp?: number | null
          referred_by?: string | null
          referrer?: string | null
          season_peak_tier?: Json | null
          streak_freeze_count?: number | null
          timezone?: string | null
          total_coins?: number | null
          total_games?: number | null
          total_hints_used?: number | null
          total_score?: number | null
          total_time_played?: number | null
          total_words?: number | null
          total_xp?: number | null
          unique_days_played?: number | null
          updated_at?: string | null
          user_role?: Database["public"]["Enums"]["user_role"] | null
          username: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          achievement_counts?: Json | null
          admin_role?: string | null
          avatar_color?: string | null
          avatar_config?: Json | null
          avatar_emoji?: string | null
          avatar_image?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          blast_access?: boolean
          casual_games?: number | null
          casual_wins?: number | null
          country_code?: string | null
          created_at?: string | null
          current_level?: number | null
          daily_email_subscribed?: boolean | null
          display_name?: string | null
          email_unsubscribe_token?: string | null
          equipped_cosmetics?: Json | null
          free_hints_available?: number | null
          gift_modal_dismissed_at?: string | null
          has_customized_profile?: boolean | null
          id?: string
          is_admin?: boolean | null
          is_banned?: boolean
          language?: string | null
          last_daily_email_sent_at?: string | null
          last_daily_push_sent_at?: string | null
          last_game_at?: string | null
          last_reengagement_email_sent_at?: string | null
          last_seen_at?: string | null
          lifetime_coins_earned?: number | null
          lifetime_xp?: number | null
          longest_word?: string | null
          longest_word_length?: number | null
          mp_best_streak_classic?: number | null
          mp_best_streak_wordhunt?: number | null
          mp_win_streak_classic?: number | null
          mp_win_streak_wordhunt?: number | null
          peak_mmr?: number | null
          player_title?: string | null
          practice_graduated_at?: string | null
          premium_avatar_parts?: Json | null
          prestige_level?: number | null
          prestige_multiplier?: number | null
          prestige_unlocks?: Json | null
          profile_picture_provider?: string | null
          profile_picture_url?: string | null
          purchased_cosmetics?: string[] | null
          ranked_games?: number | null
          ranked_mmr?: number | null
          ranked_wins?: number | null
          referral_code?: string | null
          referral_count?: number | null
          referral_reward_xp?: number | null
          referred_by?: string | null
          referrer?: string | null
          season_peak_tier?: Json | null
          streak_freeze_count?: number | null
          timezone?: string | null
          total_coins?: number | null
          total_games?: number | null
          total_hints_used?: number | null
          total_score?: number | null
          total_time_played?: number | null
          total_words?: number | null
          total_xp?: number | null
          unique_days_played?: number | null
          updated_at?: string | null
          user_role?: Database["public"]["Enums"]["user_role"] | null
          username?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_transactions: {
        Row: {
          amount: number | null
          currency: string | null
          id: string
          item_sku: string | null
          notification_type: string
          payload: Json | null
          processed_at: string
          refunded_at: string | null
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          currency?: string | null
          id?: string
          item_sku?: string | null
          notification_type: string
          payload?: Json | null
          processed_at: string
          refunded_at?: string | null
          transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number | null
          currency?: string | null
          id?: string
          item_sku?: string | null
          notification_type?: string
          payload?: Json | null
          processed_at?: string
          refunded_at?: string | null
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      ranked_progress: {
        Row: {
          casual_games_played: number | null
          created_at: string | null
          id: string
          player_id: string
          unlocked_at: string | null
          updated_at: string | null
        }
        Insert: {
          casual_games_played?: number | null
          created_at?: string | null
          id?: string
          player_id: string
          unlocked_at?: string | null
          updated_at?: string | null
        }
        Update: {
          casual_games_played?: number | null
          created_at?: string | null
          id?: string
          player_id?: string
          unlocked_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ranked_progress_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "ranked_progress_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reengagement_sequences: {
        Row: {
          created_at: string
          current_tier: number
          days_lapsed: number
          id: string
          last_notification_at: string | null
          last_notification_type: string | null
          notifications_sent: number
          opted_out: boolean
          reopened: boolean
          reopened_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_tier?: number
          days_lapsed?: number
          id?: string
          last_notification_at?: string | null
          last_notification_type?: string | null
          notifications_sent?: number
          opted_out?: boolean
          reopened?: boolean
          reopened_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_tier?: number
          days_lapsed?: number
          id?: string
          last_notification_at?: string | null
          last_notification_type?: string | null
          notifications_sent?: number
          opted_out?: boolean
          reopened?: boolean
          reopened_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          player_id: string
          referral_id: string | null
          reward_description: string | null
          reward_type: string
          xp_amount: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          player_id: string
          referral_id?: string | null
          reward_description?: string | null
          reward_type: string
          xp_amount?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          player_id?: string
          referral_id?: string | null
          reward_description?: string | null
          reward_type?: string
          xp_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "referral_rewards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          referral_code: string
          referred_first_game_played: boolean | null
          referred_games_played: number | null
          referred_id: string
          referred_total_score: number | null
          referrer_id: string
          reward_amount: number | null
          reward_granted: boolean | null
          reward_granted_at: string | null
          reward_type: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          referral_code: string
          referred_first_game_played?: boolean | null
          referred_games_played?: number | null
          referred_id: string
          referred_total_score?: number | null
          referrer_id: string
          reward_amount?: number | null
          reward_granted?: boolean | null
          reward_granted_at?: string | null
          reward_type?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          referral_code?: string
          referred_first_game_played?: boolean | null
          referred_games_played?: number | null
          referred_id?: string
          referred_total_score?: number | null
          referrer_id?: string
          reward_amount?: number | null
          reward_granted?: boolean | null
          reward_granted_at?: string | null
          reward_type?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      score_challenge_attempts: {
        Row: {
          avatar_color: string | null
          avatar_emoji: string | null
          beat_creator: boolean | null
          challenge_id: string | null
          completed_at: string | null
          guest_fingerprint: string | null
          id: string
          longest_word: string | null
          longest_word_length: number | null
          max_combo: number | null
          player_id: string | null
          score: number
          score_difference: number | null
          username: string
          word_count: number
        }
        Insert: {
          avatar_color?: string | null
          avatar_emoji?: string | null
          beat_creator?: boolean | null
          challenge_id?: string | null
          completed_at?: string | null
          guest_fingerprint?: string | null
          id?: string
          longest_word?: string | null
          longest_word_length?: number | null
          max_combo?: number | null
          player_id?: string | null
          score: number
          score_difference?: number | null
          username: string
          word_count: number
        }
        Update: {
          avatar_color?: string | null
          avatar_emoji?: string | null
          beat_creator?: boolean | null
          challenge_id?: string | null
          completed_at?: string | null
          guest_fingerprint?: string | null
          id?: string
          longest_word?: string | null
          longest_word_length?: number | null
          max_combo?: number | null
          player_id?: string | null
          score?: number
          score_difference?: number | null
          username?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "score_challenge_attempts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "score_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_challenge_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "score_challenge_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      score_challenges: {
        Row: {
          challenge_code: string
          created_at: string | null
          creator_achievements: string[] | null
          creator_avatar_color: string | null
          creator_avatar_emoji: string | null
          creator_guest_fingerprint: string | null
          creator_id: string | null
          creator_longest_word: string | null
          creator_longest_word_length: number | null
          creator_max_combo: number | null
          creator_score: number
          creator_username: string
          creator_word_count: number
          difficulty: string
          duration_seconds: number
          expires_at: string | null
          grid_seed: string
          id: string
          language: string
          min_word_length: number
          total_attempts: number | null
          total_beaten: number | null
          updated_at: string | null
        }
        Insert: {
          challenge_code: string
          created_at?: string | null
          creator_achievements?: string[] | null
          creator_avatar_color?: string | null
          creator_avatar_emoji?: string | null
          creator_guest_fingerprint?: string | null
          creator_id?: string | null
          creator_longest_word?: string | null
          creator_longest_word_length?: number | null
          creator_max_combo?: number | null
          creator_score: number
          creator_username: string
          creator_word_count: number
          difficulty?: string
          duration_seconds?: number
          expires_at?: string | null
          grid_seed: string
          id?: string
          language?: string
          min_word_length?: number
          total_attempts?: number | null
          total_beaten?: number | null
          updated_at?: string | null
        }
        Update: {
          challenge_code?: string
          created_at?: string | null
          creator_achievements?: string[] | null
          creator_avatar_color?: string | null
          creator_avatar_emoji?: string | null
          creator_guest_fingerprint?: string | null
          creator_id?: string | null
          creator_longest_word?: string | null
          creator_longest_word_length?: number | null
          creator_max_combo?: number | null
          creator_score?: number
          creator_username?: string
          creator_word_count?: number
          difficulty?: string
          duration_seconds?: number
          expires_at?: string | null
          grid_seed?: string
          id?: string
          language?: string
          min_word_length?: number
          total_attempts?: number | null
          total_beaten?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "score_challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "score_challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      serp_api_logs: {
        Row: {
          api_response_time_ms: number | null
          created_at: string | null
          error_message: string | null
          id: number
          region: string
          request_date: string
          reused_from_cache: boolean | null
          success: boolean | null
          trends_fetched: number | null
        }
        Insert: {
          api_response_time_ms?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: number
          region: string
          request_date: string
          reused_from_cache?: boolean | null
          success?: boolean | null
          trends_fetched?: number | null
        }
        Update: {
          api_response_time_ms?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: number
          region?: string
          request_date?: string
          reused_from_cache?: boolean | null
          success?: boolean | null
          trends_fetched?: number | null
        }
        Relationships: []
      }
      serp_trends_cache: {
        Row: {
          api_response_time_ms: number | null
          created_at: string | null
          fetch_date: string
          id: number
          region: string
          trends_data: Json
          trends_fetched: number | null
        }
        Insert: {
          api_response_time_ms?: number | null
          created_at?: string | null
          fetch_date: string
          id?: number
          region: string
          trends_data: Json
          trends_fetched?: number | null
        }
        Update: {
          api_response_time_ms?: number | null
          created_at?: string | null
          fetch_date?: string
          id?: number
          region?: string
          trends_data?: Json
          trends_fetched?: number | null
        }
        Relationships: []
      }
      single_player_leaderboard: {
        Row: {
          avatar_color: string | null
          avatar_emoji: string | null
          best_score: number | null
          created_at: string | null
          games_played: number | null
          guest_fingerprint: string
          id: string
          longest_word: string | null
          total_score: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_color?: string | null
          avatar_emoji?: string | null
          best_score?: number | null
          created_at?: string | null
          games_played?: number | null
          guest_fingerprint: string
          id?: string
          longest_word?: string | null
          total_score?: number | null
          updated_at?: string | null
          username?: string
        }
        Update: {
          avatar_color?: string | null
          avatar_emoji?: string | null
          best_score?: number | null
          created_at?: string | null
          games_played?: number | null
          guest_fingerprint?: string
          id?: string
          longest_word?: string | null
          total_score?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          beta_notice_enabled: boolean
          beta_notice_message: string
          id: number
          updated_at: string
        }
        Insert: {
          beta_notice_enabled?: boolean
          beta_notice_message?: string
          id: number
          updated_at?: string
        }
        Update: {
          beta_notice_enabled?: boolean
          beta_notice_message?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      student_achievements: {
        Row: {
          achievement_id: string
          current_tier: string
          id: string
          is_pinned: boolean | null
          last_tier_unlock: string
          progress_value: number
          student_id: string
          unlocked_at: string
        }
        Insert: {
          achievement_id: string
          current_tier: string
          id?: string
          is_pinned?: boolean | null
          last_tier_unlock?: string
          progress_value?: number
          student_id: string
          unlocked_at?: string
        }
        Update: {
          achievement_id?: string
          current_tier?: string
          id?: string
          is_pinned?: boolean | null
          last_tier_unlock?: string
          progress_value?: number
          student_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "student_achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_duels: {
        Row: {
          board_state: Json | null
          challenger_id: string
          challenger_score: number | null
          classroom_id: string
          completed_at: string | null
          created_at: string
          duel_type: string
          expires_at: string | null
          id: string
          lesson_id: string
          opponent_id: string
          opponent_score: number | null
          started_at: string | null
          status: string
          winner_id: string | null
          xp_awarded: boolean | null
        }
        Insert: {
          board_state?: Json | null
          challenger_id: string
          challenger_score?: number | null
          classroom_id: string
          completed_at?: string | null
          created_at?: string
          duel_type: string
          expires_at?: string | null
          id?: string
          lesson_id: string
          opponent_id: string
          opponent_score?: number | null
          started_at?: string | null
          status?: string
          winner_id?: string | null
          xp_awarded?: boolean | null
        }
        Update: {
          board_state?: Json | null
          challenger_id?: string
          challenger_score?: number | null
          classroom_id?: string
          completed_at?: string | null
          created_at?: string
          duel_type?: string
          expires_at?: string | null
          id?: string
          lesson_id?: string
          opponent_id?: string
          opponent_score?: number | null
          started_at?: string | null
          status?: string
          winner_id?: string | null
          xp_awarded?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "student_duels_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "student_duels_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_duels_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_duels_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_duels_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "student_duels_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_duels_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "student_duels_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_lesson_progress: {
        Row: {
          assignment_id: string | null
          completed_at: string | null
          current_level: number | null
          current_streak: number
          id: string
          last_practice_date: string | null
          lesson_id: string
          longest_streak: number
          started_at: string | null
          student_id: string
          total_practice_sessions: number
          total_xp: number | null
          words_attempted: Json | null
          words_mastered: string[] | null
        }
        Insert: {
          assignment_id?: string | null
          completed_at?: string | null
          current_level?: number | null
          current_streak?: number
          id?: string
          last_practice_date?: string | null
          lesson_id: string
          longest_streak?: number
          started_at?: string | null
          student_id: string
          total_practice_sessions?: number
          total_xp?: number | null
          words_attempted?: Json | null
          words_mastered?: string[] | null
        }
        Update: {
          assignment_id?: string | null
          completed_at?: string | null
          current_level?: number | null
          current_streak?: number
          id?: string
          last_practice_date?: string | null
          lesson_id?: string
          longest_streak?: number
          started_at?: string | null
          student_id?: string
          total_practice_sessions?: number
          total_xp?: number | null
          words_attempted?: Json | null
          words_mastered?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "student_lesson_progress_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "lesson_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          assignment_type: string
          classroom_id: string
          created_at: string
          due_date: string | null
          id: string
          instructions: string | null
          lesson_id: string
          teacher_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          assignment_type?: string
          classroom_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          instructions?: string | null
          lesson_id: string
          teacher_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          assignment_type?: string
          classroom_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string
          teacher_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "teacher_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_pack_plays: {
        Row: {
          guest_fingerprint: string | null
          id: string
          pack_id: string | null
          played_at: string | null
          player_id: string | null
          total_score: number | null
          words_found_from_pack: number | null
        }
        Insert: {
          guest_fingerprint?: string | null
          id?: string
          pack_id?: string | null
          played_at?: string | null
          player_id?: string | null
          total_score?: number | null
          words_found_from_pack?: number | null
        }
        Update: {
          guest_fingerprint?: string | null
          id?: string
          pack_id?: string | null
          played_at?: string | null
          player_id?: string | null
          total_score?: number | null
          words_found_from_pack?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "word_pack_plays_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "ugc_word_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_pack_reports: {
        Row: {
          created_at: string | null
          id: string
          pack_id: string | null
          reason: string
          reporter_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          pack_id?: string | null
          reason: string
          reporter_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          pack_id?: string | null
          reason?: string
          reporter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_pack_reports_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "ugc_word_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_pack_upvotes: {
        Row: {
          pack_id: string
          player_id: string
        }
        Insert: {
          pack_id: string
          player_id: string
        }
        Update: {
          pack_id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_pack_upvotes_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "ugc_word_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_word_packs: {
        Row: {
          created_at: string | null
          creator_avatar: Json | null
          creator_display_name: string
          creator_id: string
          deleted_at: string | null
          description: string | null
          featured: boolean | null
          id: string
          is_public: boolean | null
          language: string
          moderation_status: string | null
          name: string
          play_count: number | null
          tags: string[] | null
          theme_emoji: string | null
          upvote_count: number | null
          word_count: number | null
          words: string[]
        }
        Insert: {
          created_at?: string | null
          creator_avatar?: Json | null
          creator_display_name: string
          creator_id: string
          deleted_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          is_public?: boolean | null
          language: string
          moderation_status?: string | null
          name: string
          play_count?: number | null
          tags?: string[] | null
          theme_emoji?: string | null
          upvote_count?: number | null
          word_count?: number | null
          words: string[]
        }
        Update: {
          created_at?: string | null
          creator_avatar?: Json | null
          creator_display_name?: string
          creator_id?: string
          deleted_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          is_public?: boolean | null
          language?: string
          moderation_status?: string | null
          name?: string
          play_count?: number | null
          tags?: string[] | null
          theme_emoji?: string | null
          upvote_count?: number | null
          word_count?: number | null
          words?: string[]
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          daily_challenge: boolean
          friend_invites: boolean
          push_enabled: boolean
          streak_warning: boolean
          updated_at: string
          user_id: string
          weekly_summary: boolean
        }
        Insert: {
          created_at?: string
          daily_challenge?: boolean
          friend_invites?: boolean
          push_enabled?: boolean
          streak_warning?: boolean
          updated_at?: string
          user_id: string
          weekly_summary?: boolean
        }
        Update: {
          created_at?: string
          daily_challenge?: boolean
          friend_invites?: boolean
          push_enabled?: boolean
          streak_warning?: boolean
          updated_at?: string
          user_id?: string
          weekly_summary?: boolean
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string | null
          dismissed: boolean | null
          dismissed_at: string | null
          id: string
          image_url: string | null
          notification_type: string
          push_error: string | null
          push_sent: boolean | null
          push_sent_at: string | null
          read: boolean | null
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          sender_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          image_url?: string | null
          notification_type: string
          push_error?: string | null
          push_sent?: boolean | null
          push_sent_at?: string | null
          read?: boolean | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sender_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          image_url?: string | null
          notification_type?: string
          push_error?: string | null
          push_sent?: boolean | null
          push_sent_at?: string | null
          read?: boolean | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sender_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_sender_profile_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "user_notifications_sender_profile_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "user_notifications_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_tokens: {
        Row: {
          created_at: string | null
          device_id: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vault_board_scores: {
        Row: {
          id: string
          played_at: string | null
          player_id: string
          score: number
          vault_board_id: string
          words_found: number
        }
        Insert: {
          id?: string
          played_at?: string | null
          player_id: string
          score?: number
          vault_board_id: string
          words_found?: number
        }
        Update: {
          id?: string
          played_at?: string | null
          player_id?: string
          score?: number
          vault_board_id?: string
          words_found?: number
        }
        Relationships: [
          {
            foreignKeyName: "vault_board_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "vault_board_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_board_scores_vault_board_id_fkey"
            columns: ["vault_board_id"]
            isOneToOne: false
            referencedRelation: "vault_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_boards: {
        Row: {
          board_name: string
          closes_at: string
          created_at: string | null
          grid: Json
          id: string
          is_active: boolean | null
          language: string
          opens_at: string
        }
        Insert: {
          board_name: string
          closes_at: string
          created_at?: string | null
          grid: Json
          id?: string
          is_active?: boolean | null
          language?: string
          opens_at: string
        }
        Update: {
          board_name?: string
          closes_at?: string
          created_at?: string | null
          grid?: Json
          id?: string
          is_active?: boolean | null
          language?: string
          opens_at?: string
        }
        Relationships: []
      }
      vocabulary_lessons: {
        Row: {
          classroom_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          language: string
          name: string
          source_game_code: string | null
          teacher_id: string
          updated_at: string | null
          words: Json
        }
        Insert: {
          classroom_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          language?: string
          name: string
          source_game_code?: string | null
          teacher_id: string
          updated_at?: string | null
          words?: Json
        }
        Update: {
          classroom_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          language?: string
          name?: string
          source_game_code?: string | null
          teacher_id?: string
          updated_at?: string | null
          words?: Json
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_lessons_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      web_vitals: {
        Row: {
          connection_type: string | null
          country_code: string | null
          created_at: string
          device_type: string | null
          id: string
          metadata: Json | null
          metric_name: string
          metric_rating: string
          metric_value: number
          navigation_type: string | null
          page_path: string
          page_url: string
          player_id: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          connection_type?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_rating: string
          metric_value: number
          navigation_type?: string | null
          page_path: string
          page_url: string
          player_id?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          connection_type?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_rating?: string
          metric_value?: number
          navigation_type?: string | null
          page_path?: string
          page_url?: string
          player_id?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "web_vitals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "web_vitals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_challenge_scores: {
        Row: {
          id: string
          longest_word: string
          player_name: string
          score: number
          submitted_at: string | null
          user_id: string
          week_id: string
          words_found: number
        }
        Insert: {
          id?: string
          longest_word?: string
          player_name?: string
          score?: number
          submitted_at?: string | null
          user_id: string
          week_id: string
          words_found?: number
        }
        Update: {
          id?: string
          longest_word?: string
          player_name?: string
          score?: number
          submitted_at?: string | null
          user_id?: string
          week_id?: string
          words_found?: number
        }
        Relationships: []
      }
      weekly_quests: {
        Row: {
          bonus_rewards: Json | null
          claimed: boolean | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          current_progress: Json | null
          description: string
          id: string
          player_id: string
          quest_type: string
          requirements: Json
          title: string
          week_start: string
          xp_reward: number
        }
        Insert: {
          bonus_rewards?: Json | null
          claimed?: boolean | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_progress?: Json | null
          description: string
          id?: string
          player_id: string
          quest_type: string
          requirements: Json
          title: string
          week_start: string
          xp_reward: number
        }
        Update: {
          bonus_rewards?: Json | null
          claimed?: boolean | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_progress?: Json | null
          description?: string
          id?: string
          player_id?: string
          quest_type?: string
          requirements?: Json
          title?: string
          week_start?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_quests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "weekly_quests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wikipedia_word_candidates: {
        Row: {
          created_at: string | null
          fetch_date: string
          id: string
          interestingness_score: number | null
          language: string
          source_article_title: string | null
          source_article_url: string | null
          validation_status: string | null
          word: string
        }
        Insert: {
          created_at?: string | null
          fetch_date: string
          id?: string
          interestingness_score?: number | null
          language: string
          source_article_title?: string | null
          source_article_url?: string | null
          validation_status?: string | null
          word: string
        }
        Update: {
          created_at?: string | null
          fetch_date?: string
          id?: string
          interestingness_score?: number | null
          language?: string
          source_article_title?: string | null
          source_article_url?: string | null
          validation_status?: string | null
          word?: string
        }
        Relationships: []
      }
      word_club_members: {
        Row: {
          best_word_this_week: string | null
          club_id: string
          games_this_week: number
          id: string
          joined_at: string
          role: string
          total_xp: number
          user_id: string
          weekly_xp: number
        }
        Insert: {
          best_word_this_week?: string | null
          club_id: string
          games_this_week?: number
          id?: string
          joined_at?: string
          role?: string
          total_xp?: number
          user_id: string
          weekly_xp?: number
        }
        Update: {
          best_word_this_week?: string | null
          club_id?: string
          games_this_week?: number
          id?: string
          joined_at?: string
          role?: string
          total_xp?: number
          user_id?: string
          weekly_xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "word_club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "word_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      word_clubs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invite_code: string
          is_public: boolean
          max_members: number
          name: string
          owner_id: string
          weekly_xp_total: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          is_public?: boolean
          max_members?: number
          name: string
          owner_id: string
          weekly_xp_total?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          is_public?: boolean
          max_members?: number
          name?: string
          owner_id?: string
          weekly_xp_total?: number
        }
        Relationships: []
      }
      word_pacts: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          last_reset_date: string | null
          player1_id: string
          player1_played_today: boolean | null
          player2_id: string
          player2_played_today: boolean | null
          streak: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          last_reset_date?: string | null
          player1_id: string
          player1_played_today?: boolean | null
          player2_id: string
          player2_played_today?: boolean | null
          streak?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          last_reset_date?: string | null
          player1_id?: string
          player1_played_today?: boolean | null
          player2_id?: string
          player2_played_today?: boolean | null
          streak?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "word_pacts_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "word_pacts_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_pacts_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "word_pacts_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      word_review_state: {
        Row: {
          created_at: string
          ease_factor: number
          id: string
          interval: number
          last_review_date: string
          lesson_id: string
          next_review_date: string
          repetitions: number
          student_id: string
          updated_at: string
          word: string
        }
        Insert: {
          created_at?: string
          ease_factor?: number
          id?: string
          interval?: number
          last_review_date?: string
          lesson_id: string
          next_review_date?: string
          repetitions?: number
          student_id: string
          updated_at?: string
          word: string
        }
        Update: {
          created_at?: string
          ease_factor?: number
          id?: string
          interval?: number
          last_review_date?: string
          lesson_id?: string
          next_review_date?: string
          repetitions?: number
          student_id?: string
          updated_at?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_review_state_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      word_scores: {
        Row: {
          dislikes_count: number | null
          first_submitter: string | null
          first_voted_at: string | null
          id: string
          is_potentially_valid: boolean | null
          language: string
          last_voted_at: string | null
          likes_count: number | null
          net_score: number | null
          word: string
        }
        Insert: {
          dislikes_count?: number | null
          first_submitter?: string | null
          first_voted_at?: string | null
          id?: string
          is_potentially_valid?: boolean | null
          language: string
          last_voted_at?: string | null
          likes_count?: number | null
          net_score?: number | null
          word: string
        }
        Update: {
          dislikes_count?: number | null
          first_submitter?: string | null
          first_voted_at?: string | null
          id?: string
          is_potentially_valid?: boolean | null
          language?: string
          last_voted_at?: string | null
          likes_count?: number | null
          net_score?: number | null
          word?: string
        }
        Relationships: []
      }
      word_votes: {
        Row: {
          created_at: string | null
          game_code: string
          guest_id: string | null
          id: string
          is_bot_word: boolean | null
          language: string
          user_id: string | null
          vote_type: string
          word: string
        }
        Insert: {
          created_at?: string | null
          game_code: string
          guest_id?: string | null
          id?: string
          is_bot_word?: boolean | null
          language: string
          user_id?: string | null
          vote_type: string
          word: string
        }
        Update: {
          created_at?: string | null
          game_code?: string
          guest_id?: string | null
          id?: string
          is_bot_word?: boolean | null
          language?: string
          user_id?: string | null
          vote_type?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "word_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      bot_words_for_review: {
        Row: {
          dislike_count: number | null
          first_reported: string | null
          game_codes: string[] | null
          language: string | null
          last_reported: string | null
          like_count: number | null
          total_votes: number | null
          word: string | null
        }
        Relationships: []
      }
      buzz_alltime_leaderboard: {
        Row: {
          avatar_color: string | null
          avatar_emoji: string | null
          avatar_image: string | null
          avg_score: number | null
          current_streak: number | null
          longest_streak: number | null
          player_id: string | null
          rank: number | null
          total_challenges_completed: number | null
          total_score: number | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buzz_streaks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "buzz_streaks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_board_creator_stats: {
        Row: {
          average_rating: number | null
          boards_created: number | null
          creator_id: string | null
          featured_count: number | null
          total_plays: number | null
          total_ratings: number | null
        }
        Relationships: []
      }
      community_board_leaderboard: {
        Row: {
          board_id: string | null
          completed_at: string | null
          custom_avatar: Json | null
          display_name: string | null
          longest_word: string | null
          player_id: string | null
          rank: number | null
          score: number | null
          time_seconds: number | null
          word_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_board_plays_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "community_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_puzzle_leaderboard: {
        Row: {
          attempts_used: number | null
          avatar_color: string | null
          avatar_emoji: string | null
          avatar_image: string | null
          completed_at: string | null
          country_code: string | null
          display_name: string | null
          efficiency_score: number | null
          guest_fingerprint: string | null
          life_remaining: number | null
          player_id: string | null
          profile_picture_url: string | null
          puzzle_code: string | null
          rank_position: number | null
          solved: boolean | null
          words_discovered: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_puzzle_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "custom_puzzle_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_puzzle_stats: {
        Row: {
          avg_attempts_solved: number | null
          avg_efficiency_score: number | null
          avg_life_remaining: number | null
          avg_words_discovered: number | null
          beat_creator_count: number | null
          created_at: string | null
          creator_display_name: string | null
          creator_efficiency_score: number | null
          creator_id: string | null
          language: string | null
          max_efficiency_score: number | null
          puzzle_code: string | null
          solve_rate: number | null
          solved_in_1: number | null
          solved_in_10: number | null
          solved_in_2: number | null
          solved_in_3: number | null
          solved_in_4: number | null
          solved_in_5: number | null
          solved_in_6: number | null
          solved_in_7: number | null
          solved_in_8: number | null
          solved_in_9: number | null
          target_word: string | null
          total_attempts: number | null
          total_solved: number | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_puzzles_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "custom_puzzles_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_buzz_leaderboard: {
        Row: {
          avatar_color: string | null
          avatar_emoji: string | null
          avatar_image: string | null
          challenge_id: number | null
          completion_time_seconds: number | null
          language: string | null
          player_id: string | null
          puzzle_date: string | null
          rank: number | null
          region: string | null
          score: number | null
          submitted_at: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_buzz_attempts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_puzzle_leaderboard: {
        Row: {
          avatar_color: string | null
          avatar_emoji: string | null
          avatar_image: string | null
          completed_at: string | null
          country_code: string | null
          custom_avatar: Json | null
          display_name: string | null
          guest_fingerprint: string | null
          language: string | null
          longest_word: string | null
          player_id: string | null
          profile_picture_url: string | null
          puzzle_date: string | null
          puzzle_number: number | null
          rank_position: number | null
          score: number | null
          time_seconds: number | null
          word_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_puzzle_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "daily_puzzle_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_word_hunt_leaderboard: {
        Row: {
          attempts_used: number | null
          avatar_color: string | null
          avatar_emoji: string | null
          avatar_image: string | null
          completed_at: string | null
          country_code: string | null
          custom_avatar: Json | null
          display_name: string | null
          efficiency_score: number | null
          guest_fingerprint: string | null
          language: string | null
          life_remaining: number | null
          player_id: string | null
          profile_picture_url: string | null
          puzzle_date: string | null
          puzzle_number: number | null
          rank_position: number | null
          solved: boolean | null
          words_discovered: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_word_hunt_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "daily_word_hunt_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_word_hunt_stats: {
        Row: {
          authenticated_players: number | null
          authenticated_solved: number | null
          avg_attempts_solved: number | null
          avg_efficiency_score: number | null
          avg_life_remaining: number | null
          avg_words_discovered: number | null
          failed_count: number | null
          guest_players: number | null
          guest_solved: number | null
          language: string | null
          max_efficiency_score: number | null
          puzzle_date: string | null
          puzzle_number: number | null
          solve_rate: number | null
          solved_count: number | null
          solved_in_1: number | null
          solved_in_10: number | null
          solved_in_2: number | null
          solved_in_3: number | null
          solved_in_4: number | null
          solved_in_5: number | null
          solved_in_6: number | null
          solved_in_7: number | null
          solved_in_8: number | null
          solved_in_9: number | null
          total_players: number | null
        }
        Relationships: []
      }
      daily_word_wheel_leaderboard: {
        Row: {
          avatar_color: string | null
          avatar_emoji: string | null
          avatar_image: string | null
          center_letter: string | null
          completed_at: string | null
          country_code: string | null
          custom_avatar: Json | null
          display_name: string | null
          guest_fingerprint: string | null
          language: string | null
          longest_word: string | null
          player_id: string | null
          profile_picture_url: string | null
          puzzle_date: string | null
          puzzle_number: number | null
          rank_position: number | null
          score: number | null
          time_seconds: number | null
          word_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_word_wheel_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "daily_word_wheel_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_conversations: {
        Row: {
          conversation_id: string | null
          last_message: string | null
          last_message_at: string | null
          last_message_read: boolean | null
          recipient_id: string | null
          sender_id: string | null
          unread_for_recipient: number | null
          unread_for_sender: number | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "friend_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "friend_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_cheat_signals: {
        Row: {
          avg_score: number | null
          avg_words: number | null
          games_played: number | null
          max_score: number | null
          max_words: number | null
          player_id: string | null
          score_stddev: number | null
          score_zscore: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "game_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_dau_mau: {
        Row: {
          dau: number | null
          day: string | null
          games: number | null
        }
        Relationships: []
      }
      single_player_top_scores: {
        Row: {
          avatar_color: string | null
          avatar_emoji: string | null
          best_score: number | null
          games_played: number | null
          guest_fingerprint: string | null
          longest_word: string | null
          rank_position: number | null
          total_score: number | null
          updated_at: string | null
          username: string | null
        }
        Relationships: []
      }
      student_practice_progress: {
        Row: {
          flashcard_sessions: number | null
          last_practice_at: string | null
          lesson_id: string | null
          solo_board_sessions: number | null
          student_id: string | null
          total_flashcards_correct: number | null
          total_flashcards_reviewed: number | null
          total_practice_score: number | null
          total_practice_time_seconds: number | null
          total_vocabulary_words_found: number | null
          warmup_sessions: number | null
          word_list_views: number | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      word_hunt_alltime_leaderboard: {
        Row: {
          avatar_color: string | null
          avatar_emoji: string | null
          avatar_image: string | null
          avg_attempts: number | null
          best_efficiency: number | null
          country_code: string | null
          custom_avatar: Json | null
          display_name: string | null
          games_won: number | null
          guest_fingerprint: string | null
          language: string | null
          last_played_at: string | null
          player_id: string | null
          player_identifier: string | null
          profile_picture_url: string | null
          rank_position: number | null
          total_efficiency_score: number | null
          total_games: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_word_hunt_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "daily_word_hunt_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      word_wheel_alltime_leaderboard: {
        Row: {
          avatar_color: string | null
          avatar_emoji: string | null
          avatar_image: string | null
          avg_attempts: number | null
          best_efficiency: number | null
          country_code: string | null
          custom_avatar: Json | null
          display_name: string | null
          games_won: number | null
          guest_fingerprint: string | null
          language: string | null
          last_played_at: string | null
          player_id: string | null
          player_identifier: string | null
          profile_picture_url: string | null
          rank_position: number | null
          total_efficiency_score: number | null
          total_games: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_word_wheel_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "daily_buzz_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "daily_word_wheel_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_league_xp: {
        Args: { p_user_id: string; p_xp_amount: number }
        Returns: Json
      }
      admin_activity_stats: { Args: never; Returns: Json }
      admin_bulk_ban_players: {
        Args: { p_admin_id: string; p_player_ids: string[]; p_reason: string }
        Returns: Json
      }
      admin_cohort_retention: {
        Args: { weeks?: number }
        Returns: {
          cohort_size: number
          cohort_week: string
          retained: number
          retention_pct: number
          week_offset: number
        }[]
      }
      admin_engagement_funnel: { Args: never; Returns: Json }
      admin_language_breakdown: { Args: never; Returns: Json }
      admin_overview_stats: { Args: never; Returns: Json }
      apply_prestige: {
        Args: { p_expected_prestige: number; p_player_id: string }
        Returns: {
          new_multiplier: number
          new_prestige_level: number
          new_title: string
          rows_affected: number
        }[]
      }
      award_coins: {
        Args: {
          p_amount: number
          p_metadata?: Json
          p_player_id: string
          p_reason: string
        }
        Returns: number
      }
      block_word_bank_word: {
        Args: {
          p_admin_id: string
          p_language: string
          p_reason?: string
          p_word: string
        }
        Returns: boolean
      }
      bulk_update_word_bank_validation: {
        Args: { p_validation_status: string; p_word_ids: string[] }
        Returns: number
      }
      calculate_brain_tier: { Args: { score: number }; Returns: string }
      calculate_comeback_bonus: { Args: { days_away: number }; Returns: Json }
      calculate_lesson_mastery: {
        Args: { p_lesson_id: string; p_student_id: string }
        Returns: string
      }
      calculate_player_level: { Args: { total_xp: number }; Returns: number }
      calculate_tier_progress: { Args: { score: number }; Returns: number }
      can_access_feature_flag: {
        Args: { p_flag_name: string; p_player_id: string }
        Returns: boolean
      }
      claim_admin_gift: { Args: { gift_id: string }; Returns: Json }
      claim_guest_stats: {
        Args: { p_token_hash: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_deleted_messages: { Args: never; Returns: number }
      decrement_pack_upvote: { Args: { pack_id: string }; Returns: undefined }
      dismiss_all_notifications: { Args: never; Returns: Json }
      expire_old_challenges: { Args: never; Returns: number }
      expire_stale_friend_requests: { Args: never; Returns: number }
      generate_join_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_active_prompt_template: {
        Args: { p_language?: string; p_template_type: string }
        Returns: {
          description: string
          id: number
          language: string
          name: string
          placeholders: Json
          template_content: string
          template_type: string
          version: number
        }[]
      }
      get_auto_promotion_candidates: {
        Args: { p_limit?: number; p_min_submissions?: number }
        Returns: {
          id: string
          language: string
          reason: string
          submission_count: number
          word: string
        }[]
      }
      get_leaderboard: {
        Args: { p_limit?: number; p_offset?: number; p_order_by?: string }
        Returns: {
          avatar_color: string
          avatar_emoji: string
          games_played: number
          games_won: number
          player_id: string
          rank_position: number
          ranked_mmr: number
          total_score: number
          username: string
        }[]
      }
      get_milog_verification_queue: {
        Args: {
          p_batch_size?: number
          p_max_attempts?: number
          p_min_submissions?: number
        }
        Returns: {
          id: string
          milog_attempts: number
          submission_count: number
          word: string
        }[]
      }
      get_milog_verified_words: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          milog_url: string
          milog_verified_at: string
          submission_count: number
          word: string
        }[]
      }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_color: string
          avatar_emoji: string
          display_name: string
          id: string
          ranked_mmr: number
          total_games: number
          total_score: number
          username: string
        }[]
      }
      get_or_create_default_template: {
        Args: { p_lesson_id: string; p_teacher_id: string }
        Returns: string
      }
      get_or_create_difficulty: {
        Args: { p_game_mode?: string; p_user_id: string }
        Returns: {
          difficulty_offset: number
          game_mode: string
          id: string
          last_adjustment_at: string
          recent_games: number
          recent_wins: number
          updated_at: string
          user_id: string
          win_rate: number | null
        }
        SetofOptions: {
          from: "*"
          to: "difficulty_tracking"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_player_game_history: {
        Args: { p_limit?: number; p_offset?: number; p_player_id: string }
        Returns: {
          created_at: string
          game_code: string
          is_ranked: boolean
          language: string
          longest_word: string
          placement: number
          score: number
          time_played: number
          word_count: number
        }[]
      }
      get_player_stats_summary: {
        Args: { p_player_id: string }
        Returns: {
          avg_score: number
          avg_words: number
          best_score: number
          best_word_count: number
          ranked_win_rate: number
          total_games: number
          total_score: number
          total_words: number
          win_rate: number
        }[]
      }
      get_random_words_from_bank: {
        Args: {
          p_count?: number
          p_exclude_words?: string[]
          p_language: string
          p_min_days_since_used?: number
        }
        Returns: {
          category: string
          difficulty_score: number
          source: string
          word: string
        }[]
      }
      get_streak_bonus_multiplier: { Args: { streak: number }; Returns: number }
      get_unread_notification_count: { Args: never; Returns: number }
      get_user_rank: {
        Args: { p_user_id: string }
        Returns: {
          games_played: number
          rank_position: number
          ranked_mmr: number
          total_players: number
          total_score: number
        }[]
      }
      get_web_vitals_stats: {
        Args: { time_range_minutes?: number }
        Returns: {
          avg_value: number
          good_count: number
          metric_name: string
          needs_improvement_count: number
          p75_value: number
          p95_value: number
          poor_count: number
          total_count: number
        }[]
      }
      has_lesson_access: {
        Args: { p_lesson_id: string; p_user_id: string }
        Returns: boolean
      }
      increment_bot_word_usage: {
        Args: { p_language: string; p_word: string }
        Returns: undefined
      }
      increment_ghost_rival_score: {
        Args: { p_player_id: string; p_points: number; p_week_start: string }
        Returns: {
          new_score: number
        }[]
      }
      increment_pack_play: { Args: { pack_id: string }; Returns: undefined }
      increment_pack_upvote: { Args: { pack_id: string }; Returns: undefined }
      increment_player_xp: {
        Args: { p_player_id: string; p_xp_amount: number }
        Returns: {
          new_level: number
          new_lifetime_xp: number
          new_total_xp: number
          xp_granted: number
        }[]
      }
      increment_profile_xp: {
        Args: { p_player_id: string; p_xp_amount: number }
        Returns: {
          new_level: number
          new_lifetime_xp: number
          new_total_xp: number
          xp_granted: number
        }[]
      }
      increment_retry_token_use_count: {
        Args: { token_id: string }
        Returns: undefined
      }
      is_classroom_member: {
        Args: { p_classroom_id: string; p_user_id: string }
        Returns: boolean
      }
      is_classroom_owner: {
        Args: { p_classroom_id: string; p_user_id: string }
        Returns: boolean
      }
      is_lesson_owner: {
        Args: { p_lesson_id: string; p_user_id: string }
        Returns: boolean
      }
      is_profile_owner: { Args: { profile_id: string }; Returns: boolean }
      is_teacher_of_student: {
        Args: { p_student_id: string }
        Returns: boolean
      }
      lookup_classroom_by_join_code: {
        Args: { p_join_code: string }
        Returns: {
          id: string
          language: string
          name: string
        }[]
      }
      mark_all_notifications_read: { Args: never; Returns: Json }
      mark_word_auto_promoted: {
        Args: { p_source: string; p_word_id: string }
        Returns: undefined
      }
      mark_word_bank_used: {
        Args: { p_language: string; p_word: string }
        Returns: undefined
      }
      mark_word_promoted_to_dictionary: {
        Args: { p_word_id: string }
        Returns: undefined
      }
      process_gift: {
        Args: {
          p_amount: number
          p_cost: number
          p_gift_type: string
          p_recipient_id: string
          p_sender_id: string
          p_xp: number
        }
        Returns: undefined
      }
      purchase_collectible: {
        Args: { p_collectible_id: string; p_player_id: string }
        Returns: Json
      }
      record_invalid_word_submission: {
        Args: { p_language: string; p_reason?: string; p_word: string }
        Returns: undefined
      }
      record_level_attempt: {
        Args: {
          p_is_completion?: boolean
          p_level: number
          p_objective_progress: Json
          p_score: number
          p_time_remaining: number
          p_user_id: string
          p_words: number
          p_world: number
        }
        Returns: {
          attempt_count: number
          best_score: number
          best_time_remaining: number
          best_words: number
          consecutive_failures: number
          first_attempt_at: string
          id: string
          last_attempt_at: string
          level: number
          objective_progress: Json
          user_id: string
          world: number
        }
        SetofOptions: {
          from: "*"
          to: "level_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_player_wrong_word: {
        Args: { p_language?: string; p_word: string }
        Returns: undefined
      }
      record_word_appeal: {
        Args: { p_language: string; p_word: string }
        Returns: undefined
      }
      reset_weekly_club_xp: { Args: never; Returns: undefined }
      search_players: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_color: string
          avatar_emoji: string
          player_id: string
          ranked_mmr: number
          similarity: number
          total_score: number
          username: string
        }[]
      }
      sync_coins: {
        Args: {
          p_amount: number
          p_metadata?: Json
          p_reason: string
          p_user_id: string
        }
        Returns: {
          error_message: string
          new_balance: number
          success: boolean
        }[]
      }
      unblock_word_bank_word: {
        Args: { p_language: string; p_word: string }
        Returns: boolean
      }
      update_buzz_streak: {
        Args: { p_completion_date: string; p_player_id: string }
        Returns: undefined
      }
      update_difficulty_after_game: {
        Args: { p_game_mode: string; p_user_id: string; p_won: boolean }
        Returns: Json
      }
      update_milog_verification: {
        Args: {
          p_error?: string
          p_rejected_reason?: string
          p_status: string
          p_url?: string
          p_word_id: string
          p_word_type?: string
        }
        Returns: undefined
      }
      update_player_stats_and_xp: {
        Args: { p_player_id: string; p_stats: Json; p_xp_amount: number }
        Returns: {
          new_level: number
          new_lifetime_xp: number
          new_total_xp: number
          xp_granted: number
        }[]
      }
      update_profile_stats: {
        Args: {
          p_achievements?: string[]
          p_is_ranked: boolean
          p_longest_word: string
          p_placement: number
          p_player_id: string
          p_score: number
          p_time_played: number
          p_total_players: number
          p_word_count: number
        }
        Returns: {
          achievement_counts: Json | null
          admin_role: string | null
          avatar_color: string | null
          avatar_config: Json | null
          avatar_emoji: string | null
          avatar_image: string | null
          ban_reason: string | null
          banned_until: string | null
          blast_access: boolean
          casual_games: number | null
          casual_wins: number | null
          country_code: string | null
          created_at: string | null
          current_level: number | null
          daily_email_subscribed: boolean | null
          display_name: string | null
          email_unsubscribe_token: string | null
          equipped_cosmetics: Json | null
          free_hints_available: number | null
          gift_modal_dismissed_at: string | null
          has_customized_profile: boolean | null
          id: string
          is_admin: boolean | null
          is_banned: boolean
          language: string | null
          last_daily_email_sent_at: string | null
          last_daily_push_sent_at: string | null
          last_game_at: string | null
          last_reengagement_email_sent_at: string | null
          last_seen_at: string | null
          lifetime_coins_earned: number | null
          lifetime_xp: number | null
          longest_word: string | null
          longest_word_length: number | null
          mp_best_streak_classic: number | null
          mp_best_streak_wordhunt: number | null
          mp_win_streak_classic: number | null
          mp_win_streak_wordhunt: number | null
          peak_mmr: number | null
          player_title: string | null
          practice_graduated_at: string | null
          premium_avatar_parts: Json | null
          prestige_level: number | null
          prestige_multiplier: number | null
          prestige_unlocks: Json | null
          profile_picture_provider: string | null
          profile_picture_url: string | null
          purchased_cosmetics: string[] | null
          ranked_games: number | null
          ranked_mmr: number | null
          ranked_wins: number | null
          referral_code: string | null
          referral_count: number | null
          referral_reward_xp: number | null
          referred_by: string | null
          referrer: string | null
          season_peak_tier: Json | null
          streak_freeze_count: number | null
          timezone: string | null
          total_coins: number | null
          total_games: number | null
          total_hints_used: number | null
          total_score: number | null
          total_time_played: number | null
          total_words: number | null
          total_xp: number | null
          unique_days_played: number | null
          updated_at: string | null
          user_role: Database["public"]["Enums"]["user_role"] | null
          username: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_ranked_mmr: {
        Args: {
          p_placement: number
          p_player_id: string
          p_total_players: number
        }
        Returns: {
          mmr_change: number
          new_mmr: number
          old_mmr: number
        }[]
      }
      update_word_bank_validation_status: {
        Args: {
          p_language: string
          p_validation_status: string
          p_word: string
        }
        Returns: boolean
      }
      upsert_level_completion: {
        Args: {
          p_level: number
          p_score: number
          p_stars: number
          p_user_id: string
          p_words: number
          p_world: number
        }
        Returns: {
          best_score: number | null
          best_words: number | null
          completed_at: string | null
          id: string
          level: number
          stars: number | null
          user_id: string
          world: number
        }
        SetofOptions: {
          from: "*"
          to: "level_completions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_push_token: {
        Args: { p_device_id?: string; p_platform: string; p_token: string }
        Returns: Json
      }
      xp_for_level: { Args: { target_level: number }; Returns: number }
    }
    Enums: {
      curriculum_subject:
        | "english"
        | "hebrew"
        | "science"
        | "math"
        | "history"
        | "geography"
        | "general"
      grade_level:
        | "grade_1"
        | "grade_2"
        | "grade_3"
        | "grade_4"
        | "grade_5"
        | "grade_6"
        | "grade_7"
        | "grade_8"
        | "grade_9"
        | "grade_10"
        | "grade_11"
        | "grade_12"
      user_role: "student" | "teacher" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      curriculum_subject: [
        "english",
        "hebrew",
        "science",
        "math",
        "history",
        "geography",
        "general",
      ],
      grade_level: [
        "grade_1",
        "grade_2",
        "grade_3",
        "grade_4",
        "grade_5",
        "grade_6",
        "grade_7",
        "grade_8",
        "grade_9",
        "grade_10",
        "grade_11",
        "grade_12",
      ],
      user_role: ["student", "teacher", "admin"],
    },
  },
} as const

