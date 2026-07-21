import { aiClient as client } from "./client";
import type { CustomerPreferences, RecommendationResponse } from "../types";

export async function getRecommendations(
  componentType: string,
  preferences: CustomerPreferences,
  options: {
    sweepMm?: number | null;
    roomAreaSqm?: number | null;
    currency?: string;
  } = {},
): Promise<RecommendationResponse> {
  const res = await client.post<RecommendationResponse>("/api/ai/recommendations", {
    component_type: componentType,
    sweep_mm: options.sweepMm ?? null,
    room_area_sqm: options.roomAreaSqm ?? null,
    preferences: {
      budget: preferences.budget,
      brand: preferences.brand,
      features: preferences.features,
      purchase_preference: preferences.purchase_preference,
    },
    currency: options.currency ?? "INR",
  });
  return res.data;
}
