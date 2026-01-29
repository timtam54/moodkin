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
export type SenderType = 'photographer' | 'client'

export interface Database {
  public: {
    Tables: {
      photographers: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
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
      clients: {
        Row: {
          id: string
          photographer_id: string
          email: string
          name: string | null
          phone: string | null
          address: string | null
          notes: string | null
          auth_provider: string | null
          auth_provider_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          photographer_id: string
          email: string
          name?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          auth_provider?: string | null
          auth_provider_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          photographer_id?: string
          email?: string
          name?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          auth_provider?: string | null
          auth_provider_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          photographer_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          photographer_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          photographer_id?: string
          name?: string
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          photographer_id: string
          client_id: string
          category_id: string | null
          title: string
          status: ConversationStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          photographer_id: string
          client_id: string
          category_id?: string | null
          title: string
          status?: ConversationStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          photographer_id?: string
          client_id?: string
          category_id?: string | null
          title?: string
          status?: ConversationStatus
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_type: SenderType
          sender_id: string
          text_content: string | null
          canvas_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_type: SenderType
          sender_id: string
          text_content?: string | null
          canvas_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_type?: SenderType
          sender_id?: string
          text_content?: string | null
          canvas_data?: Json | null
          created_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          photographer_id: string
          category_id: string | null
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          photographer_id: string
          category_id?: string | null
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          photographer_id?: string
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
          client_id: string
          conversation_id: string
          token: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          conversation_id: string
          token: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          conversation_id?: string
          token?: string
          expires_at?: string
          created_at?: string
        }
      }
    }
  }
}

// Convenience types
export type Photographer = Database['public']['Tables']['photographers']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Template = Database['public']['Tables']['templates']['Row']
export type TemplateQuestion = Database['public']['Tables']['template_questions']['Row']
export type ClientInviteToken = Database['public']['Tables']['client_invite_tokens']['Row']

// Extended types with relations
export type ConversationWithRelations = Conversation & {
  client: Client
  category: Category | null
  messages?: Message[]
}

export type ClientWithConversations = Client & {
  conversations: Conversation[]
}

export type TemplateWithQuestions = Template & {
  questions: TemplateQuestion[]
  category: Category | null
}
