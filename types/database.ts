export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'expired'
export type CreativeClientType = 'creative' | 'client'
export type ConversationStatus = 'active' | 'archived'
export type AssetType = 'image' | 'link'
export type ReactionType = 'like' | 'redflag'
export type ProjectUserRole = 'creative' | 'client'
export type ProjectInviteStatus = 'pending' | 'accepted' | 'declined'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          phone: string | null
          address: string | null
          notes: string | null
          auth_provider: string | null
          auth_provider_id: string | null
          stripe_customer_id: string | null
          subscription_status: SubscriptionStatus
          subscription_ends_at: string | null
          creative_client: CreativeClientType | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          avatar_url?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          auth_provider?: string | null
          auth_provider_id?: string | null
          stripe_customer_id?: string | null
          subscription_status?: SubscriptionStatus
          subscription_ends_at?: string | null
          creative_client?: CreativeClientType | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          auth_provider?: string | null
          auth_provider_id?: string | null
          stripe_customer_id?: string | null
          subscription_status?: SubscriptionStatus
          subscription_ends_at?: string | null
          creative_client?: CreativeClientType | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          category_id: string | null
          title: string
          cover_image_url: string | null
          status: ConversationStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          title: string
          cover_image_url?: string | null
          status?: ConversationStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          title?: string
          cover_image_url?: string | null
          status?: ConversationStatus
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          text_content: string | null
          canvas_data: Json | null
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          text_content?: string | null
          canvas_data?: Json | null
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          text_content?: string | null
          canvas_data?: Json | null
          image_url?: string | null
          created_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          name?: string
          created_at?: string
        }
      }
      template_questions: {
        Row: {
          id: string
          template_id: string
          question_text: string
          starter_canvas_data: Json | null
          sort_order: number
        }
        Insert: {
          id?: string
          template_id: string
          question_text: string
          starter_canvas_data?: Json | null
          sort_order?: number
        }
        Update: {
          id?: string
          template_id?: string
          question_text?: string
          starter_canvas_data?: Json | null
          sort_order?: number
        }
      }
      client_invite_tokens: {
        Row: {
          id: string
          user_id: string
          conversation_id: string
          token: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id: string
          token: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string
          token?: string
          expires_at?: string
          created_at?: string
        }
      }
      project_assets: {
        Row: {
          id: string
          conversation_id: string
          url: string
          filename: string
          asset_type: AssetType
          title: string | null
          thumbnail_url: string | null
          color_palette: string[] | null
          uploaded_by_id: string
          uploaded_by_name: string | null
          creative: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          url: string
          filename: string
          asset_type?: AssetType
          title?: string | null
          thumbnail_url?: string | null
          color_palette?: string[] | null
          uploaded_by_id: string
          uploaded_by_name?: string | null
          creative?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          url?: string
          filename?: string
          asset_type?: AssetType
          title?: string | null
          thumbnail_url?: string | null
          color_palette?: string[] | null
          uploaded_by_id?: string
          uploaded_by_name?: string | null
          creative?: boolean
          created_at?: string
        }
      }
      asset_reactions: {
        Row: {
          id: string
          asset_id: string
          user_id: string
          user_name: string | null
          reaction_type: ReactionType
          created_at: string
        }
        Insert: {
          id?: string
          asset_id: string
          user_id: string
          user_name?: string | null
          reaction_type: ReactionType
          created_at?: string
        }
        Update: {
          id?: string
          asset_id?: string
          user_id?: string
          user_name?: string | null
          reaction_type?: ReactionType
          created_at?: string
        }
      }
      asset_comments: {
        Row: {
          id: string
          asset_id: string
          user_id: string
          user_name: string | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          asset_id: string
          user_id: string
          user_name?: string | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          asset_id?: string
          user_id?: string
          user_name?: string | null
          content?: string
          created_at?: string
        }
      }
      moodboards: {
        Row: {
          id: string
          conversation_id: string
          title: string
          description: string | null
          created_by_id: string
          created_by_name: string | null
          background_color: string
          grid_layout: string
          border_enabled: boolean
          border_color: string
          border_radius: number
          border_width: number
          spacing: number
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          title: string
          description?: string | null
          created_by_id: string
          created_by_name?: string | null
          background_color?: string
          grid_layout?: string
          border_enabled?: boolean
          border_color?: string
          border_radius?: number
          border_width?: number
          spacing?: number
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          title?: string
          description?: string | null
          created_by_id?: string
          created_by_name?: string | null
          background_color?: string
          grid_layout?: string
          border_enabled?: boolean
          border_color?: string
          border_radius?: number
          border_width?: number
          spacing?: number
          created_at?: string
        }
      }
      moodboard_images: {
        Row: {
          id: string
          moodboard_id: string
          asset_id: string
          position: number
          score: number
          created_at: string
        }
        Insert: {
          id?: string
          moodboard_id: string
          asset_id: string
          position: number
          score?: number
          created_at?: string
        }
        Update: {
          id?: string
          moodboard_id?: string
          asset_id?: string
          position?: number
          score?: number
          created_at?: string
        }
      }
      project_users: {
        Row: {
          id: string
          project_id: string
          email: string
          role: ProjectUserRole
          user_id: string | null
          invite_token: string
          invite_status: ProjectInviteStatus
          invited_by_id: string
          is_owner: boolean
          invited_at: string
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          email: string
          role: ProjectUserRole
          user_id?: string | null
          invite_token?: string
          invite_status?: ProjectInviteStatus
          invited_by_id: string
          is_owner?: boolean
          invited_at?: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          email?: string
          role?: ProjectUserRole
          user_id?: string | null
          invite_token?: string
          invite_status?: ProjectInviteStatus
          invited_by_id?: string
          is_owner?: boolean
          invited_at?: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
      }
      project_colours: {
        Row: {
          id: string
          conversation_id: string
          hex_color: string
          name: string | null
          added_by_id: string
          added_by_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          hex_color: string
          name?: string | null
          added_by_id: string
          added_by_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          hex_color?: string
          name?: string | null
          added_by_id?: string
          added_by_name?: string | null
          created_at?: string
        }
      }
      colour_reactions: {
        Row: {
          id: string
          colour_id: string
          user_id: string
          user_name: string | null
          reaction_type: ReactionType
          created_at: string
        }
        Insert: {
          id?: string
          colour_id: string
          user_id: string
          user_name?: string | null
          reaction_type: ReactionType
          created_at?: string
        }
        Update: {
          id?: string
          colour_id?: string
          user_id?: string
          user_name?: string | null
          reaction_type?: ReactionType
          created_at?: string
        }
      }
      colour_comments: {
        Row: {
          id: string
          colour_id: string
          user_id: string
          user_name: string | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          colour_id: string
          user_id: string
          user_name?: string | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          colour_id?: string
          user_id?: string
          user_name?: string | null
          content?: string
          created_at?: string
        }
      }
    }
  }
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Template = Database['public']['Tables']['templates']['Row']
export type TemplateQuestion = Database['public']['Tables']['template_questions']['Row']
export type ProjectAsset = Database['public']['Tables']['project_assets']['Row']
export type AssetReaction = Database['public']['Tables']['asset_reactions']['Row']
export type AssetComment = Database['public']['Tables']['asset_comments']['Row']
export type Moodboard = Database['public']['Tables']['moodboards']['Row']
export type MoodboardImage = Database['public']['Tables']['moodboard_images']['Row']
export type ProjectUser = Database['public']['Tables']['project_users']['Row']
export type ProjectUserWithUser = ProjectUser & {
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar_url'> | null
}
export type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row']
export type ProjectColour = Database['public']['Tables']['project_colours']['Row']
export type ColourReaction = Database['public']['Tables']['colour_reactions']['Row']
export type ColourComment = Database['public']['Tables']['colour_comments']['Row']

// Extended moodboard type with images
export type MoodboardWithImages = Moodboard & {
  images: (MoodboardImage & { asset: ProjectAsset })[]
}

// Extended asset type with reactions and comments
export type ProjectAssetWithInteractions = ProjectAsset & {
  reactions: AssetReaction[]
  comments: AssetComment[]
}

// Extended types with relations
export type ConversationWithRelations = Conversation & {
  category: Category | null
  messages?: Message[]
}

export type TemplateWithQuestions = Template & {
  questions: TemplateQuestion[]
  category: Category | null
}
