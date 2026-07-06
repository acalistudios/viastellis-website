/**
 * Supabase database type definitions — matches schema.sql + migrations.
 *
 * NOTE: modern @supabase/supabase-js (2.x) requires each table to declare a
 * `Relationships` array and the schema to expose `Enums`/`CompositeTypes`.
 * If those are missing, PostgREST's type helpers silently resolve to `never`
 * (which is what caused the prior build errors). Keep this shape intact.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          subscription_tier: 'free' | 'premium'
          credits_remaining: number
          default_horoscope_lens: 'western_sun' | 'vedic_moon' | 'vedic_sun'
          chart_system: 'vedic' | 'western'
          stella_persona: 'stoic' | 'sassy' | 'warm'
          is_banned: boolean
          ban_reason: string | null
          stripe_customer_id: string | null
          subscription_status:
            | 'active'
            | 'trialing'
            | 'past_due'
            | 'canceled'
            | 'incomplete'
            | null
          subscription_price_id: string | null
          subscription_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; email: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
        Relationships: []
      }
      user_personalization: {
        Row: {
          user_id: string
          personalization_mode: 'chart_only' | 'personalized'
          pronouns: 'she' | 'he' | 'they' | 'prefer_not' | null
          focus_areas: string[]
          relationship_status: string | null
          job_status: string | null
          kids: string | null
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['user_personalization']['Row']> & { user_id: string }
        Update: Partial<Database['public']['Tables']['user_personalization']['Row']>
        Relationships: []
      }
      stella_memories: {
        Row: {
          id: string
          user_id: string
          note: string
          source: 'intake' | 'chat'
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['stella_memories']['Row']> & { user_id: string; note: string }
        Update: Partial<Database['public']['Tables']['stella_memories']['Row']>
        Relationships: []
      }
      birth_charts: {
        Row: {
          id: string
          user_id: string
          label: string
          is_primary: boolean
          name: string
          birth_date: string
          birth_time: string | null
          time_unknown: boolean
          city: string
          country: string
          latitude: number
          longitude: number
          timezone: string
          chart_data: Json | null
          calculated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['birth_charts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['birth_charts']['Row']>
        Relationships: []
      }
      usage_ledger: {
        Row: {
          id: string
          user_id: string
          action: 'stella_chat' | 'compatibility_report' | 'decision_report' | 'transit_summary'
          credits_debited: number
          status: 'success' | 'failed' | 'refunded'
          metadata: Json | null
          created_at: string
        }
        // Written server-side only; clients can read but never write.
        Insert: never
        Update: never
        Relationships: []
      }
      credit_purchases: {
        Row: {
          id: string
          user_id: string
          source: 'subscription' | 'pack' | 'trial' | 'manual' | 'refund'
          credits_granted: number
          amount_cents: number | null
          currency: string | null
          stripe_event_id: string | null
          metadata: Json | null
          created_at: string
        }
        // Written server-side only (via grant_credits); clients read their own rows.
        Insert: never
        Update: never
        Relationships: []
      }
      compatibility_reports: {
        Row: {
          id: string
          user_id: string
          chart_a_id: string
          chart_b_id: string
          vibe_score: number | null
          summary: string | null
          strengths: string[] | null
          tensions: string[] | null
          full_report: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['compatibility_reports']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['compatibility_reports']['Row']>
        Relationships: []
      }
      journal_entries: {
        Row: {
          id: string
          user_id: string
          body: string
          mood: string | null
          sky_context: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['journal_entries']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['journal_entries']['Row']>
        Relationships: []
      }
      decision_reports: {
        Row: {
          id: string
          user_id: string
          chart_id: string
          question: string
          answer: 'green_light' | 'caution' | 'reflect'
          reasoning: string | null
          transits: string[] | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['decision_reports']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['decision_reports']['Row']>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      debit_credit: {
        Args: { p_user_id: string; p_action: string }
        Returns: boolean
      }
      refund_credit: {
        Args: { p_user_id: string; p_ledger_id: string }
        Returns: undefined
      }
      grant_credits: {
        Args: {
          p_user_id: string
          p_credits: number
          p_source: string
          p_stripe_event_id?: string
          p_amount_cents?: number
          p_metadata?: Json
        }
        Returns: number
      }
      set_subscription: {
        Args: {
          p_user_id: string
          p_tier: string
          p_status: string
          p_price_id?: string
          p_period_end?: string
          p_customer_id?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
