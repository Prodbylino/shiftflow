export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone_number: string | null
          phone_verified: boolean
          sms_notifications_enabled: boolean
          voice_call_enabled: boolean
          notification_minutes_before: number
          early_reminder_minutes_before: number | null
          first_reminder_enabled: boolean
          timezone: string
          preferred_language: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          sms_notifications_enabled?: boolean
          voice_call_enabled?: boolean
          notification_minutes_before?: number
          early_reminder_minutes_before?: number | null
          first_reminder_enabled?: boolean
          timezone?: string
          preferred_language?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          sms_notifications_enabled?: boolean
          voice_call_enabled?: boolean
          notification_minutes_before?: number
          early_reminder_minutes_before?: number | null
          first_reminder_enabled?: boolean
          timezone?: string
          preferred_language?: string
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          hourly_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          hourly_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          hourly_rate?: number
          created_at?: string
          updated_at?: string
        }
      }
      shifts: {
        Row: {
          id: string
          user_id: string
          organization_id: string | null
          title: string
          date: string
          end_date: string | null
          start_time: string
          end_time: string
          notes: string | null
          custom_income: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id?: string | null
          title: string
          date: string
          end_date?: string | null
          start_time: string
          end_time: string
          notes?: string | null
          custom_income?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string | null
          title?: string
          date?: string
          end_date?: string | null
          start_time?: string
          end_time?: string
          notes?: string | null
          custom_income?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      recurrence_patterns: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          day_of_week: number
          start_time: string
          end_time: string
          confidence_score: number
          occurrence_count: number
          last_detected_at: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          day_of_week: number
          start_time: string
          end_time: string
          confidence_score?: number
          occurrence_count?: number
          last_detected_at?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          confidence_score?: number
          occurrence_count?: number
          last_detected_at?: string
          is_active?: boolean
          created_at?: string
        }
      }
      phone_verifications: {
        Row: {
          id: string
          user_id: string
          phone_number: string
          otp_code: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          phone_number: string
          otp_code: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          phone_number?: string
          otp_code?: string
          expires_at?: string
          created_at?: string
        }
      }
      shift_notifications: {
        Row: {
          id: string
          shift_id: string
          user_id: string
          sent_at: string
          status: 'sent' | 'failed'
          notification_type: 'sms' | 'call'
          created_at: string
        }
        Insert: {
          id?: string
          shift_id: string
          user_id: string
          sent_at?: string
          status?: 'sent' | 'failed'
          notification_type?: 'sms' | 'call'
          created_at?: string
        }
        Update: {
          id?: string
          shift_id?: string
          user_id?: string
          sent_at?: string
          status?: 'sent' | 'failed'
          notification_type?: 'sms' | 'call'
          created_at?: string
        }
      }
      shift_suggestions: {
        Row: {
          id: string
          user_id: string
          pattern_id: string
          suggested_date: string
          status: 'pending' | 'accepted' | 'dismissed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pattern_id: string
          suggested_date: string
          status?: 'pending' | 'accepted' | 'dismissed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          pattern_id?: string
          suggested_date?: string
          status?: 'pending' | 'accepted' | 'dismissed'
          created_at?: string
        }
      }
    }
    Functions: {
      get_monthly_summary: {
        Args: {
          p_user_id: string
          p_year: number
          p_month: number
        }
        Returns: {
          organization_id: string
          organization_name: string
          organization_color: string
          shift_count: number
          total_hours: number
        }[]
      }
      get_shifts_by_financial_year: {
        Args: {
          p_user_id: string
          p_fy_start_year: number
        }
        Returns: {
          id: string
          organization_id: string
          organization_name: string
          organization_color: string
          title: string
          date: string
          start_time: string
          end_time: string
          hours_worked: number
        }[]
      }
      get_financial_year_summary: {
        Args: {
          p_user_id: string
          p_fy_start_year: number
        }
        Returns: {
          organization_id: string
          organization_name: string
          organization_color: string
          shift_count: number
          total_hours: number
        }[]
      }
      get_shifts_needing_sms: {
        Args: Record<string, never>
        Returns: {
          id: string
          user_id: string
          title: string
          start_time: string
          phone_number: string
        }[]
      }
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Shift = Database['public']['Tables']['shifts']['Row']
export type RecurrencePattern = Database['public']['Tables']['recurrence_patterns']['Row']
export type ShiftSuggestion = Database['public']['Tables']['shift_suggestions']['Row']
export type PhoneVerification = Database['public']['Tables']['phone_verifications']['Row']
export type ShiftNotification = Database['public']['Tables']['shift_notifications']['Row']

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type ShiftInsert = Database['public']['Tables']['shifts']['Insert']

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']
export type ShiftUpdate = Database['public']['Tables']['shifts']['Update']

// Shift with organization info (joined). organization is null for one-off
// "custom" workplaces (the name lives in shift.title).
export type ShiftWithOrganization = Shift & {
  organization: Organization | null
}
