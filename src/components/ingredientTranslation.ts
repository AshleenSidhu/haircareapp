// ingredientTranslation.ts ----------------------------------------------------

import { UserProfile, IngredientTranslation } from "./userprofiletypes";

export function translateToIngredients(profile: UserProfile): IngredientTranslation {
  const positive: Set<string> = new Set();
  const negative: Set<string> = new Set();
  const notes: Set<string> = new Set();
  const recommendedProducts: Set<string> = new Set();

  // ---------------------------
  // 1. Hair Type Mapping
  // ---------------------------
  const hairTypeMap: Record<string, string[]> = {
    Straight: ["light humectants", "aloe", "panthenol", "glycerin"],
    Wavy: ["aloe", "beta-glucan", "light conditioning polymers"],
    Curly: ["shea butter", "avocado oil", "coconut oil (if no allergy)", "polyquaternium"],
    Kinky: ["castor oil", "mango butter", "ceramides", "rich emollients"],
    Dreadlocks: ["lightweight oils", "residue-free formulas", "clarifying agents"]
  };

  hairTypeMap[profile.hairType].forEach((i) => positive.add(i));

  // ---------------------------
  // 2. Porosity Mapping
  // ---------------------------
  const porosityMap: Record<string, string[]> = {
    Low: ["lightweight moisturizers", "hydrolyzed proteins", "aloe", "panthenol"],
    Medium: ["balanced oils", "emollients", "film-formers"],
    High: ["bond builders (Olaplex-type)", "ceramides", "castor oil", "argan oil", "occlusives"]
  };

  porosityMap[profile.porosity].forEach((i) => positive.add(i));

  // ---------------------------
  // 3. Concerns Mapping
  // ---------------------------
  const concernsMap: Record<string, string[]> = {
    Dry: ["glycerin", "hyaluronic acid", "panthenol", "shea butter"],
    Frizz: ["amodimethicone", "polyquaternium-10", "conditioning esters"],
    "Scalp (dry, oily, flaky)": ["zinc pyrithione", "salicylic acid", "tea tree (if no allergy)"],
    Damaged: ["bond builders", "keratin", "protein blends"],
    "Colour treated": ["UV filters", "antioxidants", "gentle surfactants"],
    "Chemically treated": ["protein blends", "ceramides"],
    Bleached: ["bond repair", "ceramides", "amino acids"],
    Breakage: ["hydrolyzed proteins", "arginine", "keratin"],
    "Curl definition": ["polyquaternium", "film-forming humectants"],
    "Lack of volume": ["light proteins", "volumizing polymers"],
    "Hair loss": ["peptides", "niacinamide", "caffeine", "saw palmetto"]
  };

  profile.concerns.forEach((concern) => {
    concernsMap[concern]?.forEach((i) => positive.add(i));
  });

  // ---------------------------
  // 4. Product Qualities → Ingredient Rules
  // ---------------------------
  if (profile.productQualities.includes("Silicone-free")) {
    negative.add("dimethicone");
    negative.add("amodimethicone");
  }

  if (profile.productQualities.includes("Sulfate-free")) {
    negative.add("sodium lauryl sulfate");
    negative.add("sodium laureth sulfate");
  }

  if (profile.productQualities.includes("Fragrance-free")) {
    negative.add("fragrance");
  }

  if (profile.productQualities.includes("Protein-free")) {
    negative.add("keratin");
    negative.add("hydrolyzed wheat protein");
  }

  if (profile.productQualities.includes("Vegan / cruelty-free")) {
    negative.add("collagen");
    negative.add("lanolin");
  }

  // ---------------------------
  // 5. Allergies → Hard Exclusions
  // ---------------------------
  profile.allergies.forEach((a) => {
    const normalized = a.toLowerCase();
    negative.add(normalized);

    // remove matching positives
    [...positive].forEach((p) => {
      if (p.toLowerCase().includes(normalized)) {
        positive.delete(p);
        notes.add(`Removed ${p} due to allergy: ${a}`);
      }
    });
  });

  // ---------------------------
  // 6. Thickness → Weight-of-product
  // ---------------------------
  if (profile.thickness === "Fine") {
    negative.add("heavy oils");
    positive.add("volumizing proteins");
  }
  if (profile.thickness === "Thick") {
    positive.add("rich butters");
    positive.add("high-emollient oils");
  }

  // ---------------------------
  // 7. Shampoo Frequency → Scalp Needs
  // ---------------------------
  if (profile.shampoo === "Less than once a month") {
    positive.add("clarifying surfactants");
    notes.add("User washes infrequently → add clarifying product option");
  }
  if (profile.shampoo === "Every day") {
    positive.add("ultra-gentle surfactants");
    negative.add("strong sulfates");
  }

  // ---------------------------
  // 8. Determine Recommended Product Types
  // ---------------------------
  if (profile.concerns.includes("Dry")) {
    recommendedProducts.add("Moisturizing shampoo");
    recommendedProducts.add("Deep conditioner");
  }
  if (profile.concerns.includes("Frizz")) {
    recommendedProducts.add("Anti-frizz serum");
    recommendedProducts.add("Leave-in conditioner");
  }
  if (profile.concerns.includes("Damaged") || profile.concerns.includes("Bleached")) {
    recommendedProducts.add("Bond repair treatment");
  }
  if (profile.concerns.includes("Scalp (dry, oily, flaky)")) {
    recommendedProducts.add("Scalp treatment");
  }

  return {
    positiveIngredients: Array.from(positive),
    negativeIngredients: Array.from(negative),
    recommendedProductTypes: Array.from(recommendedProducts),
    notes: Array.from(notes),
    brandToAvoid: profile.brandAvoid,
    budget: profile.budget,
    productQualities: profile.productQualities
  };
}
