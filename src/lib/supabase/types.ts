export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      communities: {
        Row: {
          id: string
          slug: string
          name: string
          address: string | null
          logo_url: string | null
          banner_url: string | null
          primary_color: string
          total_apts_tbc: number
          apt_schema: Json
          duplex_floors: number[]
          languages_core: string[]
          languages_extended: string[]
          rental_min_months: number
          short_term_rental_allowed: boolean
          community_voice_enabled: boolean
          birthday_wishes_enabled: boolean
          moha_name: string | null
          moha_schedule: string | null
          moha_whatsapp: string | null
          on_call_enabled: boolean
          on_call_contact: Json | null
          liaison_email: string | null
          liaison_whatsapp: string | null
          admin_company_name: string | null
          admin_company_email: string | null
          admin_company_emergency_phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['communities']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['communities']['Insert']>
      }
      apartments: {
        Row: {
          id: string
          community_id: string
          apt_number: string
          floor: number | null
          door: string | null
          is_duplex: boolean
          duplex_upper_number: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['apartments']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['apartments']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          community_id: string
          apartment_id: string | null
          apt_number: string
          username: string | null
          avatar_url: string | null
          phone: string | null
          role: 'resident' | 'admin' | 'sa'
          show_names: boolean
          show_ages: boolean
          show_interests: boolean
          show_phone: boolean
          show_in_directory: boolean
          birthday_wishes: boolean
          email_notifications: boolean
          google_calendar_sync: boolean
          google_signin_enabled: boolean
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      occupants: {
        Row: {
          id: string
          profile_id: string
          name: string | null
          gender: 'M' | 'F' | '—' | null
          age: number | null
          birthday_day: number | null
          birthday_month: number | null
          is_primary: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['occupants']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['occupants']['Insert']>
      }
      interests: {
        Row: {
          id: string
          profile_id: string
          interest: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['interests']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['interests']['Insert']>
      }
      premises: {
        Row: {
          id: string
          community_id: string
          name: string
          name_translations: Json
          type: 'court' | 'social' | 'challenge'
          booking_type: 'slots' | 'halfday' | 'challenge'
          slot_duration_minutes: number
          gap_required: boolean
          max_invite_slots: number | null
          available_from: string
          available_until: string
          icon: string
          active: boolean
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['premises']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['premises']['Insert']>
      }
      bookings: {
        Row: {
          id: string
          community_id: string
          premise_id: string
          profile_id: string
          apt_number: string
          date: string
          slot_start: string | null
          slot_end: string | null
          halfday_period: 'morning' | 'afternoon' | 'evening' | 'full' | null
          status: 'confirmed' | 'cancelled'
          invite_open: boolean
          invite_scope: 'none' | 'interest' | 'apt' | 'all'
          invite_target_apt: string | null
          invite_max_slots: number | null
          google_event_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
      }
      proposals: {
        Row: {
          id: string
          community_id: string
          profile_id: string
          apt_number: string
          title: string
          body: string
          body_translations: Json
          category: 'social' | 'infrastructure' | 'rules' | 'complaint' | 'project' | 'meeting' | 'other'
          status: 'open' | 'voting' | 'resolved' | 'archived' | 'promoted'
          voting_closes_at: string | null
          tagged_apts: string[]
          tag_all: boolean
          supports: number
          against: number
          promoted_to_project_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['proposals']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['proposals']['Insert']>
      }
      marketplace_listings: {
        Row: {
          id: string
          community_id: string
          profile_id: string
          apt_number: string
          category: 'favour' | 'advice' | 'borrow' | 'buy_sell_donate' | 'parking' | 'apartment_rental' | 'apartment_sale' | 'babysitting' | 'language_exchange'
          title: string
          body: string
          body_translations: Json
          photo_url: string | null
          price_eur: number | null
          rental_months_min: number | null
          language_from: string | null
          language_to: string | null
          status: 'active' | 'closed' | 'expired'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['marketplace_listings']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['marketplace_listings']['Insert']>
      }
      maintenance_tickets: {
        Row: {
          id: string
          community_id: string
          profile_id: string
          apt_number: string
          category: string
          location_description: string | null
          description: string
          urgency: 'normal' | 'urgent' | 'emergency'
          photo_urls: string[]
          insurance_flag: boolean
          status: 'submitted' | 'forwarded' | 'in_progress' | 'resolved'
          liaison_notes: string | null
          whatsapp_sent_moha: boolean
          whatsapp_sent_liaison: boolean
          email_sent_liaison: boolean
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['maintenance_tickets']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['maintenance_tickets']['Insert']>
      }
      projects: {
        Row: {
          id: string
          community_id: string
          origin_proposal_id: string | null
          title: string
          description: string | null
          status: 'planning' | 'tendering' | 'in_progress' | 'on_hold' | 'completed'
          projected_cost_eur: number | null
          actual_cost_eur: number | null
          provider_name: string | null
          provider_contact: string | null
          contract_document_id: string | null
          start_date: string | null
          estimated_completion: string | null
          completion_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          community_id: string
          profile_id: string
          type: string
          title: string
          body: string | null
          entity_type: string | null
          entity_id: string | null
          read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      admin_announcements: {
        Row: {
          id: string
          community_id: string
          posted_by: string
          type: 'warning' | 'announcement' | 'convocatoria'
          title: string
          body: string | null
          meeting_date: string | null
          meeting_location: string | null
          meeting_type: 'ordinary' | 'extraordinary' | null
          pdf_url: string | null
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_announcements']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['admin_announcements']['Insert']>
      }
      emergency_contacts: {
        Row: {
          id: string
          community_id: string
          name: string
          role: string
          phone: string | null
          available_hours: string | null
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['emergency_contacts']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['emergency_contacts']['Insert']>
      }
    }
    Views: {}
    Functions: {
      get_my_community_id: { Args: {}; Returns: string }
      get_my_role: { Args: {}; Returns: string }
      log_activity: {
        Args: { p_community_id: string; p_action: string; p_entity_type?: string; p_entity_id?: string; p_metadata?: Json }
        Returns: void
      }
    }
    Enums: {}
  }
}

// Convenience types
export type Community = Database['public']['Tables']['communities']['Row']
export type Apartment = Database['public']['Tables']['apartments']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Occupant = Database['public']['Tables']['occupants']['Row']
export type Premise = Database['public']['Tables']['premises']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type Proposal = Database['public']['Tables']['proposals']['Row']
export type MarketplaceListing = Database['public']['Tables']['marketplace_listings']['Row']
export type MaintenanceTicket = Database['public']['Tables']['maintenance_tickets']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type AdminAnnouncement = Database['public']['Tables']['admin_announcements']['Row']
export type EmergencyContact = Database['public']['Tables']['emergency_contacts']['Row']

// Extended types with joins
export type ProfileWithOccupants = Profile & {
  occupants: Occupant[]
  interests: { interest: string }[]
}

export type BookingWithPremise = Booking & {
  premise: Premise
  participants: { apt_number: string; profile_id: string }[]
}

export type ProposalWithMeta = Proposal & {
  vote?: 'support' | 'against' | null
  flag?: { is_important: boolean; is_following: boolean; is_dismissed: boolean; last_read_at: string | null }
  comment_count?: number
}
