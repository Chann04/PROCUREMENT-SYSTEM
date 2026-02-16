// Database types generated for Supabase

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'Faculty' | 'DeptHead' | 'Admin';

export type RequestStatus = 
  | 'Draft' 
  | 'Pending' 
  | 'Approved' 
  | 'Rejected' 
  | 'Ordered' 
  | 'Received' 
  | 'Completed';

export type ActivityAction = 
  | 'created'
  | 'status_changed'
  | 'delegated'
  | 'comment_added';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          department: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: UserRole;
          department?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: UserRole;
          department?: string | null;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
      };
      vendors: {
        Row: {
          id: string;
          name: string;
          contact_person: string | null;
          contact_number: string | null;
          email: string | null;
          address: string | null;
          category: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person?: string | null;
          contact_number?: string | null;
          email?: string | null;
          address?: string | null;
          category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          contact_person?: string | null;
          contact_number?: string | null;
          email?: string | null;
          address?: string | null;
          category?: string | null;
          updated_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          academic_year: string;
          total_amount: number;
          spent_amount: number;
          remaining_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academic_year: string;
          total_amount: number;
          spent_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          academic_year?: string;
          total_amount?: number;
          spent_amount?: number;
          updated_at?: string;
        };
      };
      requests: {
        Row: {
          id: string;
          requester_id: string;
          category_id: string | null;
          vendor_id: string | null;
          item_name: string;
          description: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          status: RequestStatus;
          rejection_reason: string | null;
          approved_by: string | null;
          approved_at: string | null;
          ordered_at: string | null;
          received_at: string | null;
          completed_at: string | null;
          delegated_to: string | null;
          delegated_by: string | null;
          delegated_at: string | null;
          quotation_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          category_id?: string | null;
          vendor_id?: string | null;
          item_name: string;
          description?: string | null;
          quantity?: number;
          unit_price: number;
          status?: RequestStatus;
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          ordered_at?: string | null;
          received_at?: string | null;
          completed_at?: string | null;
          delegated_to?: string | null;
          delegated_by?: string | null;
          delegated_at?: string | null;
          quotation_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          requester_id?: string;
          category_id?: string | null;
          vendor_id?: string | null;
          item_name?: string;
          description?: string | null;
          quantity?: number;
          unit_price?: number;
          status?: RequestStatus;
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          ordered_at?: string | null;
          received_at?: string | null;
          completed_at?: string | null;
          delegated_to?: string | null;
          delegated_by?: string | null;
          delegated_at?: string | null;
          quotation_url?: string | null;
          updated_at?: string;
        };
      };
      request_comments: {
        Row: {
          id: string;
          request_id: string;
          author_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          author_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      request_activity: {
        Row: {
          id: string;
          request_id: string;
          actor_id: string | null;
          action: ActivityAction;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          actor_id?: string | null;
          action: ActivityAction;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          details?: Json | null;
        };
      };
    };
    Functions: {
      get_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Vendor = Database['public']['Tables']['vendors']['Row'];
export type Budget = Database['public']['Tables']['budgets']['Row'];
export type Request = Database['public']['Tables']['requests']['Row'];
export type RequestComment = Database['public']['Tables']['request_comments']['Row'];
export type RequestActivity = Database['public']['Tables']['request_activity']['Row'];

// Extended types with relations
export type RequestWithRelations = Request & {
  requester?: Profile;
  category?: Category;
  vendor?: Vendor;
  delegated_to_profile?: Profile;
};

export type CommentWithAuthor = RequestComment & {
  author?: Profile;
};

export type ActivityWithActor = RequestActivity & {
  actor?: Profile;
};
