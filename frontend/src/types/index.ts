export interface User {
  id: number;
  email: string;
  full_name: string;
  business_name: string;
  phone: string | null;
  currency: string;
  language: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Customer {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  whatsapp: string | null;
  created_at: string;
}

export interface Job {
  id: number;
  user_id: number;
  customer_id: number;
  title: string;
  description: string | null;
  location: string | null;
  photos: string[];
  ai_analysis: AIAnalyzeResult | null;
  status: string;
  created_at: string;
}

export interface QuoteItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  ai_generated?: boolean;
}

export interface AIAnalyzeResult {
  items: QuoteItem[];
  observations?: string[];
  labor_hours?: number;
  complexity?: string;
  safety_notes?: string[];
  notes?: string | null;
  disclaimer: string;
}

export interface Quote {
  id: number;
  user_id: number;
  job_id: number | null;
  customer_id: number;
  quote_number: string;
  status: "draft" | "sent" | "approved" | "rejected";
  items: QuoteItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total: number;
  notes: string | null;
  valid_until: string | null;
  ai_generated: boolean;
  language: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  user_id: number;
  quote_id: number | null;
  customer_id: number;
  invoice_number: string;
  status: "pending" | "sent" | "paid" | "overdue";
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  created_at: string;
}

export interface DashboardActivity {
  type: string;
  description: string;
  timestamp: string;
}

export interface Dashboard {
  total_revenue: number;
  pending_amount: number;
  active_jobs: number;
  quotes_this_month: number;
  recent_activity: DashboardActivity[];
}

export interface UploadedPhoto {
  path: string;
  filename: string;
}
