import client from "./client";

export interface SupplierMatchedItem {
  quote_item: string;
  shop_product: string;
  brand?: string;
  quantity_available: number;
  unit_price: number;
  unit: string;
  match_confidence: number;
}

export interface SupplierShop {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  whatsapp?: string;
  address: string;
  delivery_available: boolean;
  delivery_radius_km?: number;
  min_order_amount?: number;
}

export interface SupplierResult {
  shop: SupplierShop;
  tier: "complete" | "partial";
  match_pct: number;
  matched_count: number;
  total_count: number;
  distance_km: number | null;
  matched_items: SupplierMatchedItem[];
  missing_items: string[];
  price_disclaimer: string;
}

export async function searchSuppliers(
  items: { description: string; quantity: number }[],
  lat?: number,
  lng?: number,
  radiusKm = 15,
  city?: string
): Promise<SupplierResult[]> {
  const res = await client.post<SupplierResult[]>("/api/suppliers/search", {
    items,
    ...(lat !== undefined && { lat }),
    ...(lng !== undefined && { lng }),
    radius_km: radiusKm,
    ...(city && { city }),
  });
  return res.data;
}
