
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "auctions": {
                  Row: {
                    "auction_def_id": string,"created_at": string,"id": string,"room_id": string,"status": string,"true_value": number | null,"turn": number,"winner_member_id": string | null,"winner_pool_key": string | null,"winning_bid": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "auction_def_id": string,"created_at"?: string,"id"?: string,"room_id": string,"status": string,"true_value"?: number | null,"turn": number,"winner_member_id"?: string | null,"winner_pool_key"?: string | null,"winning_bid"?: number | null
                  }
                  Update: {
                    "auction_def_id"?: string,"created_at"?: string,"id"?: string,"room_id"?: string,"status"?: string,"true_value"?: number | null,"turn"?: number,"winner_member_id"?: string | null,"winner_pool_key"?: string | null,"winning_bid"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "auctions_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auctions_winner_member_id_fkey"
      columns: ["winner_member_id"]
isOneToOne: false
      referencedRelation: "room_members"
      referencedColumns: ["id"]
    }
                  ]
                },"badges_earned": {
                  Row: {
                    "badge_id": string,"created_at": string,"earned_at": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "badge_id": string,"created_at"?: string,"earned_at"?: string,"id"?: string,"user_id": string
                  }
                  Update: {
                    "badge_id"?: string,"created_at"?: string,"earned_at"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "badges_earned_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "org_student_detail_v"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "badges_earned_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"bid_pool_members": {
                  Row: {
                    "contribution": number,"created_at": string,"id": string,"member_id": string,"pool_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contribution": number,"created_at"?: string,"id"?: string,"member_id": string,"pool_id": string
                  }
                  Update: {
                    "contribution"?: number,"created_at"?: string,"id"?: string,"member_id"?: string,"pool_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bid_pool_members_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "room_members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bid_pool_members_pool_id_fkey"
      columns: ["pool_id"]
isOneToOne: false
      referencedRelation: "bid_pools"
      referencedColumns: ["id"]
    }
                  ]
                },"bid_pools": {
                  Row: {
                    "auction_id": string,"created_at": string,"id": string,"pool_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auction_id": string,"created_at"?: string,"id"?: string,"pool_key": string
                  }
                  Update: {
                    "auction_id"?: string,"created_at"?: string,"id"?: string,"pool_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bid_pools_auction_id_fkey"
      columns: ["auction_id"]
isOneToOne: false
      referencedRelation: "auctions"
      referencedColumns: ["id"]
    }
                  ]
                },"bids": {
                  Row: {
                    "amount": number,"auction_id": string,"created_at": string,"id": string,"member_id": string | null,"pool_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"auction_id": string,"created_at"?: string,"id"?: string,"member_id"?: string | null,"pool_id"?: string | null
                  }
                  Update: {
                    "amount"?: number,"auction_id"?: string,"created_at"?: string,"id"?: string,"member_id"?: string | null,"pool_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bids_auction_id_fkey"
      columns: ["auction_id"]
isOneToOne: false
      referencedRelation: "auctions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bids_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "room_members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bids_pool_id_fkey"
      columns: ["pool_id"]
isOneToOne: false
      referencedRelation: "bid_pools"
      referencedColumns: ["id"]
    }
                  ]
                },"chapter_results": {
                  Row: {
                    "attempt": number,"chapter_id": string,"completed_at": string,"created_at": string,"health_score": number,"id": string,"passed": boolean,"playthrough_id": string,"report": NonNullable<Json>,"score_breakdown": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt"?: number,"chapter_id": string,"completed_at"?: string,"created_at"?: string,"health_score": number,"id"?: string,"passed": boolean,"playthrough_id": string,"report": NonNullable<Json>,"score_breakdown": NonNullable<Json>
                  }
                  Update: {
                    "attempt"?: number,"chapter_id"?: string,"completed_at"?: string,"created_at"?: string,"health_score"?: number,"id"?: string,"passed"?: boolean,"playthrough_id"?: string,"report"?: NonNullable<Json>,"score_breakdown"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "chapter_results_playthrough_id_fkey"
      columns: ["playthrough_id"]
isOneToOne: false
      referencedRelation: "playthroughs"
      referencedColumns: ["id"]
    }
                  ]
                },"code_redemption_attempts": {
                  Row: {
                    "attempted_at": string,"id": string,"ip": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempted_at"?: string,"id"?: string,"ip": string
                  }
                  Update: {
                    "attempted_at"?: string,"id"?: string,"ip"?: string
                  }
                  Relationships: [
                    
                  ]
                },"decisions": {
                  Row: {
                    "chapter_id": string,"created_at": string,"id": string,"payload": NonNullable<Json>,"playthrough_id": string,"turn": number,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chapter_id": string,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"playthrough_id": string,"turn": number,"type": string
                  }
                  Update: {
                    "chapter_id"?: string,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"playthrough_id"?: string,"turn"?: number,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "decisions_playthrough_id_fkey"
      columns: ["playthrough_id"]
isOneToOne: false
      referencedRelation: "playthroughs"
      referencedColumns: ["id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "created_at": string,"group_id": string,"id": string,"student_user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"group_id": string,"id"?: string,"student_user_id": string
                  }
                  Update: {
                    "created_at"?: string,"group_id"?: string,"id"?: string,"student_user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_student_user_id_fkey"
      columns: ["student_user_id"]
isOneToOne: false
      referencedRelation: "org_student_detail_v"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "group_members_student_user_id_fkey"
      columns: ["student_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"org_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"org_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"org_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_chapter_stats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "groups_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_engagement_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "groups_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_learning_gain_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "groups_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_persona_distribution_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "groups_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_scam_stats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "groups_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_seats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "groups_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"gyaan_answers": {
                  Row: {
                    "chapter_id": string,"correct": boolean,"created_at": string,"id": string,"playthrough_id": string,"question_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chapter_id": string,"correct": boolean,"created_at"?: string,"id"?: string,"playthrough_id": string,"question_id": string
                  }
                  Update: {
                    "chapter_id"?: string,"correct"?: boolean,"created_at"?: string,"id"?: string,"playthrough_id"?: string,"question_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gyaan_answers_playthrough_id_fkey"
      columns: ["playthrough_id"]
isOneToOne: false
      referencedRelation: "playthroughs"
      referencedColumns: ["id"]
    }
                  ]
                },"loans": {
                  Row: {
                    "borrower_member_id": string,"created_at": string,"due_turn": number,"id": string,"interest_type": string,"lender_kind": string | null,"lender_member_id": string | null,"loan_key": string,"principal": number,"rate_per_turn": number,"repaid_amount": number,"request_key": string | null,"room_id": string,"start_turn": number,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "borrower_member_id": string,"created_at"?: string,"due_turn": number,"id"?: string,"interest_type": string,"lender_kind"?: string | null,"lender_member_id"?: string | null,"loan_key": string,"principal": number,"rate_per_turn": number,"repaid_amount"?: number,"request_key"?: string | null,"room_id": string,"start_turn": number,"status": string
                  }
                  Update: {
                    "borrower_member_id"?: string,"created_at"?: string,"due_turn"?: number,"id"?: string,"interest_type"?: string,"lender_kind"?: string | null,"lender_member_id"?: string | null,"loan_key"?: string,"principal"?: number,"rate_per_turn"?: number,"repaid_amount"?: number,"request_key"?: string | null,"room_id"?: string,"start_turn"?: number,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "loans_borrower_member_id_fkey"
      columns: ["borrower_member_id"]
isOneToOne: false
      referencedRelation: "room_members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "loans_lender_member_id_fkey"
      columns: ["lender_member_id"]
isOneToOne: false
      referencedRelation: "room_members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "loans_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"mindset_responses": {
                  Row: {
                    "answers": NonNullable<Json>,"content_version": string,"created_at": string,"id": string,"persona_id": string,"phase": Database["public"]['Enums']["mindset_phase"],"scores": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers": NonNullable<Json>,"content_version": string,"created_at"?: string,"id"?: string,"persona_id": string,"phase": Database["public"]['Enums']["mindset_phase"],"scores": NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"content_version"?: string,"created_at"?: string,"id"?: string,"persona_id"?: string,"phase"?: Database["public"]['Enums']["mindset_phase"],"scores"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mindset_responses_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "org_student_detail_v"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "mindset_responses_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"org_join_requests": {
                  Row: {
                    "created_at": string,"id": string,"org_id": string,"requested_by": string,"status": Database["public"]['Enums']["join_request_status"],"student_user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"org_id": string,"requested_by": string,"status"?: Database["public"]['Enums']["join_request_status"],"student_user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"org_id"?: string,"requested_by"?: string,"status"?: Database["public"]['Enums']["join_request_status"],"student_user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "org_join_requests_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_chapter_stats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "org_join_requests_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_engagement_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "org_join_requests_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_learning_gain_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "org_join_requests_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_persona_distribution_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "org_join_requests_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_scam_stats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "org_join_requests_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_seats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "org_join_requests_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "org_join_requests_student_user_id_fkey"
      columns: ["student_user_id"]
isOneToOne: false
      referencedRelation: "org_student_detail_v"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "org_join_requests_student_user_id_fkey"
      columns: ["student_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "admin_user_id": string,"created_at": string,"id": string,"name": string,"settings": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_user_id": string,"created_at"?: string,"id"?: string,"name": string,"settings"?: NonNullable<Json>
                  }
                  Update: {
                    "admin_user_id"?: string,"created_at"?: string,"id"?: string,"name"?: string,"settings"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"playthroughs": {
                  Row: {
                    "content_version": string,"created_at": string,"current_chapter_id": string,"id": string,"persona_id": string,"seed": string,"state": NonNullable<Json>,"status": Database["public"]['Enums']["playthrough_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_version": string,"created_at"?: string,"current_chapter_id": string,"id"?: string,"persona_id": string,"seed": string,"state": NonNullable<Json>,"status"?: Database["public"]['Enums']["playthrough_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "content_version"?: string,"created_at"?: string,"current_chapter_id"?: string,"id"?: string,"persona_id"?: string,"seed"?: string,"state"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["playthrough_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "playthroughs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "org_student_detail_v"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "playthroughs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_id": string,"created_at": string,"has_recovery_email": boolean,"locale": string,"nickname": string,"org_id": string | null,"player_id": string,"role": Database["public"]['Enums']["user_role"],"user_id": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_id"?: string,"created_at"?: string,"has_recovery_email"?: boolean,"locale"?: string,"nickname": string,"org_id"?: string | null,"player_id"?: string,"role": Database["public"]['Enums']["user_role"],"user_id": string,"username": string
                  }
                  Update: {
                    "avatar_id"?: string,"created_at"?: string,"has_recovery_email"?: boolean,"locale"?: string,"nickname"?: string,"org_id"?: string | null,"player_id"?: string,"role"?: Database["public"]['Enums']["user_role"],"user_id"?: string,"username"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_chapter_stats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_engagement_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_learning_gain_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_persona_distribution_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_scam_stats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_seats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"room_members": {
                  Row: {
                    "bot_strategy": string | null,"created_at": string,"id": string,"is_bot": boolean,"member_key": string,"nickname": string,"playthrough_id": string | null,"room_id": string,"seat": number,"trust_score": number,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bot_strategy"?: string | null,"created_at"?: string,"id"?: string,"is_bot": boolean,"member_key": string,"nickname": string,"playthrough_id"?: string | null,"room_id": string,"seat": number,"trust_score": number,"user_id"?: string | null
                  }
                  Update: {
                    "bot_strategy"?: string | null,"created_at"?: string,"id"?: string,"is_bot"?: boolean,"member_key"?: string,"nickname"?: string,"playthrough_id"?: string | null,"room_id"?: string,"seat"?: number,"trust_score"?: number,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_members_playthrough_id_fkey"
      columns: ["playthrough_id"]
isOneToOne: false
      referencedRelation: "playthroughs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_members_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"room_views": {
                  Row: {
                    "created_at": string,"id": string,"room_code": string,"room_id": string,"updated_at": string,"user_id": string,"version": number,"view": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"room_code": string,"room_id": string,"updated_at"?: string,"user_id": string,"version": number,"view": NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"room_code"?: string,"room_id"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number,"view"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_views_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"rooms": {
                  Row: {
                    "chapter_id": string,"code": string,"content_version": string,"created_at": string,"host_user_id": string,"id": string,"org_id": string | null,"seed": string,"state": NonNullable<Json>,"status": string,"turn": number,"turn_deadline": string | null,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "chapter_id": string,"code": string,"content_version": string,"created_at"?: string,"host_user_id": string,"id"?: string,"org_id"?: string | null,"seed": string,"state": NonNullable<Json>,"status"?: string,"turn"?: number,"turn_deadline"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "chapter_id"?: string,"code"?: string,"content_version"?: string,"created_at"?: string,"host_user_id"?: string,"id"?: string,"org_id"?: string | null,"seed"?: string,"state"?: NonNullable<Json>,"status"?: string,"turn"?: number,"turn_deadline"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "rooms_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_chapter_stats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "rooms_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_engagement_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "rooms_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_learning_gain_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "rooms_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_persona_distribution_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "rooms_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_scam_stats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "rooms_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_seats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "rooms_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"student_codes": {
                  Row: {
                    "code_hash": string,"code_last4": string,"created_at": string,"created_by": string,"expires_at": string | null,"group_id": string | null,"id": string,"label": string | null,"org_id": string,"redeemed_at": string | null,"redeemed_by": string | null,"status": Database["public"]['Enums']["code_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "code_hash": string,"code_last4": string,"created_at"?: string,"created_by": string,"expires_at"?: string | null,"group_id"?: string | null,"id"?: string,"label"?: string | null,"org_id": string,"redeemed_at"?: string | null,"redeemed_by"?: string | null,"status"?: Database["public"]['Enums']["code_status"]
                  }
                  Update: {
                    "code_hash"?: string,"code_last4"?: string,"created_at"?: string,"created_by"?: string,"expires_at"?: string | null,"group_id"?: string | null,"id"?: string,"label"?: string | null,"org_id"?: string,"redeemed_at"?: string | null,"redeemed_by"?: string | null,"status"?: Database["public"]['Enums']["code_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_codes_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_codes_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_chapter_stats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "student_codes_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_engagement_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "student_codes_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_learning_gain_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "student_codes_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_persona_distribution_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "student_codes_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_scam_stats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "student_codes_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_seats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "student_codes_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "org_chapter_stats_v": {
                  Row: {
                    "attempts_count": number | null,"avg_health_score": number | null,"chapter_id": string | null,"org_id": string | null,"passed_count": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"org_engagement_v": {
                  Row: {
                    "active_students_30d": number | null,"active_students_7d": number | null,"completed_chapters": number | null,"org_id": string | null,"total_playthroughs": number | null,"total_students": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"org_learning_gain_v": {
                  Row: {
                    "org_id": string | null,"post_avg_know": number | null,"post_avg_plan": number | null,"post_avg_risk": number | null,"pre_avg_know": number | null,"pre_avg_plan": number | null,"pre_avg_risk": number | null,"total_post_completed": number | null,"total_pre_completed": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"org_persona_distribution_v": {
                  Row: {
                    "org_id": string | null,"persona_id": string | null,"student_count": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"org_scam_stats_v": {
                  Row: {
                    "fall_rate": number | null,"org_id": string | null,"scams_faced": number | null,"scams_fallen": number | null,"scams_spotted": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"org_seats_v": {
                  Row: {
                    "active_codes": number | null,"expired_codes": number | null,"linked_personal_learners": number | null,"org_id": string | null,"pending_codes": number | null,"revoked_codes": number | null,"total_codes_generated": number | null,"total_students": number | null
                  }
                  ComputedFields: never
                  Insert: {
                           "active_codes"?: never,"expired_codes"?: never,"linked_personal_learners"?: never,"org_id"?: string | null,"pending_codes"?: never,"revoked_codes"?: never,"total_codes_generated"?: never,"total_students"?: never
                         }
                        Update: {
                           "active_codes"?: never,"expired_codes"?: never,"linked_personal_learners"?: never,"org_id"?: string | null,"pending_codes"?: never,"revoked_codes"?: never,"total_codes_generated"?: never,"total_students"?: never
                         }
                        Relationships: [
                    
                  ]
                },"org_student_detail_v": {
                  Row: {
                    "avatar_id": string | null,"avg_health_score": number | null,"badges_count": number | null,"code_label": string | null,"code_last4": string | null,"last_active_at": string | null,"latest_chapter_id": string | null,"locale": string | null,"nickname": string | null,"org_id": string | null,"persona_id": string | null,"player_id": string | null,"user_id": string | null,"username": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_chapter_stats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_engagement_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_learning_gain_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_persona_distribution_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_scam_stats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "org_seats_v"
      referencedColumns: ["org_id"]
    },{
      foreignKeyName: "profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "auction_is_closed":
{ Args: { "p_auction_id": string }; Returns: boolean
                           },
"create_organization":
{ Args: { "p_name": string,"p_nickname": string,"p_username": string }; Returns: string
                           },
"is_admin_of_student":
{ Args: { "student_id": string }; Returns: boolean
                           },
"is_room_member":
{ Args: { "p_room_id": string }; Returns: boolean
                           },
"is_room_org_admin":
{ Args: { "p_room_id": string }; Returns: boolean
                           },
"my_admin_org_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"playthrough_owner":
{ Args: { "p_id": string }; Returns: string
                           },
"random_code":
{ Args: { "len": number }; Returns: string
                           },
"redeem_student_code_claim":
{ Args: { "p_code_hash": string,"p_ip": string }; Returns: {
              "code_id": string,"group_id": string,"org_id": string
            }[]
                           },
"redeem_student_code_finalize":
{ Args: { "p_code_id": string,"p_user_id": string }; Returns: undefined
                           },
"redeem_student_code_revert":
{ Args: { "p_code_id": string }; Returns: undefined
                           },
"respond_to_join_request":
{ Args: { "p_accept": boolean,"p_request_id": string }; Returns: undefined
                           },
"room_member_user":
{ Args: { "p_member_id": string }; Returns: string
                           },
"room_of_auction":
{ Args: { "p_auction_id": string }; Returns: string
                           }
          }
          Enums: {
            "code_status": "pending"|"active"|"expired"|"revoked","join_request_status": "pending"|"accepted"|"declined"|"cancelled","mindset_phase": "pre"|"post","playthrough_status": "active"|"completed"|"abandoned","user_role": "ngo_admin"|"student"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "code_status": ["pending", "active", "expired", "revoked"],"join_request_status": ["pending", "accepted", "declined", "cancelled"],"mindset_phase": ["pre", "post"],"playthrough_status": ["active", "completed", "abandoned"],"user_role": ["ngo_admin", "student"]
          }
        }
} as const
