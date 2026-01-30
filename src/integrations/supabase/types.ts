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
      assets: {
        Row: {
          collaborator_id: string | null
          created_at: string
          duration_seconds: number | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          metadata: Json | null
          project_id: string
          source_type: Database["public"]["Enums"]["source_type"] | null
          status: Database["public"]["Enums"]["asset_status"]
          storage_path: string
          updated_at: string
        }
        Insert: {
          collaborator_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          metadata?: Json | null
          project_id: string
          source_type?: Database["public"]["Enums"]["source_type"] | null
          status?: Database["public"]["Enums"]["asset_status"]
          storage_path: string
          updated_at?: string
        }
        Update: {
          collaborator_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          source_type?: Database["public"]["Enums"]["source_type"] | null
          status?: Database["public"]["Enums"]["asset_status"]
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          created_at: string
          disc_profile: Json | null
          id: string
          name: string
          primary_style: string | null
          profile_source: Database["public"]["Enums"]["profile_source_type"]
          project_id: string
          role: string | null
          role_fit_level: string | null
          role_fit_reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          disc_profile?: Json | null
          id?: string
          name: string
          primary_style?: string | null
          profile_source?: Database["public"]["Enums"]["profile_source_type"]
          project_id: string
          role?: string | null
          role_fit_level?: string | null
          role_fit_reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          disc_profile?: Json | null
          id?: string
          name?: string
          primary_style?: string | null
          profile_source?: Database["public"]["Enums"]["profile_source_type"]
          project_id?: string
          role?: string | null
          role_fit_level?: string | null
          role_fit_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      evidences: {
        Row: {
          asset_id: string | null
          benchmark: string | null
          content: string
          created_at: string
          criticality: string | null
          divergence_description: string | null
          evidence_type: Database["public"]["Enums"]["evidence_type"] | null
          id: string
          impact: string | null
          is_divergence: boolean
          notes: string | null
          pilar: Database["public"]["Enums"]["pilar"]
          project_id: string
          sequential_id: number | null
          source_description: string | null
          status: Database["public"]["Enums"]["evidence_status"]
          timecode_end: number | null
          timecode_start: number | null
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          benchmark?: string | null
          content: string
          created_at?: string
          criticality?: string | null
          divergence_description?: string | null
          evidence_type?: Database["public"]["Enums"]["evidence_type"] | null
          id?: string
          impact?: string | null
          is_divergence?: boolean
          notes?: string | null
          pilar: Database["public"]["Enums"]["pilar"]
          project_id: string
          sequential_id?: number | null
          source_description?: string | null
          status?: Database["public"]["Enums"]["evidence_status"]
          timecode_end?: number | null
          timecode_start?: number | null
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          benchmark?: string | null
          content?: string
          created_at?: string
          criticality?: string | null
          divergence_description?: string | null
          evidence_type?: Database["public"]["Enums"]["evidence_type"] | null
          id?: string
          impact?: string | null
          is_divergence?: boolean
          notes?: string | null
          pilar?: Database["public"]["Enums"]["pilar"]
          project_id?: string
          sequential_id?: number | null
          source_description?: string | null
          status?: Database["public"]["Enums"]["evidence_status"]
          timecode_end?: number | null
          timecode_start?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidences_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      initiatives: {
        Row: {
          created_at: string
          description: string | null
          effort: Database["public"]["Enums"]["initiative_effort"]
          id: string
          impact: Database["public"]["Enums"]["initiative_impact"]
          project_id: string
          reasoning: string | null
          status: Database["public"]["Enums"]["initiative_status"]
          target_pilar: Database["public"]["Enums"]["pilar"] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          effort?: Database["public"]["Enums"]["initiative_effort"]
          id?: string
          impact?: Database["public"]["Enums"]["initiative_impact"]
          project_id: string
          reasoning?: string | null
          status?: Database["public"]["Enums"]["initiative_status"]
          target_pilar?: Database["public"]["Enums"]["pilar"] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          effort?: Database["public"]["Enums"]["initiative_effort"]
          id?: string
          impact?: Database["public"]["Enums"]["initiative_impact"]
          project_id?: string
          reasoning?: string | null
          status?: Database["public"]["Enums"]["initiative_status"]
          target_pilar?: Database["public"]["Enums"]["pilar"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "initiatives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_context: string | null
          client_name: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          main_pain_points: string | null
          name: string
          project_goals: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          client_context?: string | null
          client_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          main_pain_points?: string | null
          name: string
          project_goals?: string | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          client_context?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          main_pain_points?: string | null
          name?: string
          project_goals?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_owner_or_admin: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      asset_status: "uploading" | "processing" | "completed" | "error"
      evidence_status: "pendente" | "validado" | "rejeitado" | "investigar"
      evidence_type: "fato" | "divergencia" | "ponto_forte"
      initiative_effort: "low" | "medium" | "high"
      initiative_impact: "low" | "medium" | "high"
      initiative_status: "draft" | "approved" | "in_progress" | "done"
      pilar: "pessoas" | "processos" | "dados" | "tecnologia" | "gestao"
      profile_source_type: "pdf_auto" | "ai_inferred" | "manual"
      source_type:
        | "entrevista_diretoria"
        | "entrevista_operacao"
        | "reuniao_kickoff"
        | "reuniao_vendas"
        | "briefing"
        | "documentacao"
        | "observacao_consultor"
        | "perfil_disc"
        | "reuniao_diagnostico"
        | "reuniao_planejamento"
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
      asset_status: ["uploading", "processing", "completed", "error"],
      evidence_status: ["pendente", "validado", "rejeitado", "investigar"],
      evidence_type: ["fato", "divergencia", "ponto_forte"],
      initiative_effort: ["low", "medium", "high"],
      initiative_impact: ["low", "medium", "high"],
      initiative_status: ["draft", "approved", "in_progress", "done"],
      pilar: ["pessoas", "processos", "dados", "tecnologia", "gestao"],
      profile_source_type: ["pdf_auto", "ai_inferred", "manual"],
      source_type: [
        "entrevista_diretoria",
        "entrevista_operacao",
        "reuniao_kickoff",
        "reuniao_vendas",
        "briefing",
        "documentacao",
        "observacao_consultor",
        "perfil_disc",
        "reuniao_diagnostico",
        "reuniao_planejamento",
      ],
    },
  },
} as const
