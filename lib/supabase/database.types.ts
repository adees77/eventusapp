// Generated from the Supabase project «eventus» (supabase/migrations). Do not edit by hand:
// regenerate after a migration (Supabase MCP generate_typescript_types, or `supabase gen types typescript`).
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      availability_blocks: {
        Row: {
          date: string
          offer_id: string
          units: number
        }
        Insert: {
          date: string
          offer_id: string
          units: number
        }
        Update: {
          date?: string
          offer_id?: string
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_blocks_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_confirmed_at: string | null
          client_id: string
          created_at: string
          date: string
          dispute_by: string | null
          dispute_opened_at: string | null
          dispute_reason: string | null
          dispute_resolution:
            | Database["public"]["Enums"]["dispute_resolution"]
            | null
          dispute_resolved_at: string | null
          escrow_amount: number
          escrow_state: Database["public"]["Enums"]["escrow_state"]
          event_id: string | null
          held_at: string | null
          id: string
          note: string | null
          offer_id: string
          payment_ref: string | null
          prepay_amount: number
          qty: number
          refunded_at: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total: number
          vendor_confirmed_at: string | null
          vendor_id: string
        }
        Insert: {
          client_confirmed_at?: string | null
          client_id: string
          created_at?: string
          date: string
          dispute_by?: string | null
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          dispute_resolution?:
            | Database["public"]["Enums"]["dispute_resolution"]
            | null
          dispute_resolved_at?: string | null
          escrow_amount?: number
          escrow_state?: Database["public"]["Enums"]["escrow_state"]
          event_id?: string | null
          held_at?: string | null
          id?: string
          note?: string | null
          offer_id: string
          payment_ref?: string | null
          prepay_amount: number
          qty: number
          refunded_at?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total: number
          vendor_confirmed_at?: string | null
          vendor_id: string
        }
        Update: {
          client_confirmed_at?: string | null
          client_id?: string
          created_at?: string
          date?: string
          dispute_by?: string | null
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          dispute_resolution?:
            | Database["public"]["Enums"]["dispute_resolution"]
            | null
          dispute_resolved_at?: string | null
          escrow_amount?: number
          escrow_state?: Database["public"]["Enums"]["escrow_state"]
          event_id?: string | null
          held_at?: string | null
          id?: string
          note?: string | null
          offer_id?: string
          payment_ref?: string | null
          prepay_amount?: number
          qty?: number
          refunded_at?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total?: number
          vendor_confirmed_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_dispute_by_fkey"
            columns: ["dispute_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          icon: string
          id: Database["public"]["Enums"]["category_id"]
          name: Json
          sort_order: number
        }
        Insert: {
          icon: string
          id: Database["public"]["Enums"]["category_id"]
          name: Json
          sort_order: number
        }
        Update: {
          icon?: string
          id?: Database["public"]["Enums"]["category_id"]
          name?: Json
          sort_order?: number
        }
        Relationships: []
      }
      complaints: {
        Row: {
          author_id: string
          created_at: string
          id: string
          reason: Database["public"]["Enums"]["complaint_reason"]
          resolution: Database["public"]["Enums"]["complaint_resolution"] | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          target: Database["public"]["Enums"]["complaint_target"]
          target_id: string
          text: string | null
          vendor_id: string | null
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          reason: Database["public"]["Enums"]["complaint_reason"]
          resolution?:
            | Database["public"]["Enums"]["complaint_resolution"]
            | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          target: Database["public"]["Enums"]["complaint_target"]
          target_id: string
          text?: string | null
          vendor_id?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          reason?: Database["public"]["Enums"]["complaint_reason"]
          resolution?:
            | Database["public"]["Enums"]["complaint_resolution"]
            | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          target?: Database["public"]["Enums"]["complaint_target"]
          target_id?: string
          text?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_id: string | null
          client_id: string
          client_read_at: string | null
          created_at: string
          id: string
          updated_at: string
          vendor_id: string
          vendor_read_at: string | null
        }
        Insert: {
          booking_id?: string | null
          client_id: string
          client_read_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          vendor_id: string
          vendor_read_at?: string | null
        }
        Update: {
          booking_id?: string | null
          client_id?: string
          client_read_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          vendor_id?: string
          vendor_read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          budget: number
          checklist: Json
          city: string
          client_id: string
          created_at: string
          date: string
          guests: number
          id: string
          title: string
        }
        Insert: {
          budget?: number
          checklist?: Json
          city: string
          client_id: string
          created_at?: string
          date: string
          guests?: number
          id?: string
          title: string
        }
        Update: {
          budget?: number
          checklist?: Json
          city?: string
          client_id?: string
          created_at?: string
          date?: string
          guests?: number
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          user_id: string
          vendor_id: string
        }
        Insert: {
          user_id: string
          vendor_id: string
        }
        Update: {
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          user_id: string
          vendor_id: string
        }
        Insert: {
          user_id: string
          vendor_id: string
        }
        Update: {
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_guests: {
        Row: {
          direct: boolean
          group: string | null
          id: string
          invitation_id: string
          name: string
          opened_at: string | null
          phone: string | null
          seats: number
          sent_at: string | null
        }
        Insert: {
          direct?: boolean
          group?: string | null
          id?: string
          invitation_id: string
          name: string
          opened_at?: string | null
          phone?: string | null
          seats?: number
          sent_at?: string | null
        }
        Update: {
          direct?: boolean
          group?: string | null
          id?: string
          invitation_id?: string
          name?: string
          opened_at?: string | null
          phone?: string | null
          seats?: number
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_guests_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_rsvps: {
        Row: {
          attending: boolean
          created_at: string
          guest_id: string | null
          guests: number
          id: string
          invitation_id: string
          name: string
          note: string | null
        }
        Insert: {
          attending: boolean
          created_at?: string
          guest_id?: string | null
          guests?: number
          id?: string
          invitation_id: string
          name: string
          note?: string | null
        }
        Update: {
          attending?: boolean
          created_at?: string
          guest_id?: string | null
          guests?: number
          id?: string
          invitation_id?: string
          name?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_rsvps_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "invitation_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_rsvps_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_views: {
        Row: {
          at: string
          guest_id: string | null
          id: number
          invitation_id: string
        }
        Insert: {
          at?: string
          guest_id?: string | null
          id?: never
          invitation_id: string
        }
        Update: {
          at?: string
          guest_id?: string | null
          id?: never
          invitation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_views_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "invitation_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_views_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          address: string
          contact: string | null
          created_at: string
          date: string | null
          design: Json
          dress_code: string | null
          event_id: string | null
          heading: string
          id: string
          message: string
          names: string
          occasion: Database["public"]["Enums"]["invitation_occasion"]
          owner_id: string
          photo: string | null
          style: Database["public"]["Enums"]["invitation_style"]
          template_id: string | null
          time: string
          updated_at: string
          venue: string
        }
        Insert: {
          address?: string
          contact?: string | null
          created_at?: string
          date?: string | null
          design: Json
          dress_code?: string | null
          event_id?: string | null
          heading?: string
          id?: string
          message?: string
          names?: string
          occasion: Database["public"]["Enums"]["invitation_occasion"]
          owner_id: string
          photo?: string | null
          style: Database["public"]["Enums"]["invitation_style"]
          template_id?: string | null
          time?: string
          updated_at?: string
          venue?: string
        }
        Update: {
          address?: string
          contact?: string | null
          created_at?: string
          date?: string | null
          design?: Json
          dress_code?: string | null
          event_id?: string | null
          heading?: string
          id?: string
          message?: string
          names?: string
          occasion?: Database["public"]["Enums"]["invitation_occasion"]
          owner_id?: string
          photo?: string | null
          style?: Database["public"]["Enums"]["invitation_style"]
          template_id?: string | null
          time?: string
          updated_at?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ai: boolean
          conversation_id: string
          created_at: string
          id: string
          offer_ids: string[]
          sender_id: string | null
          system: boolean
          text: string
        }
        Insert: {
          ai?: boolean
          conversation_id: string
          created_at?: string
          id?: string
          offer_ids?: string[]
          sender_id?: string | null
          system?: boolean
          text: string
        }
        Update: {
          ai?: boolean
          conversation_id?: string
          created_at?: string
          id?: string
          offer_ids?: string[]
          sender_id?: string | null
          system?: boolean
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          href: string | null
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          read: boolean
          text: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          href?: string | null
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          read?: boolean
          text: Json
          user_id: string
        }
        Update: {
          created_at?: string
          href?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          read?: boolean
          text?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          active: boolean
          capacity: number | null
          created_at: string
          description: Json
          id: string
          max_per_booking: number | null
          photos: string[]
          premium: boolean
          price: number
          title: Json
          total_units: number
          unit: Json
          vendor_id: string
        }
        Insert: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          description?: Json
          id?: string
          max_per_booking?: number | null
          photos?: string[]
          premium?: boolean
          price: number
          title: Json
          total_units?: number
          unit: Json
          vendor_id: string
        }
        Update: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          description?: Json
          id?: string
          max_per_booking?: number | null
          photos?: string[]
          premium?: boolean
          price?: number
          title?: Json
          total_units?: number
          unit?: Json
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          auto_hide_complaints: number
          auto_release_days: number
          default_prepay_percent: number
          fee_percent: number
          hide_prices: boolean
          hide_unverified: boolean
          id: boolean
          low_rating_threshold: number
          notify_on_complaint: boolean
          required_docs: Database["public"]["Enums"]["doc_kind"][]
          support_email: string
          support_phone: string
        }
        Insert: {
          auto_hide_complaints?: number
          auto_release_days?: number
          default_prepay_percent?: number
          fee_percent?: number
          hide_prices?: boolean
          hide_unverified?: boolean
          id?: boolean
          low_rating_threshold?: number
          notify_on_complaint?: boolean
          required_docs?: Database["public"]["Enums"]["doc_kind"][]
          support_email?: string
          support_phone?: string
        }
        Update: {
          auto_hide_complaints?: number
          auto_release_days?: number
          default_prepay_percent?: number
          fee_percent?: number
          hide_prices?: boolean
          hide_unverified?: boolean
          id?: boolean
          low_rating_threshold?: number
          notify_on_complaint?: boolean
          required_docs?: Database["public"]["Enums"]["doc_kind"][]
          support_email?: string
          support_phone?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          author: string
          created_at: string
          id: string
          post_id: string
          text: string
          user_id: string | null
        }
        Insert: {
          author: string
          created_at?: string
          id?: string
          post_id: string
          text: string
          user_id?: string | null
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          post_id?: string
          text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          post_id: string
          user_id: string
        }
        Insert: {
          post_id: string
          user_id: string
        }
        Update: {
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          post_id: string
          user_id: string
        }
        Insert: {
          post_id: string
          user_id: string
        }
        Update: {
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          base_likes: number
          caption: Json
          category: Database["public"]["Enums"]["category_id"]
          created_at: string
          hidden: boolean
          id: string
          offer_id: string | null
          photos: string[]
          ratio: number
          vendor_id: string
        }
        Insert: {
          base_likes?: number
          caption: Json
          category: Database["public"]["Enums"]["category_id"]
          created_at?: string
          hidden?: boolean
          id?: string
          offer_id?: string | null
          photos: string[]
          ratio?: number
          vendor_id: string
        }
        Update: {
          base_likes?: number
          caption?: Json
          category?: Database["public"]["Enums"]["category_id"]
          created_at?: string
          hidden?: boolean
          id?: string
          offer_id?: string | null
          photos?: string[]
          ratio?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_provider: Database["public"]["Enums"]["auth_provider"] | null
          avatar: string | null
          blocked: boolean
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          needs_onboarding: boolean
          onboarded_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          auth_provider?: Database["public"]["Enums"]["auth_provider"] | null
          avatar?: string | null
          blocked?: boolean
          city?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string
          needs_onboarding?: boolean
          onboarded_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          auth_provider?: Database["public"]["Enums"]["auth_provider"] | null
          avatar?: string | null
          blocked?: boolean
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          needs_onboarding?: boolean
          onboarded_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author: string
          author_id: string | null
          booking_id: string | null
          created_at: string
          date: string
          hidden: boolean
          id: string
          rating: number
          reply_date: string | null
          reply_text: string | null
          text: Json
          vendor_id: string
        }
        Insert: {
          author: string
          author_id?: string | null
          booking_id?: string | null
          created_at?: string
          date?: string
          hidden?: boolean
          id?: string
          rating: number
          reply_date?: string | null
          reply_text?: string | null
          text: Json
          vendor_id: string
        }
        Update: {
          author?: string
          author_id?: string | null
          booking_id?: string | null
          created_at?: string
          date?: string
          hidden?: boolean
          id?: string
          rating?: number
          reply_date?: string | null
          reply_text?: string | null
          text?: Json
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          booking_id: string | null
          client_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["transaction_kind"]
          note: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["transaction_kind"]
          note?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["transaction_kind"]
          note?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_documents: {
        Row: {
          file_name: string
          id: string
          kind: Database["public"]["Enums"]["doc_kind"]
          note: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["doc_status"]
          storage_path: string | null
          uploaded_at: string
          vendor_id: string
        }
        Insert: {
          file_name: string
          id?: string
          kind: Database["public"]["Enums"]["doc_kind"]
          note?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path?: string | null
          uploaded_at?: string
          vendor_id: string
        }
        Update: {
          file_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["doc_kind"]
          note?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path?: string | null
          uploaded_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_stats: {
        Row: {
          vendor_id: string
          views: number
        }
        Insert: {
          vendor_id: string
          views?: number
        }
        Update: {
          vendor_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_stats_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          ai_assistant: boolean
          category: Database["public"]["Enums"]["category_id"]
          city: string
          cover: string
          created_at: string
          description: Json
          hidden: boolean
          id: string
          instagram: string | null
          name: string
          orders_base: number
          owner_id: string
          phone: string
          portfolio: string[]
          prepay_percent: number
          rating: number
          response_minutes: number
          reviews_count: number
          slug: string
          specs: Json
          tagline: Json
          verification_note: string | null
          verification_requested_at: string | null
          verification_reviewed_at: string | null
          verification_state:
            | Database["public"]["Enums"]["verification_state"]
            | null
          verified: boolean
          years_on_market: number
        }
        Insert: {
          ai_assistant?: boolean
          category: Database["public"]["Enums"]["category_id"]
          city: string
          cover?: string
          created_at?: string
          description?: Json
          hidden?: boolean
          id?: string
          instagram?: string | null
          name: string
          orders_base?: number
          owner_id: string
          phone?: string
          portfolio?: string[]
          prepay_percent?: number
          rating?: number
          response_minutes?: number
          reviews_count?: number
          slug: string
          specs?: Json
          tagline?: Json
          verification_note?: string | null
          verification_requested_at?: string | null
          verification_reviewed_at?: string | null
          verification_state?:
            | Database["public"]["Enums"]["verification_state"]
            | null
          verified?: boolean
          years_on_market?: number
        }
        Update: {
          ai_assistant?: boolean
          category?: Database["public"]["Enums"]["category_id"]
          city?: string
          cover?: string
          created_at?: string
          description?: Json
          hidden?: boolean
          id?: string
          instagram?: string | null
          name?: string
          orders_base?: number
          owner_id?: string
          phone?: string
          portfolio?: string[]
          prepay_percent?: number
          rating?: number
          response_minutes?: number
          reviews_count?: number
          slug?: string
          specs?: Json
          tagline?: Json
          verification_note?: string | null
          verification_requested_at?: string | null
          verification_reviewed_at?: string | null
          verification_state?:
            | Database["public"]["Enums"]["verification_state"]
            | null
          verified?: boolean
          years_on_market?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendors_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _deny: { Args: { p_action: string }; Returns: undefined }
      _lock_booking: {
        Args: { p_booking: string }
        Returns: {
          client_confirmed_at: string | null
          client_id: string
          created_at: string
          date: string
          dispute_by: string | null
          dispute_opened_at: string | null
          dispute_reason: string | null
          dispute_resolution:
            | Database["public"]["Enums"]["dispute_resolution"]
            | null
          dispute_resolved_at: string | null
          escrow_amount: number
          escrow_state: Database["public"]["Enums"]["escrow_state"]
          event_id: string | null
          held_at: string | null
          id: string
          note: string | null
          offer_id: string
          payment_ref: string | null
          prepay_amount: number
          qty: number
          refunded_at: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total: number
          vendor_confirmed_at: string | null
          vendor_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _notify: {
        Args: {
          p_en: string
          p_href?: string
          p_kind: Database["public"]["Enums"]["notification_kind"]
          p_ru: string
          p_user: string
        }
        Returns: undefined
      }
      _party: {
        Args: { b: Database["public"]["Tables"]["bookings"]["Row"] }
        Returns: string
      }
      _refund: {
        Args: { b: Database["public"]["Tables"]["bookings"]["Row"] }
        Returns: undefined
      }
      _release: {
        Args: { b: Database["public"]["Tables"]["bookings"]["Row"] }
        Returns: undefined
      }
      _set_target_hidden: {
        Args: {
          p_hidden: boolean
          p_id: string
          p_target: Database["public"]["Enums"]["complaint_target"]
        }
        Returns: undefined
      }
      _system_message: {
        Args: { p_booking: string; p_code: string }
        Returns: undefined
      }
      _uid: { Args: never; Returns: string }
      _units_taken: {
        Args: { p_date: string; p_exclude?: string; p_offer: string }
        Returns: number
      }
      auto_release_due_deals: { Args: never; Returns: number }
      cancel_deal: { Args: { p_booking: string }; Returns: undefined }
      complete_client_onboarding: { Args: { p: Json }; Returns: string }
      confirm_booking_payment: {
        Args: { p_booking: string; p_payment_ref: string }
        Returns: string
      }
      confirm_deal: {
        Args: { p_booking: string }
        Returns: Database["public"]["Enums"]["escrow_state"]
      }
      create_booking: {
        Args: {
          p_date: string
          p_event?: string
          p_note?: string
          p_offer: string
          p_qty: number
        }
        Returns: {
          client_confirmed_at: string | null
          client_id: string
          created_at: string
          date: string
          dispute_by: string | null
          dispute_opened_at: string | null
          dispute_reason: string | null
          dispute_resolution:
            | Database["public"]["Enums"]["dispute_resolution"]
            | null
          dispute_resolved_at: string | null
          escrow_amount: number
          escrow_state: Database["public"]["Enums"]["escrow_state"]
          event_id: string | null
          held_at: string | null
          id: string
          note: string | null
          offer_id: string
          payment_ref: string | null
          prepay_amount: number
          qty: number
          refunded_at: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total: number
          vendor_confirmed_at: string | null
          vendor_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_verification: {
        Args: { p_approve: boolean; p_note?: string; p_vendor: string }
        Returns: undefined
      }
      ensure_conversation: {
        Args: { p_booking?: string; p_vendor: string }
        Returns: string
      }
      has_finished_deal: { Args: { p_vendor: string }; Returns: boolean }
      in_conversation: { Args: { p_conversation: string }; Returns: boolean }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_ltext: { Args: { v: Json }; Returns: boolean }
      mark_read: { Args: { p_conversation: string }; Returns: undefined }
      offer_availability: {
        Args: { p_from: string; p_offer: string; p_to: string }
        Returns: {
          blocked: number
          booked: number
          date: string
          free: number
          total: number
        }[]
      }
      open_dispute: {
        Args: { p_booking: string; p_reason: string }
        Returns: undefined
      }
      owns_vendor: { Args: { p_vendor: string }; Returns: boolean }
      profile_cards: {
        Args: { p_ids: string[] }
        Returns: {
          avatar: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      public_invitation: {
        Args: { p_guest?: string; p_id: string }
        Returns: Json
      }
      record_invitation_view: {
        Args: { p_guest?: string; p_invitation: string }
        Returns: undefined
      }
      reply_to_review: {
        Args: { p_review: string; p_text: string }
        Returns: undefined
      }
      request_payout: {
        Args: { p_amount: number; p_vendor: string }
        Returns: number
      }
      request_verification: { Args: { p_vendor: string }; Returns: undefined }
      resolve_complaint: {
        Args: { p_complaint: string; p_hide: boolean }
        Returns: undefined
      }
      resolve_dispute: {
        Args: {
          p_booking: string
          p_resolution: Database["public"]["Enums"]["dispute_resolution"]
        }
        Returns: undefined
      }
      set_booking_status: {
        Args: {
          p_booking: string
          p_status: Database["public"]["Enums"]["booking_status"]
        }
        Returns: undefined
      }
      sign_up_vendor: { Args: { p: Json }; Returns: Json }
      submit_rsvp: {
        Args: {
          p_attending: boolean
          p_guest?: string
          p_guests: number
          p_invitation: string
          p_name: string
          p_note?: string
        }
        Returns: string
      }
      track_view: { Args: { p_vendor: string }; Returns: undefined }
      unconfirm_deal: { Args: { p_booking: string }; Returns: undefined }
      vendor_visible: { Args: { p_vendor: string }; Returns: boolean }
    }
    Enums: {
      auth_provider: "google" | "email" | "demo"
      booking_status:
        | "pending"
        | "prepaid"
        | "confirmed"
        | "completed"
        | "cancelled"
      category_id:
        | "cars"
        | "halls"
        | "furniture"
        | "hosts"
        | "photo"
        | "decor"
        | "music"
        | "cakes"
        | "beauty"
        | "attire"
        | "traditional"
        | "shows"
      complaint_reason:
        | "fraud"
        | "fake"
        | "offensive"
        | "spam"
        | "quality"
        | "other"
      complaint_resolution: "hidden" | "kept"
      complaint_status: "open" | "resolved" | "dismissed"
      complaint_target: "vendor" | "post" | "review"
      dispute_resolution: "release" | "refund"
      doc_kind: "passport" | "registration" | "license" | "contract"
      doc_status: "pending" | "approved" | "rejected"
      escrow_state: "none" | "held" | "released" | "refunded" | "disputed"
      invitation_occasion:
        | "wedding"
        | "kyzUzatuu"
        | "birthday"
        | "jubilee"
        | "sunnot"
        | "corporate"
      invitation_style:
        | "classic"
        | "minimal"
        | "night"
        | "arch"
        | "ornament"
        | "photo"
      notification_kind:
        | "message"
        | "escrow_held"
        | "escrow_confirm"
        | "escrow_released"
        | "escrow_refunded"
        | "escrow_disputed"
        | "booking_new"
        | "booking_status"
        | "rsvp"
        | "review"
        | "follow"
        | "system"
      transaction_kind: "hold" | "release" | "fee" | "refund" | "payout"
      user_role: "client" | "vendor" | "admin"
      verification_state: "pending" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      auth_provider: ["google", "email", "demo"],
      booking_status: [
        "pending",
        "prepaid",
        "confirmed",
        "completed",
        "cancelled",
      ],
      category_id: [
        "cars",
        "halls",
        "furniture",
        "hosts",
        "photo",
        "decor",
        "music",
        "cakes",
        "beauty",
        "attire",
        "traditional",
        "shows",
      ],
      complaint_reason: [
        "fraud",
        "fake",
        "offensive",
        "spam",
        "quality",
        "other",
      ],
      complaint_resolution: ["hidden", "kept"],
      complaint_status: ["open", "resolved", "dismissed"],
      complaint_target: ["vendor", "post", "review"],
      dispute_resolution: ["release", "refund"],
      doc_kind: ["passport", "registration", "license", "contract"],
      doc_status: ["pending", "approved", "rejected"],
      escrow_state: ["none", "held", "released", "refunded", "disputed"],
      invitation_occasion: [
        "wedding",
        "kyzUzatuu",
        "birthday",
        "jubilee",
        "sunnot",
        "corporate",
      ],
      invitation_style: [
        "classic",
        "minimal",
        "night",
        "arch",
        "ornament",
        "photo",
      ],
      notification_kind: [
        "message",
        "escrow_held",
        "escrow_confirm",
        "escrow_released",
        "escrow_refunded",
        "escrow_disputed",
        "booking_new",
        "booking_status",
        "rsvp",
        "review",
        "follow",
        "system",
      ],
      transaction_kind: ["hold", "release", "fee", "refund", "payout"],
      user_role: ["client", "vendor", "admin"],
      verification_state: ["pending", "rejected"],
    },
  },
} as const
