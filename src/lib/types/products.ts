/**
 * Product Types and Interfaces
 * Defines the structure for products stored in Firestore
 */

// Main Product interface matching Firestore structure
export interface Product {
  id: string;
  title: string;
  brand: string;
  imageUrl?: string;
  tags: string[];
  description?: string;
  price?: number;
  currency?: string;
  upc?: string;
  
  // Ingredients with AI explanations
  ingredients: IngredientWithExplanation[];
  
  // Sustainability information
  sustainability: SustainabilityInfo;
  
  // Safety and allergen information
  safety: SafetyInfo;
  
  // Google Reviews
  reviews: ReviewData;
  
  // AI recommendation explanation
  aiRecommendationExplanation?: string;
  
  // Metadata
  source: 'openbeautyfacts' | 'beautyfeeds' | 'manual' | 'open_beauty_facts';
  sourceId?: string;
  url?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Ingredient with AI-generated explanation
export interface IngredientWithExplanation {
  name: string;
  aiExplanation?: string; // "What it does for hair" (optional, can be added later)
  safetyLevel: 'safe' | 'caution' | 'avoid';
  allergenFlag?: boolean;
}

// Sustainability information
export interface SustainabilityInfo {
  ecoFriendly: boolean;
  sustainable: boolean;
  crueltyFree: boolean;
  locallyOwned: boolean;
  smallBrand: boolean;
  explanation?: string; // Why it's eco-friendly/sustainable/locally-owned
  // Eco score (0-100) with detailed reasoning
  eco_score?: number;
  eco_grade?: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  eco_reasoning?: string[];
  eco_positive_factors?: string[];
  eco_negative_factors?: string[];
  eco_recommendations?: string[];
}

// Safety and allergen information
export interface SafetyInfo {
  overallScore: number; // 0-100
  allergenWarnings: AllergenWarning[];
  flaggedIngredients: FlaggedIngredient[];
}

export interface AllergenWarning {
  ingredient: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface FlaggedIngredient {
  name: string;
  concern: string;
  severity: 'low' | 'medium' | 'high';
}

// Google Reviews data
export interface ReviewData {
  averageRating: number;
  totalReviews: number;
  sentimentScore: number; // -1 to 1
  reviews: Review[];
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  date: string;
}

// Product Filter Options
export interface ProductFilters {
  allergens?: string[]; // Ingredients to avoid
  includeIngredients?: string[]; // Ingredients to include
  excludeIngredients?: string[]; // Ingredients to exclude
  sustainability?: {
    ecoFriendly?: boolean;
    sustainable?: boolean;
    crueltyFree?: boolean;
    locallyOwned?: boolean;
    smallBrand?: boolean;
  };
  minRating?: number; // Minimum review rating
  maxPrice?: number;
  tags?: string[];
}

// User's liked products (stored in Firestore)
export interface LikedProduct {
  userId: string;
  productId: string;
  product: Product; // Full product data snapshot
  likedAt: Date;
}

