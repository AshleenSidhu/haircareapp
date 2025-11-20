/**
 * Client-side compatibility scoring
 * Calculates compatibility score based on user profile and product profile
 */

import { ProductProfile, UserProfile } from '../types/api';

export interface CompatibilityResult {
  score: number; // 0-100
  explainers: string[];
}

/**
 * Calculate compatibility score for a product based on user profile
 */
export function calculateCompatibility(
  productProfile: ProductProfile,
  userProfile: UserProfile
): CompatibilityResult {
  const { moisture_score, protein_score, oil_level, irritant_risk, explainers } = productProfile;
  const { hairType, porosity, scalpSensitive, concerns = [] } = userProfile;

  let score = 50; // Start with neutral score
  const customExplainers: string[] = [];

  // Porosity-based scoring
  if (porosity === 'low') {
    // Low porosity: needs lightweight products, avoid heavy oils
    if (oil_level > 50) {
      score -= 20;
      customExplainers.push('Heavy oils may weigh down low-porosity hair');
    } else if (oil_level < 30) {
      score += 10;
      customExplainers.push('Lightweight formula suitable for low-porosity hair');
    }

    // Low porosity: needs moisture but not too much protein
    if (moisture_score > 70) {
      score += 15;
      customExplainers.push('Good moisture content for low-porosity hair');
    }
    if (protein_score > 60) {
      score -= 15;
      customExplainers.push('High protein content may cause buildup on low-porosity hair');
    }
  } else if (porosity === 'high') {
    // High porosity: needs heavy moisture and protein
    if (moisture_score > 70) {
      score += 20;
      customExplainers.push('Excellent moisture content for high-porosity hair');
    } else if (moisture_score < 50) {
      score -= 15;
      customExplainers.push('May not provide enough moisture for high-porosity hair');
    }

    if (protein_score > 50) {
      score += 15;
      customExplainers.push('Protein content helps repair high-porosity hair');
    }
  } else if (porosity === 'medium') {
    // Medium porosity: balanced approach
    if (moisture_score > 60 && moisture_score < 80) {
      score += 10;
    }
    if (protein_score > 30 && protein_score < 60) {
      score += 10;
    }
  }

  // Scalp sensitivity
  if (scalpSensitive) {
    if (irritant_risk > 30) {
      score -= 25;
      customExplainers.push('Contains potential irritants - avoid if you have sensitive scalp');
    } else if (irritant_risk < 20) {
      score += 10;
      customExplainers.push('Gentle formula suitable for sensitive scalps');
    }
  }

  // Hair type considerations
  if (hairType === 'coily' || hairType === 'curly') {
    // Curly/coily hair needs more moisture
    if (moisture_score > 70) {
      score += 10;
    }
    if (oil_level > 40 && oil_level < 70) {
      score += 5;
    }
  } else if (hairType === 'straight') {
    // Straight hair can be weighed down by heavy products
    if (oil_level > 60) {
      score -= 10;
    }
  }

  // Concerns-based adjustments
  if (concerns.includes('dryness') && moisture_score > 70) {
    score += 15;
    customExplainers.push('High moisture content addresses dryness concerns');
  }
  if (concerns.includes('frizz') && moisture_score > 65 && oil_level > 40) {
    score += 10;
    customExplainers.push('Moisture and oils help control frizz');
  }
  if (concerns.includes('damage') && protein_score > 50) {
    score += 10;
    customExplainers.push('Protein content helps repair damaged hair');
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Combine explainers
  const allExplainers = [...customExplainers, ...explainers].slice(0, 5);

  return {
    score: Math.round(score),
    explainers: allExplainers,
  };
}

