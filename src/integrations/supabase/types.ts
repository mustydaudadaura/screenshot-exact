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
      attendance: {
        Row: {
          clock_in: string
          clock_out: string | null
          id: string
          recorded_by: string | null
          work_date: string
          worker_id: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          id?: string
          recorded_by?: string | null
          work_date?: string
          worker_id: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          id?: string
          recorded_by?: string | null
          work_date?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          address: string | null
          business_name: string
          currency: string
          default_credit_limit: number
          dispatch_prefix: string
          id: number
          invoice_prefix: string
          phone: string | null
          receipt_prefix: string
          remittance_deadline_hours: number
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_name?: string
          currency?: string
          default_credit_limit?: number
          dispatch_prefix?: string
          id?: number
          invoice_prefix?: string
          phone?: string | null
          receipt_prefix?: string
          remittance_deadline_hours?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_name?: string
          currency?: string
          default_credit_limit?: number
          dispatch_prefix?: string
          id?: number
          invoice_prefix?: string
          phone?: string | null
          receipt_prefix?: string
          remittance_deadline_hours?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      department_pay_rates: {
        Row: {
          created_by: string | null
          department_id: string
          effective_from: string
          id: string
          rate_per_bag: number
        }
        Insert: {
          created_by?: string | null
          department_id: string
          effective_from?: string
          id?: string
          rate_per_bag: number
        }
        Update: {
          created_by?: string | null
          department_id?: string
          effective_from?: string
          id?: string
          rate_per_bag?: number
        }
        Relationships: [
          {
            foreignKeyName: "department_pay_rates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      production_logs: {
        Row: {
          bags: number
          created_at: string
          department_id: string
          id: string
          rate_per_bag: number
          recorded_by: string | null
          work_date: string
        }
        Insert: {
          bags: number
          created_at?: string
          department_id: string
          id?: string
          rate_per_bag: number
          recorded_by?: string | null
          work_date: string
        }
        Update: {
          bags?: number
          created_at?: string
          department_id?: string
          id?: string
          rate_per_bag?: number
          recorded_by?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_logs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          job_title: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_departments: {
        Row: {
          department_id: string
          id: string
          is_supervisor: boolean
          user_id: string
        }
        Insert: {
          department_id: string
          id?: string
          is_supervisor?: boolean
          user_id: string
        }
        Update: {
          department_id?: string
          id?: string
          is_supervisor?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_departments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workers: {
        Row: {
          created_at: string
          department_id: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          pin: string | null
        }
        Insert: {
          created_at?: string
          department_id: string
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          pin?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          pin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
      kiosk_punch: {
        Args: { _pin: string; _worker_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "admin"
        | "supervisor"
        | "storekeeper"
        | "baker"
        | "mixer"
        | "packager"
        | "dispatcher"
        | "sales"
        | "accountant"
        | "cleaner"
        | "security"
        | "staff"
        | "distributor"
        | "managing_director"
        | "general_manager"
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
      app_role: [
        "owner",
        "admin",
        "supervisor",
        "storekeeper",
        "baker",
        "mixer",
        "packager",
        "dispatcher",
        "sales",
        "accountant",
        "cleaner",
        "security",
        "staff",
        "distributor",
        "managing_director",
        "general_manager",
      ],
    },
  },
} as const
