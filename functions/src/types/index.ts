/**
 * Type definitions for the Hair-Care Recommendation System
 */

// Quiz/User Profile Types
export interface UserQuizAnswers {
  hairType: 'straight' | 'wavy' | 'curly' | 'coily' | 'mixed';
  porosity: 'low' | 'medium' | 'high';
  waterType: 'hard' | 'soft' | 'neutral';
  concerns: string[]; // e.g., ['frizz', 'dryness', 'damage', 'volume']
  preferences: {
    vegan?: boolean;
    crueltyFree?: boolean;
    organic?: boolean;
    fragranceFree?: boolean;
  };
  allergens?: string[]; // e.g., ['sulfates', 'parabens', 'silicones']
  budget?: 'low' | 'medium' | 'high';
}

// Product Data Types
export interface Product {
  id: string;
  name: string;
  brand: string;
  upc?: string;
  barcode?: string; // OBF code (barcode)
  description?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  tags: string[];
  ingredients?: string[];
  ingredients_inci?: string; // Raw INCI ingredient text
  ingredients_raw?: Array<{ text: string; id?: string }>; // Raw ingredient objects
  normalized_ingredients?: string[]; // Normalized INCI names
  categories?: string[]; // Product categories
  images?: {
    front?: string;
    ingredients?: string;
  };
  ingredientSafety?: IngredientSafetyData;
  sustainability?: SustainabilityData;
  reviews?: ReviewData;
  source: 'openbeautyfacts' | 'beautyfeeds' | 'manual' | 'open_beauty_facts';
  sourceId?: string;
  url?: string;
  last_modified_server?: number; // OBF last_modified_t timestamp
  last_synced_at?: number | any; // Timestamp when synced to our DB
}

export interface IngredientSafetyData {
  score: number; // 0-100, higher is safer
  flaggedIngredients: Array<{
    name: string;
    concern: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  allergenMatches?: string[];
}

export interface SustainabilityData {
  score: number; // 0-100, higher is more sustainable
  certifications?: string[]; // e.g., ['cruelty-free', 'vegan', 'organic']
  packaging?: {
    recyclable: boolean;
    material?: string;
  };
  brandEthics?: {
    crueltyFree: boolean;
    vegan: boolean;
    sustainable: boolean;
  };
}

export interface ReviewData {
  averageRating: number; // 0-5
  totalReviews: number;
  sentimentScore: number; // -1 to 1, where 1 is most positive
  recentReviews?: Array<{
    rating: number;
    text: string;
    date: string;
  }>;
}

// Scoring Types
export interface ProductScore {
  product: Product;
  deterministicScore: number; // 0-100
  scoreBreakdown: {
    tagMatch: number; // 35% weight
    sustainability: number; // 25% weight
    ingredientSafety: number; // 20% weight
    reviewSentiment: number; // 15% weight
    priceMatch: number; // 5% weight
  };
  aiScore?: number; // Re-ranked score from AI
  aiExplanation?: string; // Human-readable explanation
  finalRank?: number;
}

// Recommendation Result
export interface RecommendationResult {
  userId: string;
  timestamp: string;
  quizAnswers: UserQuizAnswers;
  recommendations: ProductScore[];
  metadata: {
    totalProductsFound: number;
    productsAfterFiltering: number;
    processingTimeMs: number;
    cacheHit: boolean;
  };
}

// API Adapter Response Types
export interface OpenBeautyFactsProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  categories_tags?: string[];
  image_url?: string;
  ingredients_text?: string;
  nutriments?: {
    price?: number;
  };
}

export interface BeautyFeedsProduct {
  id: string;
  name: string;
  brand: string;
  description?: string;
  image?: string;
  price?: number;
  tags?: string[];
  upc?: string;
}

export interface CosmethicsIngredient {
  name: string;
  safetyScore: number;
  concerns: string[];
  allergenInfo?: string[];
}

