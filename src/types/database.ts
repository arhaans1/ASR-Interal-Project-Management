// A client's status is the sidebar section it sits in. Sections can be added in Team Settings.
export type ClientStatus = string;

export type FunnelType = 'VSL' | 'Webinar' | 'CAM';

// admin | operator (admin + operator dashboard) | member | member_operator. See lib/access.ts
export type UserRole = 'admin' | 'operator' | 'member' | 'member_operator';

export type TaskOwner = 'team' | 'client';

export interface Client {
  id: string;
  name: string;
  business_name: string;
  status: ClientStatus;
  important_links: string;
  notes: string;
  created_at: string;
  updated_at: string;
  username?: string;
  password?: string;
  funnel_type?: FunnelType | null;
  operator_id?: string | null;
  drive_folder_url?: string | null;
  onboarding_video_url?: string | null;
  onboarding_form_url?: string | null;
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

// What a phase's due date counts from
export type DueAnchor = 'onboarding' | 'approval';

export interface Category {
  id: string;
  client_id: string;
  name: string;
  order_index: number;
  created_at: string;
  // Timeline rule: due `due_days` business days after the anchor is reached.
  due_after?: DueAnchor | null;
  due_days?: number | null;
}

export interface Task {
  id: string;
  category_id: string;
  name: string;
  completed: boolean;
  order_index: number;
  assigned_to?: string | null;
  assigned_user_name?: string | null; // Join result
  origin_client_id?: string | null;
  origin_client_name?: string | null; // Join result
  owner?: TaskOwner | null; // Who does it. Missing/null means the team.
  is_onboarding?: boolean | null; // Client must finish these before their dashboard opens
  is_approval?: boolean | null; // The client signing off on submitted work
  task_key?: string | null; // Links the task to a guided onboarding step
  completed_at?: string | null;
  created_at: string;
}

// What the client portal and operator workspace receive from the API.
// Credentials and internal notes are never included.
export interface PortalClient {
  id: string;
  name: string;
  business_name: string;
  status: ClientStatus;
  funnel_type: FunnelType | null;
  operator_id: string | null;
  drive_folder_url: string | null;
  onboarding_video_url: string | null;
  onboarding_form_url: string | null;
  important_links: string;
  created_at: string;
}

export interface PortalCategory extends Category {
  tasks: Task[];
}
