export type ClientStatus = 'Active' | 'Launched' | 'Archived' | 'Team Members' | 'Templates';

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
}

export interface User {
  id: string;
  username: string;
  role: 'admin';
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
  created_at: string;
}
