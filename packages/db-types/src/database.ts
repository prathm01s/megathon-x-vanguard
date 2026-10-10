export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          admin_user_id: string;
          settings: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          admin_user_id: string;
          settings?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          admin_user_id?: string;
          settings?: Json;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          created_at: string;
          role: "ngo_admin" | "student";
          org_id: string | null;
          username: string;
          nickname: string;
          avatar_id: string;
          player_id: string;
          locale: "en" | "te" | "hi" | "ur";
          has_recovery_email: boolean;
        };
        Insert: {
          user_id: string;
          created_at?: string;
          role: "ngo_admin" | "student";
          org_id?: string | null;
          username: string;
          nickname: string;
          avatar_id?: string;
          player_id?: string;
          locale?: "en" | "te" | "hi" | "ur";
          has_recovery_email?: boolean;
        };
        Update: {
          user_id?: string;
          created_at?: string;
          role?: "ngo_admin" | "student";
          org_id?: string | null;
          username?: string;
          nickname?: string;
          avatar_id?: string;
          player_id?: string;
          locale?: "en" | "te" | "hi" | "ur";
          has_recovery_email?: boolean;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          created_at: string;
          org_id: string;
          name: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          org_id: string;
          name: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          org_id?: string;
          name?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          id: string;
          created_at: string;
          group_id: string;
          student_user_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          group_id: string;
          student_user_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          group_id?: string;
          student_user_id?: string;
        };
        Relationships: [];
      };
      student_codes: {
        Row: {
          id: string;
          created_at: string;
          org_id: string;
          code_hash: string;
          code_last4: string;
          label: string | null;
          group_id: string | null;
          status: "pending" | "active" | "expired" | "revoked";
          expires_at: string | null;
          created_by: string;
          redeemed_by: string | null;
          redeemed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          org_id: string;
          code_hash: string;
          code_last4: string;
          label?: string | null;
          group_id?: string | null;
          status?: "pending" | "active" | "expired" | "revoked";
          expires_at?: string | null;
          created_by: string;
          redeemed_by?: string | null;
          redeemed_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          org_id?: string;
          code_hash?: string;
          code_last4?: string;
          label?: string | null;
          group_id?: string | null;
          status?: "pending" | "active" | "expired" | "revoked";
          expires_at?: string | null;
          created_by?: string;
          redeemed_by?: string | null;
          redeemed_at?: string | null;
        };
        Relationships: [];
      };
      org_join_requests: {
        Row: {
          id: string;
          created_at: string;
          org_id: string;
          student_user_id: string;
          status: "pending" | "accepted" | "declined" | "cancelled";
          requested_by: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          org_id: string;
          student_user_id: string;
          status?: "pending" | "accepted" | "declined" | "cancelled";
          requested_by: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          org_id?: string;
          student_user_id?: string;
          status?: "pending" | "accepted" | "declined" | "cancelled";
          requested_by?: string;
        };
        Relationships: [];
      };
      mindset_responses: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          phase: "pre" | "post";
          answers: Json;
          scores: Json;
          persona_id: string;
          content_version: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          phase: "pre" | "post";
          answers: Json;
          scores: Json;
          persona_id: string;
          content_version: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          phase?: "pre" | "post";
          answers?: Json;
          scores?: Json;
          persona_id?: string;
          content_version?: string;
        };
        Relationships: [];
      };
      playthroughs: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          persona_id: string;
          seed: string;
          content_version: string;
          current_chapter_id: string;
          status: "active" | "completed" | "abandoned";
          state: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          persona_id: string;
          seed: string;
          content_version: string;
          current_chapter_id: string;
          status?: "active" | "completed" | "abandoned";
          state: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          persona_id?: string;
          seed?: string;
          content_version?: string;
          current_chapter_id?: string;
          status?: "active" | "completed" | "abandoned";
          state?: Json;
        };
        Relationships: [];
      };
      chapter_results: {
        Row: {
          id: string;
          created_at: string;
          playthrough_id: string;
          chapter_id: string;
          attempt: number;
          health_score: number;
          score_breakdown: Json;
          report: Json;
          passed: boolean;
          completed_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          playthrough_id: string;
          chapter_id: string;
          attempt?: number;
          health_score: number;
          score_breakdown: Json;
          report: Json;
          passed: boolean;
          completed_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          playthrough_id?: string;
          chapter_id?: string;
          attempt?: number;
          health_score?: number;
          score_breakdown?: Json;
          report?: Json;
          passed?: boolean;
          completed_at?: string;
        };
        Relationships: [];
      };
      decisions: {
        Row: {
          id: string;
          created_at: string;
          playthrough_id: string;
          chapter_id: string;
          turn: number;
          type: string;
          payload: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          playthrough_id: string;
          chapter_id: string;
          turn: number;
          type: string;
          payload?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          playthrough_id?: string;
          chapter_id?: string;
          turn?: number;
          type?: string;
          payload?: Json;
        };
        Relationships: [];
      };
      gyaan_answers: {
        Row: {
          id: string;
          created_at: string;
          playthrough_id: string;
          chapter_id: string;
          question_id: string;
          correct: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          playthrough_id: string;
          chapter_id: string;
          question_id: string;
          correct: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          playthrough_id?: string;
          chapter_id?: string;
          question_id?: string;
          correct?: boolean;
        };
        Relationships: [];
      };
      badges_earned: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          badge_id?: string;
          earned_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      org_engagement_v: {
        Row: {
          org_id: string;
          total_students: number;
          active_students_7d: number;
          active_students_30d: number;
          total_playthroughs: number;
          completed_chapters: number;
        };
        Relationships: [];
      };
      org_persona_distribution_v: {
        Row: {
          org_id: string;
          persona_id: string;
          student_count: number;
        };
        Relationships: [];
      };
      org_learning_gain_v: {
        Row: {
          org_id: string;
          pre_avg_plan: number;
          pre_avg_risk: number;
          pre_avg_know: number;
          post_avg_plan: number;
          post_avg_risk: number;
          post_avg_know: number;
        };
        Relationships: [];
      };
      org_scam_stats_v: {
        Row: {
          org_id: string;
          scams_faced: number;
          scams_fallen: number;
          scams_spotted: number;
          fall_rate: number;
        };
        Relationships: [];
      };
      org_chapter_stats_v: {
        Row: {
          org_id: string;
          chapter_id: string;
          attempts_count: number;
          passed_count: number;
          avg_health_score: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      random_code: {
        Args: { len: number };
        Returns: string;
      };
      my_admin_org_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      is_admin_of_student: {
        Args: { student_id: string };
        Returns: boolean;
      };
      create_organization: {
        Args: {
          p_name: string;
          p_username: string;
          p_nickname: string;
        };
        Returns: string;
      };
      respond_to_join_request: {
        Args: {
          p_request_id: string;
          p_accept: boolean;
        };
        Returns: undefined;
      };
      playthrough_owner: {
        Args: { p_id: string };
        Returns: string;
      };
    };
    Enums: {
      user_role: "ngo_admin" | "student";
      code_status: "pending" | "active" | "expired" | "revoked";
      join_request_status: "pending" | "accepted" | "declined" | "cancelled";
      mindset_phase: "pre" | "post";
      playthrough_status: "active" | "completed" | "abandoned";
    };
    CompositeTypes: Record<string, never>;
  };
};
