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
      ai_personas: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          persona_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          persona_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          persona_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_url: string | null
          created_at: string
          description: string | null
          id: string
          issued_date: string
          title: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issued_date?: string
          title: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issued_date?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          created_at: string
          description: string | null
          estimated_duration: number
          id: string
          module_id: string
          order_index: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_duration?: number
          id?: string
          module_id: string
          order_index?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_duration?: number
          id?: string
          module_id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_codes: {
        Row: {
          code: string
          created_at: string
          credits: number
          id: string
          is_redeemed: boolean
          redeemed_at: string | null
          redeemed_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          credits: number
          id?: string
          is_redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          credits?: number
          id?: string
          is_redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount: number | null
          min_cart_value: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_cart_value?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_cart_value?: number
        }
        Relationships: []
      }
      flashcard_questions: {
        Row: {
          category: string
          created_at: string
          field_key: string
          id: string
          input_type: string
          options: Json | null
          order_index: number
          question_text: string
        }
        Insert: {
          category: string
          created_at?: string
          field_key: string
          id?: string
          input_type?: string
          options?: Json | null
          order_index?: number
          question_text: string
        }
        Update: {
          category?: string
          created_at?: string
          field_key?: string
          id?: string
          input_type?: string
          options?: Json | null
          order_index?: number
          question_text?: string
        }
        Relationships: []
      }
      flashcard_responses: {
        Row: {
          answered_at: string
          id: string
          question_id: string
          response: string
          user_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          question_id: string
          response: string
          user_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          question_id?: string
          response?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "flashcard_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          chapter_id: string
          content: string | null
          created_at: string
          id: string
          order_index: number
          title: string
        }
        Insert: {
          chapter_id: string
          content?: string | null
          created_at?: string
          id?: string
          order_index?: number
          title: string
        }
        Update: {
          chapter_id?: string
          content?: string | null
          created_at?: string
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string
          credit_cost: number
          description: string | null
          id: string
          order_index: number
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          credit_cost?: number
          description?: string | null
          id?: string
          order_index?: number
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          credit_cost?: number
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount: number
          created_at: string
          credits: number
          discount_applied: number | null
          discount_code: string | null
          id: string
          payment_id: string | null
          razorpay_order_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credits: number
          discount_applied?: number | null
          discount_code?: string | null
          id?: string
          payment_id?: string | null
          razorpay_order_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credits?: number
          discount_applied?: number | null
          discount_code?: string | null
          id?: string
          payment_id?: string | null
          razorpay_order_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          id: string
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          total_referrals: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          total_referrals?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          total_referrals?: number
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          label: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          label: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          label?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          unlocked: boolean
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          unlocked?: boolean
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          unlocked?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_progress: {
        Row: {
          completion_percentage: number
          created_at: string
          id: string
          last_accessed_at: string
          module_id: string
          unlocked: boolean
          user_id: string
        }
        Insert: {
          completion_percentage?: number
          created_at?: string
          id?: string
          last_accessed_at?: string
          module_id: string
          unlocked?: boolean
          user_id: string
        }
        Update: {
          completion_percentage?: number
          created_at?: string
          id?: string
          last_accessed_at?: string
          module_id?: string
          unlocked?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          created_at: string
          credits: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: {
        Args: { user_id_param: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
