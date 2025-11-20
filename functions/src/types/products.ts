/**
 * Product Types for Cloud Functions
 * Matches the frontend types but adapted for Node.js/Firebase Admin
 */

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
  source: 'openbeautyfacts' | 'beautyfeeds' | 'manual';
  sourceId?: string;
  url?: string;
  createdAt?: Date | any;
  updatedAt?: Date | any;
  enriched?: boolean;
  enrichedAt?: Date | any;
}

export interface IngredientWithExplanation {
  name: string;
  aiExplanation: string;
  safetyLevel: 'safe' | 'caution' | 'avoid';
  allergenFlag?: boolean;
}

export interface SustainabilityInfo {
  ecoFriendly: boolean;
  sustainable: boolean;
  crueltyFree: boolean;
  locallyOwned: boolean;
  smallBrand: boolean;
  explanation?: string;
  // Eco score (0-100) with detailed reasoning
  eco_score?: number;
  eco_grade?: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  eco_reasoning?: string[];
  eco_positive_factors?: string[];
  eco_negative_factors?: string[];
  eco_recommendations?: string[];
}

export interface SafetyInfo {
  overallScore: number;
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

export interface ReviewData {
  averageRating: number;
  totalReviews: number;
  sentimentScore: number;
  reviews: Review[];
  topReviews?: Review[]; // Top 3 helpful reviews
  aiSummary?: {
    overallSentiment: string;
    summary: string;
    whatPeopleLove: string[];
    whatPeopleHate: string[];
    commonPatterns: string[];
  };
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface ProductFilters {
  allergens?: string[];
  includeIngredients?: string[];
  excludeIngredients?: string[];
  sustainability?: {
    ecoFriendly?: boolean;
    sustainable?: boolean;
    crueltyFree?: boolean;
    locallyOwned?: boolean;
    smallBrand?: boolean;
  };
  minRating?: number;
  maxPrice?: number;
  tags?: string[];
}

