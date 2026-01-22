export type ClientStatus = 'Onboarding' | 'In-Process' | 'On-Hold' | 'Ads Launched' | 'Closed';

export interface Client {
  id: string;
  name: string;
  business_name: string;
  status: ClientStatus;
  important_links: string;
  notes: string;
  created_at: string;
  updated_at: string;
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
