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
  category?: "material" | "labour" | "transport" | "accessory";
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  ai_generated?: boolean;
  brand_suggestion?: string | null;
}

// ── AI Analysis ───────────────────────────────────────────────

export interface DetectedComponent {
  type: string;
  label: string;
  count: number;
  condition: "new_required" | "existing_good" | "existing_needs_replacement";
  notes: string | null;
  sweep_recommendation_mm: number | null;
  sweep_reason: string | null;
}

export interface RoomMeasurements {
  estimated_width_m: number | null;
  estimated_length_m: number | null;
  estimated_ceiling_height_m: number | null;
  floor_area_sqm: number | null;
  wall_area_sqm: number | null;
  cable_length_estimate_m: number | null;
  conduit_length_estimate_m: number | null;
  reference_used: string | null;
  confidence_pct: number | null;
  confidence_note: string | null;
}

export interface AIAnalyzeResult {
  items: QuoteItem[];
  detected_components?: DetectedComponent[];
  room_measurements?: RoomMeasurements | null;
  measurement_questions?: string[];
  observations?: string[];
  labor_hours?: number;
  complexity?: string;
  safety_notes?: string[];
  notes?: string | null;
  disclaimer: string;
}

// ── Customer Preferences ──────────────────────────────────────

export type BudgetTier = "economy" | "budget" | "value" | "premium" | "luxury";
export type PurchasePreference =
  | "lowest_price"
  | "best_value"
  | "premium"
  | "highest_rated"
  | "fast_delivery"
  | "nearby_shop";

export interface CustomerPreferences {
  budget: BudgetTier;
  brand: string | null;
  features: string[];
  purchase_preference: PurchasePreference;
}

// ── Product Recommendations ───────────────────────────────────

export interface ProductRecommendation {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  currency: string;
  wattage: number;
  warranty_years: number;
  star_rating: number;
  image_url: string;
  features: string[];
  pros: string[];
  cons: string[];
  tags: string[];
  sweep_mm: number | null;
  lumens: number | null;
  monthly_electricity_cost: number | null;
  annual_electricity_cost: number | null;
  five_year_running_cost: number | null;
  annual_savings_vs_standard: number | null;
  why_recommended: string | null;
}

export interface RecommendationResponse {
  component_type: string;
  sweep_recommendation_mm: number | null;
  sweep_reason: string | null;
  room_area_sqft: number | null;
  products: ProductRecommendation[];
}

// ── Quotes & Invoices ─────────────────────────────────────────

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
