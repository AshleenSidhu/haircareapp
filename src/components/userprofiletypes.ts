// types.ts ---------------------------------------------------------

export interface UserProfile {
  hairType: "Straight" | "Wavy" | "Curly" | "Coily" | "Dreadlocks";
  thickness: "Fine" | "Medium" | "Thick";
  porosity: "Low" | "Medium" | "High";
  shampoo: "Less than once a month" | "Once a week" | "Two to three times a week" | "Every day";
  heat: "Never" | "Less than once a month" | "Once a month" | "Once a week" | "Every day";
  allergies: string[];
  budget: "< 15$" | "16$-35$" | "36$-59$" | "> 60$" | "Show me all the options";
  brandAvoid: string;
  concerns: (
    | "Dry" | "Colour treated" | "Damaged" | "Chemically treated" | "Frizz"
    | "Bleached" | "Breakage" | "Curl definition" | "Scalp (dry, oily, flaky)"
    | "Lack of volume" | "Hair loss"
  )[];
  productQualities: (
    | "Fragrance-free" | "Clean or non-toxic ingredients" | "Silicone-free"
    | "Sulfate-free" | "Paraben-free" | "Alcohol-free" | "Protein-free"
    | "Organic or natural ingredients" | "Vegan / cruelty-free"
    | "Locally made brands" | "POC-owned / women-owned brands"
    | "Sustainable or eco-friendly" | "Dermatologist-tested"
    | "Price" | "Scent / fragrance" | "Packaging" | "Other"
  )[];
}

export interface IngredientTranslation {
  positiveIngredients: string[];
  negativeIngredients: string[];
  recommendedProductTypes: string[];
  notes: string[];
  brandToAvoid: string;
  budget: string;
  productQualities: string[];
  matchingHairTypeProducts: string[];
}
