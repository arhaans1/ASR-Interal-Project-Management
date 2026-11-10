export type ClientStatus = 'Active' | 'Launched' | 'Archived' | 'Team Members' | 'Templates';

export type FunnelType = 'VSL' | 'Webinar' | 'CAM';

export type UserRole = 'admin' | 'operator';

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

export interface Category {
  id: string;
  client_id: string;
  name: string;
  order_index: number;
  created_at: string;
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
