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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      backup_snapshots: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          filename: string
          id: string
          record_counts: Json
          schema_version: string
          site_id: string
          size_bytes: number
          status: Database["public"]["Enums"]["backup_status"]
          storage_path: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          filename: string
          id?: string
          record_counts?: Json
          schema_version?: string
          site_id: string
          size_bytes?: number
          status?: Database["public"]["Enums"]["backup_status"]
          storage_path: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          filename?: string
          id?: string
          record_counts?: Json
          schema_version?: string
          site_id?: string
          size_bytes?: number
          status?: Database["public"]["Enums"]["backup_status"]
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_snapshots_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "backup_snapshots_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          icon_class: string | null
          id: string
          key: string
          label: string
          legacy_id: number | null
          proficiency_pct: number
          site_id: string
          sort_order: number
          updated_at: string
          version: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon_class?: string | null
          id?: string
          key: string
          label: string
          legacy_id?: number | null
          proficiency_pct?: number
          site_id: string
          sort_order?: number
          updated_at?: string
          version?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon_class?: string | null
          id?: string
          key?: string
          label?: string
          legacy_id?: number | null
          proficiency_pct?: number
          site_id?: string
          sort_order?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_categories_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "blog_categories_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          blog_post_id: string
          id: string
          sort_order: number
          tag: string
        }
        Insert: {
          blog_post_id: string
          id?: string
          sort_order?: number
          tag: string
        }
        Update: {
          blog_post_id?: string
          id?: string
          sort_order?: number
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          category_key: string
          content: string
          created_at: string
          deleted_at: string | null
          excerpt: string
          featured_image_alt: string | null
          featured_image_url: string | null
          id: string
          is_featured: boolean
          legacy_id: number | null
          published_at: string | null
          site_id: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["blog_post_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          category_key: string
          content: string
          created_at?: string
          deleted_at?: string | null
          excerpt: string
          featured_image_alt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean
          legacy_id?: number | null
          published_at?: string | null
          site_id: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["blog_post_status"]
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          category_key?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          excerpt?: string
          featured_image_alt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean
          legacy_id?: number | null
          published_at?: string | null
          site_id?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["blog_post_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_fkey"
            columns: ["site_id", "category_key"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["site_id", "key"]
          },
          {
            foreignKeyName: "blog_posts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "blog_posts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          is_builtin: boolean
          key: string
          label: string
          site_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          is_builtin?: boolean
          key: string
          label: string
          site_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          is_builtin?: boolean
          key?: string
          label?: string
          site_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "categories_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_message_replies: {
        Row: {
          attachment_mime: string | null
          attachment_name: string | null
          attachment_size: number | null
          attachment_url: string | null
          body: string
          cc: string | null
          created_at: string
          id: string
          message_id: string
          sent_at: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          body: string
          cc?: string | null
          created_at?: string
          id?: string
          message_id: string
          sent_at?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          body?: string
          cc?: string | null
          created_at?: string
          id?: string
          message_id?: string
          sent_at?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_message_replies_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "contact_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          is_starred: boolean
          legacy_id: number | null
          replied_at: string | null
          reply_body: string | null
          sender_email: string
          sender_ip: unknown
          sender_name: string
          site_id: string
          snippet: string | null
          status: Database["public"]["Enums"]["contact_message_status"]
          subject: string
          updated_at: string
          version: number
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_starred?: boolean
          legacy_id?: number | null
          replied_at?: string | null
          reply_body?: string | null
          sender_email: string
          sender_ip?: unknown
          sender_name: string
          site_id: string
          snippet?: string | null
          status?: Database["public"]["Enums"]["contact_message_status"]
          subject: string
          updated_at?: string
          version?: number
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_starred?: boolean
          legacy_id?: number | null
          replied_at?: string | null
          reply_body?: string | null
          sender_email?: string
          sender_ip?: unknown
          sender_name?: string
          site_id?: string
          snippet?: string | null
          status?: Database["public"]["Enums"]["contact_message_status"]
          subject?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "contact_messages_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_entries: {
        Row: {
          company: string
          created_at: string
          deleted_at: string | null
          description: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          end_date: string | null
          id: string
          is_current: boolean
          job_title: string
          legacy_id: number | null
          location: string | null
          site_id: string
          sort_order: number
          start_date: string
          updated_at: string
          version: number
        }
        Insert: {
          company: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          end_date?: string | null
          id?: string
          is_current?: boolean
          job_title: string
          legacy_id?: number | null
          location?: string | null
          site_id: string
          sort_order?: number
          start_date: string
          updated_at?: string
          version?: number
        }
        Update: {
          company?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          end_date?: string | null
          id?: string
          is_current?: boolean
          job_title?: string
          legacy_id?: number | null
          location?: string | null
          site_id?: string
          sort_order?: number
          start_date?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "experience_entries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "experience_entries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      login_activity: {
        Row: {
          created_at: string
          device_icon: string | null
          device_label: string | null
          email: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          is_current: boolean
          location: string | null
          status: Database["public"]["Enums"]["login_activity_status"]
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_icon?: string | null
          device_label?: string | null
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean
          location?: string | null
          status: Database["public"]["Enums"]["login_activity_status"]
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_icon?: string | null
          device_label?: string | null
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean
          location?: string | null
          status?: Database["public"]["Enums"]["login_activity_status"]
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string | null
          created_at: string
          deleted_at: string | null
          file_name: string
          folder: Database["public"]["Enums"]["media_folder"]
          id: string
          legacy_id: number | null
          mime_type: string
          site_id: string
          size_bytes: number
          source: Database["public"]["Enums"]["media_source"]
          storage_path: string | null
          updated_at: string
          uploaded_at: string
          url: string
          url_hash: string | null
          usage_count: number
          version: number
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          deleted_at?: string | null
          file_name: string
          folder?: Database["public"]["Enums"]["media_folder"]
          id?: string
          legacy_id?: number | null
          mime_type?: string
          site_id: string
          size_bytes?: number
          source?: Database["public"]["Enums"]["media_source"]
          storage_path?: string | null
          updated_at?: string
          uploaded_at?: string
          url: string
          url_hash?: string | null
          usage_count?: number
          version?: number
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          deleted_at?: string | null
          file_name?: string
          folder?: Database["public"]["Enums"]["media_folder"]
          id?: string
          legacy_id?: number | null
          mime_type?: string
          site_id?: string
          size_bytes?: number
          source?: Database["public"]["Enums"]["media_source"]
          storage_path?: string | null
          updated_at?: string
          uploaded_at?: string
          url?: string
          url_hash?: string | null
          usage_count?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "media_assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel_browser: boolean
          channel_email: boolean
          created_at: string
          email_blog_updates: boolean
          email_contact_submissions: boolean
          email_marketing: boolean
          email_new_messages: boolean
          email_project_updates: boolean
          email_system_alerts: boolean
          frequency: Database["public"]["Enums"]["notification_frequency"]
          quiet_hours_end: string
          quiet_hours_start: string
          quiet_hours_timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_browser?: boolean
          channel_email?: boolean
          created_at?: string
          email_blog_updates?: boolean
          email_contact_submissions?: boolean
          email_marketing?: boolean
          email_new_messages?: boolean
          email_project_updates?: boolean
          email_system_alerts?: boolean
          frequency?: Database["public"]["Enums"]["notification_frequency"]
          quiet_hours_end?: string
          quiet_hours_start?: string
          quiet_hours_timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_browser?: boolean
          channel_email?: boolean
          created_at?: string
          email_blog_updates?: boolean
          email_contact_submissions?: boolean
          email_marketing?: boolean
          email_new_messages?: boolean
          email_project_updates?: boolean
          email_system_alerts?: boolean
          frequency?: Database["public"]["Enums"]["notification_frequency"]
          quiet_hours_end?: string
          quiet_hours_start?: string
          quiet_hours_timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_image_url: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          email: string | null
          email_verified_at: string | null
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          location: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          site_id: string
          social_links: Json
          updated_at: string
          username: string | null
          version: number
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          email_verified_at?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          last_login_at?: string | null
          location?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          site_id: string
          social_links?: Json
          updated_at?: string
          username?: string | null
          version?: number
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          email_verified_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          location?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          site_id?: string
          social_links?: Json
          updated_at?: string
          username?: string | null
          version?: number
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      project_gallery_images: {
        Row: {
          created_at: string
          file_name: string | null
          id: string
          project_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          id?: string
          project_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          id?: string
          project_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_gallery_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tags: {
        Row: {
          id: string
          project_id: string
          sort_order: number
          tag: string
        }
        Insert: {
          id?: string
          project_id: string
          sort_order?: number
          tag: string
        }
        Update: {
          id?: string
          project_id?: string
          sort_order?: number
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          category_key: string
          created_at: string
          deleted_at: string | null
          featured_image_url: string | null
          full_description: string
          id: string
          is_featured: boolean
          legacy_id: number | null
          live_url: string | null
          repo_url: string | null
          scene_key: string | null
          short_description: string
          site_id: string
          sort_order: number
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          category_key: string
          created_at?: string
          deleted_at?: string | null
          featured_image_url?: string | null
          full_description: string
          id?: string
          is_featured?: boolean
          legacy_id?: number | null
          live_url?: string | null
          repo_url?: string | null
          scene_key?: string | null
          short_description: string
          site_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          category_key?: string
          created_at?: string
          deleted_at?: string | null
          featured_image_url?: string | null
          full_description?: string
          id?: string
          is_featured?: boolean
          legacy_id?: number | null
          live_url?: string | null
          repo_url?: string | null
          scene_key?: string | null
          short_description?: string
          site_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "projects_site_id_category_key_fkey"
            columns: ["site_id", "category_key"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["site_id", "key"]
          },
          {
            foreignKeyName: "projects_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "projects_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_activities: {
        Row: {
          action_description: string | null
          action_title: string
          created_at: string
          id: string
          metadata: Json
          site_id: string
          status: Database["public"]["Enums"]["activity_status"]
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string | null
        }
        Insert: {
          action_description?: string | null
          action_title: string
          created_at?: string
          id?: string
          metadata?: Json
          site_id: string
          status?: Database["public"]["Enums"]["activity_status"]
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string | null
        }
        Update: {
          action_description?: string | null
          action_title?: string
          created_at?: string
          id?: string
          metadata?: Json
          site_id?: string
          status?: Database["public"]["Enums"]["activity_status"]
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recent_activities_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "recent_activities_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_settings: {
        Row: {
          created_at: string
          two_factor_enabled: boolean
          two_factor_method:
            | Database["public"]["Enums"]["two_factor_method"]
            | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          two_factor_enabled?: boolean
          two_factor_method?:
            | Database["public"]["Enums"]["two_factor_method"]
            | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          two_factor_enabled?: boolean
          two_factor_method?:
            | Database["public"]["Enums"]["two_factor_method"]
            | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_dashboard_stats: {
        Row: {
          refreshed_at: string
          site_id: string
          total_blog_posts: number
          total_contact_messages: number
          total_experience: number
          total_media: number
          total_projects: number
          total_technologies: number
          total_testimonials: number
        }
        Insert: {
          refreshed_at?: string
          site_id: string
          total_blog_posts?: number
          total_contact_messages?: number
          total_experience?: number
          total_media?: number
          total_projects?: number
          total_technologies?: number
          total_testimonials?: number
        }
        Update: {
          refreshed_at?: string
          site_id?: string
          total_blog_posts?: number
          total_contact_messages?: number
          total_experience?: number
          total_media?: number
          total_projects?: number
          total_technologies?: number
          total_testimonials?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_dashboard_stats_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "site_dashboard_stats_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          admin_email: string | null
          appearance_settings: Json
          contact_message_columns: Json
          created_at: string
          date_format: string | null
          default_view: Database["public"]["Enums"]["default_view"]
          id: string
          items_per_page: number
          language: string
          maintenance_mode: boolean
          profile_bio: string | null
          profile_dob: string | null
          profile_full_name: string | null
          profile_location: string | null
          profile_phone: string | null
          profile_role: string | null
          profile_social_links: Json
          profile_username: string | null
          profile_website: string | null
          site_description: string | null
          site_id: string
          site_tagline: string | null
          site_title: string
          site_url: string | null
          time_format: string | null
          timezone: string | null
          updated_at: string
          version: number
        }
        Insert: {
          admin_email?: string | null
          appearance_settings?: Json
          contact_message_columns?: Json
          created_at?: string
          date_format?: string | null
          default_view?: Database["public"]["Enums"]["default_view"]
          id?: string
          items_per_page?: number
          language?: string
          maintenance_mode?: boolean
          profile_bio?: string | null
          profile_dob?: string | null
          profile_full_name?: string | null
          profile_location?: string | null
          profile_phone?: string | null
          profile_role?: string | null
          profile_social_links?: Json
          profile_username?: string | null
          profile_website?: string | null
          site_description?: string | null
          site_id: string
          site_tagline?: string | null
          site_title?: string
          site_url?: string | null
          time_format?: string | null
          timezone?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          admin_email?: string | null
          appearance_settings?: Json
          contact_message_columns?: Json
          created_at?: string
          date_format?: string | null
          default_view?: Database["public"]["Enums"]["default_view"]
          id?: string
          items_per_page?: number
          language?: string
          maintenance_mode?: boolean
          profile_bio?: string | null
          profile_dob?: string | null
          profile_full_name?: string | null
          profile_location?: string | null
          profile_phone?: string | null
          profile_role?: string | null
          profile_social_links?: Json
          profile_username?: string | null
          profile_website?: string | null
          site_description?: string | null
          site_id?: string
          site_tagline?: string | null
          site_title?: string
          site_url?: string | null
          time_format?: string | null
          timezone?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "site_settings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      technologies: {
        Row: {
          category_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          documentation_url: string | null
          id: string
          is_featured: boolean
          legacy_id: number | null
          level_key: Database["public"]["Enums"]["technology_level"]
          name: string
          site_id: string
          sort_order: number
          updated_at: string
          version: number
          years_experience: number | null
        }
        Insert: {
          category_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          documentation_url?: string | null
          id?: string
          is_featured?: boolean
          legacy_id?: number | null
          level_key: Database["public"]["Enums"]["technology_level"]
          name: string
          site_id: string
          sort_order?: number
          updated_at?: string
          version?: number
          years_experience?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          documentation_url?: string | null
          id?: string
          is_featured?: boolean
          legacy_id?: number | null
          level_key?: Database["public"]["Enums"]["technology_level"]
          name?: string
          site_id?: string
          sort_order?: number
          updated_at?: string
          version?: number
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "technologies_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tool_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technologies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "technologies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          avatar_alt: string | null
          avatar_url: string | null
          client_name: string
          client_role: string | null
          company: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_featured: boolean
          legacy_id: number | null
          quote: string
          rating: number
          site_id: string
          updated_at: string
          version: number
        }
        Insert: {
          avatar_alt?: string | null
          avatar_url?: string | null
          client_name: string
          client_role?: string | null
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_featured?: boolean
          legacy_id?: number | null
          quote: string
          rating?: number
          site_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          avatar_alt?: string | null
          avatar_url?: string | null
          client_name?: string
          client_role?: string | null
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_featured?: boolean
          legacy_id?: number | null
          quote?: string
          rating?: number
          site_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "testimonials_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_categories: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          icon_class: string | null
          id: string
          key: string
          label: string
          legacy_id: number | null
          proficiency_pct: number
          site_id: string
          sort_order: number
          updated_at: string
          version: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon_class?: string | null
          id?: string
          key: string
          label: string
          legacy_id?: number | null
          proficiency_pct?: number
          site_id: string
          sort_order?: number
          updated_at?: string
          version?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon_class?: string | null
          id?: string
          key?: string
          label?: string
          legacy_id?: number | null
          proficiency_pct?: number
          site_id?: string
          sort_order?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tool_categories_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "tool_categories_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_items: {
        Row: {
          category_id: string
          created_at: string
          icon_class: string | null
          icon_url: string | null
          id: string
          legacy_id: number | null
          name: string
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          icon_class?: string | null
          icon_url?: string | null
          id?: string
          legacy_id?: number | null
          name: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          icon_class?: string | null
          icon_url?: string | null
          id?: string
          legacy_id?: number | null
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "tool_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tool_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      two_factor_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "two_factor_backup_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          activity_id: string | null
          actor_user_id: string | null
          body: string | null
          category: string
          created_at: string
          icon: string | null
          id: string
          link_path: string | null
          metadata: Json
          read_at: string | null
          site_id: string
          title: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          actor_user_id?: string | null
          body?: string | null
          category?: string
          created_at?: string
          icon?: string | null
          id?: string
          link_path?: string | null
          metadata?: Json
          read_at?: string | null
          site_id: string
          title: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          actor_user_id?: string | null
          body?: string | null
          category?: string
          created_at?: string
          icon?: string | null
          id?: string
          link_path?: string | null
          metadata?: Json
          read_at?: string | null
          site_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "recent_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "dashboard_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "user_notifications_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          device_label: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_current: boolean
          location: string | null
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_current?: boolean
          location?: string | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_current?: boolean
          location?: string | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      dashboard_stats: {
        Row: {
          site_id: string | null
          total_blog_posts: number | null
          total_contact_messages: number | null
          total_experience: number | null
          total_media: number | null
          total_projects: number | null
          total_technologies: number | null
          total_testimonials: number | null
        }
        Insert: {
          site_id?: string | null
          total_blog_posts?: never
          total_contact_messages?: never
          total_experience?: never
          total_media?: never
          total_projects?: never
          total_technologies?: never
          total_testimonials?: never
        }
        Update: {
          site_id?: string | null
          total_blog_posts?: never
          total_contact_messages?: never
          total_experience?: never
          total_media?: never
          total_projects?: never
          total_technologies?: never
          total_testimonials?: never
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_authenticated_admin: { Args: never; Returns: boolean }
      is_authenticated_staff: { Args: never; Returns: boolean }
      pa_admin_foreign_key_edges: {
        Args: never
        Returns: {
          child_table: string
          parent_table: string
        }[]
      }
      pa_admin_public_table_stats: {
        Args: never
        Returns: {
          row_count: number
          size_bytes: number
          table_name: string
        }[]
      }
      pa_admin_public_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      pa_prune_user_sessions: {
        Args: { p_keep_days?: number }
        Returns: number
      }
      pa_refresh_dashboard_stats: {
        Args: { p_site_id: string }
        Returns: undefined
      }
      pa_refresh_media_usage_counts: {
        Args: { p_counts: Json; p_site_id: string }
        Returns: undefined
      }
      pa_save_blog_posts_batch: {
        Args: { p_delete_post_ids?: string[]; p_posts: Json; p_site_id: string }
        Returns: undefined
      }
      pa_save_projects_batch: {
        Args: {
          p_delete_project_ids?: string[]
          p_projects: Json
          p_site_id: string
        }
        Returns: undefined
      }
      purge_expired_recent_activities: { Args: never; Returns: undefined }
    }
    Enums: {
      activity_status:
        | "success"
        | "completed"
        | "created"
        | "info"
        | "warning"
        | "failed"
        | "sent"
        | "uploaded"
      activity_type: "user_action" | "system_event" | "content_change" | "other"
      app_role: "super_admin" | "admin" | "editor" | "viewer"
      backup_status: "pending" | "completed" | "failed"
      blog_post_status: "Draft" | "Published"
      contact_message_status: "new" | "read" | "replied" | "spam"
      default_view: "grid" | "list"
      employment_type:
        | "full-time"
        | "part-time"
        | "contract"
        | "freelance"
        | "internship"
      login_activity_status: "success" | "failed" | "logout"
      media_folder:
        | "general"
        | "projects"
        | "avatars"
        | "icons"
        | "blog"
        | "testimonials"
        | "contact"
      media_source: "manual" | "entity"
      notification_frequency: "instant" | "daily" | "weekly"
      project_status:
        | "Completed"
        | "In Progress"
        | "Pending"
        | "On Hold"
        | "Cancelled"
      technology_level: "beginner" | "intermediate" | "advanced" | "expert"
      theme_mode: "light" | "dark" | "system"
      two_factor_method: "authenticator" | "sms" | "email"
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
      activity_status: [
        "success",
        "completed",
        "created",
        "info",
        "warning",
        "failed",
        "sent",
        "uploaded",
      ],
      activity_type: ["user_action", "system_event", "content_change", "other"],
      app_role: ["super_admin", "admin", "editor", "viewer"],
      backup_status: ["pending", "completed", "failed"],
      blog_post_status: ["Draft", "Published"],
      contact_message_status: ["new", "read", "replied", "spam"],
      default_view: ["grid", "list"],
      employment_type: [
        "full-time",
        "part-time",
        "contract",
        "freelance",
        "internship",
      ],
      login_activity_status: ["success", "failed", "logout"],
      media_folder: [
        "general",
        "projects",
        "avatars",
        "icons",
        "blog",
        "testimonials",
        "contact",
      ],
      media_source: ["manual", "entity"],
      notification_frequency: ["instant", "daily", "weekly"],
      project_status: [
        "Completed",
        "In Progress",
        "Pending",
        "On Hold",
        "Cancelled",
      ],
      technology_level: ["beginner", "intermediate", "advanced", "expert"],
      theme_mode: ["light", "dark", "system"],
      two_factor_method: ["authenticator", "sms", "email"],
    },
  },
} as const
