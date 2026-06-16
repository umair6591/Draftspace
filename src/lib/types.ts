import type { JSONContent } from "@tiptap/core";

export type Permission = "viewer" | "editor";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
};

export type DocumentRecord = {
  id: string;
  owner_id: string;
  title: string;
  content_json: JSONContent;
  content_text: string;
  created_at: string;
  updated_at: string;
};

export type DocumentShare = {
  id: string;
  document_id: string;
  shared_with_user_id: string;
  permission: Permission;
  created_at: string;
};

export type DocumentSummary = DocumentRecord & {
  access: "owned" | "shared";
  owner_email?: string;
  permission?: Permission;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile & { created_at: string };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
        };
        Update: {
          email?: string;
          full_name?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: DocumentRecord;
        Insert: {
          owner_id?: string;
          title?: string;
          content_json?: JSONContent;
          content_text?: string;
        };
        Update: {
          title?: string;
          content_json?: JSONContent;
          content_text?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_shares: {
        Row: DocumentShare;
        Insert: {
          document_id: string;
          shared_with_user_id: string;
          permission?: Permission;
        };
        Update: {
          permission?: Permission;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_document: {
        Args: {
          document_title?: string;
          document_content_json?: JSONContent;
          document_content_text?: string;
        };
        Returns: DocumentRecord;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
