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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          group_id: string
          id: string
          metadata: Json | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          group_id: string
          id?: string
          metadata?: Json | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          group_id?: string
          id?: string
          metadata?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          best_time_ms: number | null
          challenge_id: string
          created_at: string
          ended_at: string | null
          given_up: boolean
          id: string
          score: number
          started_at: string | null
          user_id: string
        }
        Insert: {
          best_time_ms?: number | null
          challenge_id: string
          created_at?: string
          ended_at?: string | null
          given_up?: boolean
          id?: string
          score?: number
          started_at?: string | null
          user_id: string
        }
        Update: {
          best_time_ms?: number | null
          challenge_id?: string
          created_at?: string
          ended_at?: string | null
          given_up?: boolean
          id?: string
          score?: number
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          accepted_by: string[] | null
          challenge_type: string
          created_at: string
          created_by: string
          declined_by: string[] | null
          duration_days: number
          group_id: string
          id: string
          name: string
          reset_interval: string | null
          start_date: string
        }
        Insert: {
          accepted_by?: string[] | null
          challenge_type: string
          created_at?: string
          created_by: string
          declined_by?: string[] | null
          duration_days?: number
          group_id: string
          id?: string
          name: string
          reset_interval?: string | null
          start_date: string
        }
        Update: {
          accepted_by?: string[] | null
          challenge_type?: string
          created_at?: string
          created_by?: string
          declined_by?: string[] | null
          duration_days?: number
          group_id?: string
          id?: string
          name?: string
          reset_interval?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_challenges: {
        Row: {
          best_time_creator: number | null
          best_time_friend: number | null
          challenge_type: string
          created_at: string
          created_by: string
          ended_at: string | null
          friendship_id: string
          id: string
          name: string
          score_creator: number | null
          score_friend: number | null
          started_at: string | null
        }
        Insert: {
          best_time_creator?: number | null
          best_time_friend?: number | null
          challenge_type: string
          created_at?: string
          created_by: string
          ended_at?: string | null
          friendship_id: string
          id?: string
          name: string
          score_creator?: number | null
          score_friend?: number | null
          started_at?: string | null
        }
        Update: {
          best_time_creator?: number | null
          best_time_friend?: number | null
          challenge_type?: string
          created_at?: string
          created_by?: string
          ended_at?: string | null
          friendship_id?: string
          id?: string
          name?: string
          score_creator?: number | null
          score_friend?: number | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_challenges_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: false
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          friendship_id: string
          id: string
          image_url: string | null
          is_snap: boolean
          saved_by: string[] | null
          sender_id: string
          viewed_by: string[] | null
        }
        Insert: {
          content: string
          created_at?: string
          friendship_id: string
          id?: string
          image_url?: string | null
          is_snap?: boolean
          saved_by?: string[] | null
          sender_id: string
          viewed_by?: string[] | null
        }
        Update: {
          content?: string
          created_at?: string
          friendship_id?: string
          id?: string
          image_url?: string | null
          is_snap?: boolean
          saved_by?: string[] | null
          sender_id?: string
          viewed_by?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: false
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_todos: {
        Row: {
          completed_by: string[] | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          friendship_id: string
          id: string
          recurrence: string | null
          title: string
        }
        Insert: {
          completed_by?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          friendship_id: string
          id?: string
          recurrence?: string | null
          title: string
        }
        Update: {
          completed_by?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          friendship_id?: string
          id?: string
          recurrence?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_todos_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: false
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "group_events"
            referencedColumns: ["id"]
          },
        ]
      }
      flashback_media: {
        Row: {
          created_at: string
          flashback_id: string
          id: string
          media_type: string
          media_url: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          flashback_id: string
          id?: string
          media_type?: string
          media_url: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          flashback_id?: string
          id?: string
          media_type?: string
          media_url?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashback_media_flashback_id_fkey"
            columns: ["flashback_id"]
            isOneToOne: false
            referencedRelation: "group_flashbacks"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_profile_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_requester_profile_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      group_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_time: string
          event_date: string
          group_id: string
          id: string
          name: string
          start_time: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_time: string
          event_date: string
          group_id: string
          id?: string
          name: string
          start_time: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string
          event_date?: string
          group_id?: string
          id?: string
          name?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_flashbacks: {
        Row: {
          allow_photos: boolean
          allow_videos: boolean
          created_at: string
          created_by: string
          description: string | null
          group_id: string
          id: string
          title: string
          unlock_at: string
        }
        Insert: {
          allow_photos?: boolean
          allow_videos?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          group_id: string
          id?: string
          title: string
          unlock_at: string
        }
        Update: {
          allow_photos?: boolean
          allow_videos?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          group_id?: string
          id?: string
          title?: string
          unlock_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_flashbacks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_join_requests: {
        Row: {
          created_at: string
          group_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_list_items: {
        Row: {
          completed: boolean
          completed_by: string | null
          created_at: string
          id: string
          list_id: string
          position: number
          title: string
        }
        Insert: {
          completed?: boolean
          completed_by?: string | null
          created_at?: string
          id?: string
          list_id: string
          position?: number
          title: string
        }
        Update: {
          completed?: boolean
          completed_by?: string | null
          created_at?: string
          id?: string
          list_id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "group_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      group_lists: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          group_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          group_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          group_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_lists_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          can_challenges: boolean
          can_chat: boolean
          can_events: boolean
          can_todos: boolean
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          can_challenges?: boolean
          can_chat?: boolean
          can_events?: boolean
          can_todos?: boolean
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          can_challenges?: boolean
          can_chat?: boolean
          can_events?: boolean
          can_todos?: boolean
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          image_url: string | null
          is_snap: boolean
          saved_by: string[] | null
          user_id: string
          viewed_by: string[] | null
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          image_url?: string | null
          is_snap?: boolean
          saved_by?: string[] | null
          user_id: string
          viewed_by?: string[] | null
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          image_url?: string | null
          is_snap?: boolean
          saved_by?: string[] | null
          user_id?: string
          viewed_by?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      group_todo_completions: {
        Row: {
          completed_at: string
          id: string
          todo_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          todo_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          todo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_todo_completions_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "group_todos"
            referencedColumns: ["id"]
          },
        ]
      }
      group_todos: {
        Row: {
          assigned_to: string[] | null
          completion_type: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          due_time: string | null
          group_id: string
          id: string
          label_color: string | null
          label_name: string | null
          recurrence: string | null
          title: string
        }
        Insert: {
          assigned_to?: string[] | null
          completion_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          group_id: string
          id?: string
          label_color?: string | null
          label_name?: string | null
          recurrence?: string | null
          title: string
        }
        Update: {
          assigned_to?: string[] | null
          completion_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          group_id?: string
          id?: string
          label_color?: string | null
          label_name?: string | null
          recurrence?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_todos_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          has_challenges: boolean
          has_events: boolean
          has_flashbacks: boolean
          has_todos: boolean
          id: string
          join_code: string
          max_members: number
          name: string
          owner_id: string
          spotify_playlist_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          has_challenges?: boolean
          has_events?: boolean
          has_flashbacks?: boolean
          has_todos?: boolean
          id?: string
          join_code?: string
          max_members?: number
          name: string
          owner_id: string
          spotify_playlist_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          has_challenges?: boolean
          has_events?: boolean
          has_flashbacks?: boolean
          has_todos?: boolean
          id?: string
          join_code?: string
          max_members?: number
          name?: string
          owner_id?: string
          spotify_playlist_url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          from_user_id: string | null
          from_user_name: string | null
          group_id: string | null
          group_name: string | null
          id: string
          read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          from_user_id?: string | null
          from_user_name?: string | null
          group_id?: string | null
          group_name?: string | null
          id?: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          from_user_id?: string | null
          from_user_name?: string | null
          group_id?: string | null
          group_name?: string | null
          id?: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_challenge_times: {
        Row: {
          challenge_id: string
          id: string
          recorded_at: string
          time_ms: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          recorded_at?: string
          time_ms: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          recorded_at?: string
          time_ms?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_challenge_times_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "personal_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_challenges: {
        Row: {
          best_time_ms: number | null
          challenge_type: string
          created_at: string
          end_date: string | null
          end_time: string | null
          ended_at: string | null
          given_up: boolean
          id: string
          label_id: string | null
          longest_time_ms: number | null
          name: string
          score: number
          started_at: string | null
          user_id: string
        }
        Insert: {
          best_time_ms?: number | null
          challenge_type: string
          created_at?: string
          end_date?: string | null
          end_time?: string | null
          ended_at?: string | null
          given_up?: boolean
          id?: string
          label_id?: string | null
          longest_time_ms?: number | null
          name: string
          score?: number
          started_at?: string | null
          user_id: string
        }
        Update: {
          best_time_ms?: number | null
          challenge_type?: string
          created_at?: string
          end_date?: string | null
          end_time?: string | null
          ended_at?: string | null
          given_up?: boolean
          id?: string
          label_id?: string | null
          longest_time_ms?: number | null
          name?: string
          score?: number
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_challenges_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "todo_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          expires_at: string | null
          group_id: string | null
          group_todo_id: string | null
          id: string
          image_url: string | null
          tagged_user_ids: string[] | null
          todo_id: string | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          expires_at?: string | null
          group_id?: string | null
          group_todo_id?: string | null
          id?: string
          image_url?: string | null
          tagged_user_ids?: string[] | null
          todo_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string | null
          group_id?: string | null
          group_todo_id?: string | null
          id?: string
          image_url?: string | null
          tagged_user_ids?: string[] | null
          todo_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_group_todo_id_fkey"
            columns: ["group_todo_id"]
            isOneToOne: false
            referencedRelation: "group_todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          hashtag_code: string
          id: string
          instagram: string | null
          is_private: boolean
          pinterest: string | null
          snapchat: string | null
          spotify: string | null
          tiktok: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          hashtag_code: string
          id?: string
          instagram?: string | null
          is_private?: boolean
          pinterest?: string | null
          snapchat?: string | null
          spotify?: string | null
          tiktok?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          hashtag_code?: string
          id?: string
          instagram?: string | null
          is_private?: boolean
          pinterest?: string | null
          snapchat?: string | null
          spotify?: string | null
          tiktok?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      respect_points: {
        Row: {
          created_at: string
          from_user_id: string
          given_at: string
          id: string
          post_id: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          given_at?: string
          id?: string
          post_id: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          given_at?: string
          id?: string
          post_id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "respect_points_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_completions: {
        Row: {
          completed_at: string
          description: string | null
          id: string
          label_id: string | null
          recurrence: string | null
          title: string
          todo_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          description?: string | null
          id?: string
          label_id?: string | null
          recurrence?: string | null
          title: string
          todo_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          description?: string | null
          id?: string
          label_id?: string | null
          recurrence?: string | null
          title?: string
          todo_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_completions_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "todo_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_completions_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_labels: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      todo_streaks: {
        Row: {
          best_streak: number
          created_at: string
          current_streak: number
          id: string
          last_completed_period: string | null
          recurrence: string
          todo_id: string | null
          todo_title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          id?: string
          last_completed_period?: string | null
          recurrence?: string
          todo_id?: string | null
          todo_title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          id?: string
          last_completed_period?: string | null
          recurrence?: string
          todo_id?: string | null
          todo_title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_streaks_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          label_id: string | null
          pinned: boolean
          recurrence: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          label_id?: string | null
          pinned?: boolean
          recurrence?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          label_id?: string | null
          pinned?: boolean
          recurrence?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "todo_labels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_hashtag_code: { Args: never; Returns: string }
      generate_join_code: { Args: never; Returns: string }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
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
    Enums: {},
  },
} as const
