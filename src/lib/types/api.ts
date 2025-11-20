/**
 * API Types - Match backend API responses
 */

export interface ApiProduct {
  product_id: string;
  barcode: string;
  name: string;
  brand?: string;
  categories?: string[];
  ingredients_inci?: string;
  ingredients_raw?: Array<{ text: string; id?: string }>;
  normalized_ingredients?: string[];
  ingredient_science?: IngredientScience[];
  images?: {
    front?: string;
    ingredients?: string;
  };
  images_stored?: {
    storage_url?: string | null;
    stored_at?: number | string | null;
    image_type?: string;
    original_url?: string;
  };
  source?: 'open_beauty_facts' | 'openbeautyfacts' | 'beautyfeeds' | 'manual';
  last_modified_server?: number;
  last_synced_at?: number | string;
  product_profile?: ProductProfile;
  compatibility_score?: {
    score: number;
    explainers: string[];
  };
  // Eco score fields
  eco_score?: number;
  eco_grade?: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  eco_reasoning?: string[];
  eco_positive_factors?: string[];
  eco_negative_factors?: string[];
  eco_recommendations?: string[];
  // Legacy fields for compatibility
  description?: string;
  price?: number;
  currency?: string;
  tags?: string[];
  url?: string;
}

export interface IngredientScience {
  inci_name: string;
  functions?: string[];
  tags?: string[];
  safety_notes?: string;
  restrictions?: string;
  source_url?: string;
}

export interface ProductProfile {
  moisture_score: number;
  protein_score: number;
  oil_level: number;
  irritant_risk: number;
  explainers: string[];
}

export interface ApiIngredient {
  inci_name: string;
  cas_number?: string;
  ec_number?: string;
  functions: string[];
  restrictions: string;
  safety_notes: string;
  tags: string[];
  source_url?: string;
}

export interface ProductsResponse {
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  products: ApiProduct[];
}

export interface UserProfile {
  hairType?: 'straight' | 'wavy' | 'curly' | 'coily' | 'mixed';
  porosity?: 'low' | 'medium' | 'high';
  scalpSensitive?: boolean;
  concerns?: string[];
}

