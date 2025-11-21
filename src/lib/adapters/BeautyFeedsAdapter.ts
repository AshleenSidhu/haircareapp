/**
 * Client-side adapter for BeautyFeeds.io API
 * API Key loaded from environment variables
 */

import { Product } from './OpenBeautyFactsAdapter';

// Get API key from environment variable (REACT_APP_ prefix required for Create React App)
const BEAUTYFEEDS_API_KEY = process.env.REACT_APP_BEAUTYFEEDS_API_KEY
const BEAUTYFEEDS_BASE_URL = process.env.REACT_APP_BEAUTYFEEDS_API_URL || 'https://api.beautyfeeds.io/v1';

export class BeautyFeedsAdapter {
  /**
   * Search for products by tags/keywords
   */
  async searchProducts(tags: string[], limit: number = 150): Promise<Product[]> {
    try {
      // Build search query
      const searchQuery = tags.join(' ');
      const searchUrl = `${BEAUTYFEEDS_BASE_URL}/products/search`;

      console.log(`[BeautyFeeds] Searching: ${searchQuery}`);

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${BEAUTYFEEDS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If API endpoint doesn't exist yet, return mock data for development
        if (response.status === 404) {
          console.warn('[BeautyFeeds] API endpoint not available, returning mock data');
          return this.getMockProducts(tags, limit);
        }
        console.warn(`[BeautyFeeds] API returned error status ${response.status}, using mock data`);
        return this.getMockProducts(tags, limit);
      }

      const data = await response.json();
      const products: Product[] = [];

      // Handle different possible response structures
      const productData = data?.data || data?.products || data || [];

      if (Array.isArray(productData)) {
        for (const item of productData) {
          const product = this.transformProduct(item);
          if (product) {
            products.push(product);
          }
        }
      }

      console.log(`[BeautyFeeds] Found ${products.length} products`);
      return products.slice(0, limit);
    } catch (error: any) {
      // Handle CORS, network errors, and other failures gracefully
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('CORS') || 
          error.message?.includes('NetworkError') ||
          error.name === 'TypeError') {
        console.warn('[BeautyFeeds] Network/CORS error - API may not be accessible from browser. Using mock data.');
        console.warn('[BeautyFeeds] This is expected in development. For production, use a backend proxy or configure CORS on the API server.');
      } else {
        console.error('[BeautyFeeds] Error searching products:', error.message);
      }
      // Always return mock data as fallback for development
      return this.getMockProducts(tags, limit);
    }
  }

  /**
   * Transform BeautyFeeds product to our Product format
   */
  private transformProduct(bfProduct: any): Product | null {
    try {
      if (!bfProduct.name || !bfProduct.brand) {
        return null;
      }

      return {
        id: bfProduct.id || `bf_${Date.now()}_${Math.random()}`,
        name: bfProduct.name,
        brand: bfProduct.brand,
        upc: bfProduct.upc,
        description: bfProduct.description,
        imageUrl: bfProduct.image,
        price: bfProduct.price,
        tags: bfProduct.tags || [],
        source: 'beautyfeeds',
        sourceId: bfProduct.id,
      };
    } catch (error) {
      console.error('[BeautyFeeds] Error transforming product:', error);
      return null;
    }
  }

  /**
   * Mock products for development/testing when API is unavailable
   * Includes 120+ products with different types and hair-type-specific lines
   */
  public getMockProducts(tags: string[], limit: number): Product[] {
    // Use Unsplash for product images (free, no API key needed for basic usage)
    const getImageUrl = (searchTerm: string) => 
      `https://images.unsplash.com/photo-${Math.random().toString(36).substring(7)}?w=400&h=400&fit=crop&q=80`;
    
    // Alternative: Use placeholder.com for reliable placeholder images
    const getPlaceholderImage = (index: number) => 
      `https://picsum.photos/400/400?random=${index}`;

    const mockProducts: Product[] = [
      // CURLY HAIR PRODUCT LINE (Complete 5-step routine)
      {
        id: 'bf_curly_1',
        name: 'Curl Defining Shampoo',
        brand: 'CurlCare Pro',
        tags: ['shampoo', 'curly-hair', 'curl-defining', 'sulfate-free', 'vegan', 'cruelty-free'],
        price: 18.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'coconut oil', 'aloe vera', 'argan oil', 'glycerin'],
        imageUrl: getPlaceholderImage(1),
        description: 'Gentle cleansing shampoo specifically formulated for curly hair types',
      },
      {
        id: 'bf_curly_2',
        name: 'Curl Enhancing Conditioner',
        brand: 'CurlCare Pro',
        tags: ['conditioner', 'curly-hair', 'moisturizing', 'curl-enhancing', 'vegan'],
        price: 19.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'shea butter', 'argan oil', 'coconut oil', 'glycerin'],
        imageUrl: getPlaceholderImage(2),
        description: 'Deeply moisturizing conditioner that enhances natural curl pattern',
      },
      {
        id: 'bf_curly_3',
        name: 'Curl Activating Leave-In',
        brand: 'CurlCare Pro',
        tags: ['leave-in', 'curly-hair', 'curl-activating', 'frizz-control', 'vegan'],
        price: 22.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'glycerin', 'jojoba oil', 'panthenol', 'silk protein'],
        imageUrl: getPlaceholderImage(3),
        description: 'Lightweight leave-in conditioner that activates and defines curls',
      },
      {
        id: 'bf_curly_4',
        name: 'Curl Defining Gel',
        brand: 'CurlCare Pro',
        tags: ['gel', 'curly-hair', 'hold', 'curl-defining', 'vegan'],
        price: 16.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'pvp', 'glycerin', 'aloe vera', 'panthenol'],
        imageUrl: getPlaceholderImage(4),
        description: 'Strong-hold gel that defines curls without crunch',
      },
      {
        id: 'bf_curly_5',
        name: 'Curl Refreshing Mist',
        brand: 'CurlCare Pro',
        tags: ['mist', 'curly-hair', 'refresh', 'revitalizing', 'vegan'],
        price: 14.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'glycerin', 'rose water', 'aloe vera', 'vitamin e'],
        imageUrl: getPlaceholderImage(5),
        description: 'Revitalizing mist to refresh curls between washes',
      },

      // STRAIGHT HAIR PRODUCT LINE
      {
        id: 'bf_straight_1',
        name: 'Smoothing Shampoo',
        brand: 'SleekHair',
        tags: ['shampoo', 'straight-hair', 'smoothing', 'frizz-control', 'sulfate-free'],
        price: 17.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'keratin', 'argan oil', 'silk protein', 'glycerin'],
        imageUrl: getPlaceholderImage(6),
        description: 'Smoothing shampoo for straight hair that reduces frizz',
      },
      {
        id: 'bf_straight_2',
        name: 'Sleek Conditioner',
        brand: 'SleekHair',
        tags: ['conditioner', 'straight-hair', 'smoothing', 'shine-enhancing'],
        price: 18.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'silk protein', 'keratin', 'argan oil', 'dimethicone'],
        imageUrl: getPlaceholderImage(7),
        description: 'Conditioner that adds shine and smoothness to straight hair',
      },
      {
        id: 'bf_straight_3',
        name: 'Anti-Frizz Serum',
        brand: 'SleekHair',
        tags: ['serum', 'straight-hair', 'frizz-control', 'heat-protectant'],
        price: 24.99,
        source: 'beautyfeeds',
        ingredients: ['dimethicone', 'argan oil', 'silk protein', 'vitamin e', 'cyclomethicone'],
        imageUrl: getPlaceholderImage(8),
        description: 'Lightweight serum that tames frizz and protects from heat',
      },
      {
        id: 'bf_straight_4',
        name: 'Volumizing Root Spray',
        brand: 'SleekHair',
        tags: ['spray', 'straight-hair', 'volumizing', 'root-lift'],
        price: 19.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'panthenol', 'wheat protein', 'alcohol', 'glycerin'],
        imageUrl: getPlaceholderImage(9),
        description: 'Root-lifting spray for added volume at the crown',
      },

      // WAVY HAIR PRODUCT LINE
      {
        id: 'bf_wavy_1',
        name: 'Wave Enhancing Shampoo',
        brand: 'WaveWorks',
        tags: ['shampoo', 'wavy-hair', 'wave-enhancing', 'texture', 'sulfate-free'],
        price: 16.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'sea salt', 'coconut oil', 'aloe vera', 'glycerin'],
        imageUrl: getPlaceholderImage(10),
        description: 'Shampoo that enhances natural wave pattern',
      },
      {
        id: 'bf_wavy_2',
        name: 'Beach Wave Texturizing Spray',
        brand: 'WaveWorks',
        tags: ['spray', 'wavy-hair', 'texture', 'beach-waves', 'salt-spray'],
        price: 21.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'sea salt', 'magnesium sulfate', 'glycerin', 'aloe vera'],
        imageUrl: getPlaceholderImage(11),
        description: 'Texturizing spray for effortless beach waves',
      },
      {
        id: 'bf_wavy_3',
        name: 'Wave Defining Cream',
        brand: 'WaveWorks',
        tags: ['cream', 'wavy-hair', 'wave-defining', 'light-hold'],
        price: 20.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'glycerin', 'coconut oil', 'panthenol', 'dimethicone'],
        imageUrl: getPlaceholderImage(12),
        description: 'Lightweight cream that defines waves without weighing them down',
      },

      // FINE HAIR PRODUCT LINE
      {
        id: 'bf_fine_1',
        name: 'Volumizing Shampoo for Fine Hair',
        brand: 'VolumeBoost',
        tags: ['shampoo', 'fine-hair', 'volumizing', 'thickening', 'lightweight'],
        price: 15.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'wheat protein', 'panthenol', 'glycerin', 'aloe vera'],
        imageUrl: getPlaceholderImage(13),
        description: 'Lightweight shampoo that adds volume to fine hair',
      },
      {
        id: 'bf_fine_2',
        name: 'Thickening Conditioner',
        brand: 'VolumeBoost',
        tags: ['conditioner', 'fine-hair', 'thickening', 'volumizing'],
        price: 16.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'keratin', 'wheat protein', 'panthenol', 'glycerin'],
        imageUrl: getPlaceholderImage(14),
        description: 'Conditioner that thickens fine hair without weighing it down',
      },
      {
        id: 'bf_fine_3',
        name: 'Root Volumizing Mousse',
        brand: 'VolumeBoost',
        tags: ['mousse', 'fine-hair', 'volumizing', 'root-lift', 'light-hold'],
        price: 18.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'pvp', 'panthenol', 'glycerin', 'alcohol'],
        imageUrl: getPlaceholderImage(15),
        description: 'Lightweight mousse for maximum volume at the roots',
      },
      {
        id: 'bf_fine_4',
        name: 'Dry Shampoo for Fine Hair',
        brand: 'VolumeBoost',
        tags: ['dry-shampoo', 'fine-hair', 'volumizing', 'oil-absorbing'],
        price: 14.99,
        source: 'beautyfeeds',
        ingredients: ['rice starch', 'aluminum starch', 'silica', 'fragrance'],
        imageUrl: getPlaceholderImage(16),
        description: 'Dry shampoo that absorbs oil and adds volume',
      },

      // THICK/COARSE HAIR PRODUCT LINE
      {
        id: 'bf_thick_1',
        name: 'Moisturizing Shampoo for Thick Hair',
        brand: 'ThickLocks',
        tags: ['shampoo', 'thick-hair', 'moisturizing', 'hydrating', 'sulfate-free'],
        price: 19.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'shea butter', 'coconut oil', 'argan oil', 'glycerin'],
        imageUrl: getPlaceholderImage(17),
        description: 'Rich, moisturizing shampoo for thick, coarse hair',
      },
      {
        id: 'bf_thick_2',
        name: 'Deep Hydrating Mask',
        brand: 'ThickLocks',
        tags: ['mask', 'thick-hair', 'deep-conditioning', 'hydrating', 'repair'],
        price: 24.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'shea butter', 'cocoa butter', 'argan oil', 'keratin'],
        imageUrl: getPlaceholderImage(18),
        description: 'Intensive deep conditioning mask for thick, dry hair',
      },
      {
        id: 'bf_thick_3',
        name: 'Hair Oil for Thick Hair',
        brand: 'ThickLocks',
        tags: ['oil', 'thick-hair', 'moisturizing', 'shine', 'frizz-control'],
        price: 22.99,
        source: 'beautyfeeds',
        ingredients: ['argan oil', 'jojoba oil', 'coconut oil', 'vitamin e', 'avocado oil'],
        imageUrl: getPlaceholderImage(19),
        description: 'Rich hair oil that moisturizes and tames thick, coarse hair',
      },

      // COLOR-TREATED HAIR PRODUCT LINE
      {
        id: 'bf_color_1',
        name: 'Color-Protect Shampoo',
        brand: 'ColorGuard',
        tags: ['shampoo', 'color-treated', 'color-protect', 'sulfate-free', 'uv-protection'],
        price: 20.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'uv filters', 'argan oil', 'glycerin', 'panthenol'],
        imageUrl: getPlaceholderImage(20),
        description: 'Shampoo that protects color-treated hair from fading',
      },
      {
        id: 'bf_color_2',
        name: 'Color-Enhancing Conditioner',
        brand: 'ColorGuard',
        tags: ['conditioner', 'color-treated', 'color-enhancing', 'moisturizing'],
        price: 21.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'color-depositing agents', 'argan oil', 'glycerin', 'panthenol'],
        imageUrl: getPlaceholderImage(21),
        description: 'Conditioner that enhances and maintains hair color',
      },
      {
        id: 'bf_color_3',
        name: 'Color-Protect Leave-In',
        brand: 'ColorGuard',
        tags: ['leave-in', 'color-treated', 'color-protect', 'heat-protectant'],
        price: 23.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'uv filters', 'heat protectants', 'glycerin', 'panthenol'],
        imageUrl: getPlaceholderImage(22),
        description: 'Leave-in treatment that protects color from heat and UV damage',
      },

      // DAMAGED HAIR / REPAIR PRODUCT LINE
      {
        id: 'bf_repair_1',
        name: 'Repair & Restore Shampoo',
        brand: 'RepairPro',
        tags: ['shampoo', 'damaged-hair', 'repair', 'restoring', 'protein'],
        price: 22.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'keratin', 'wheat protein', 'panthenol', 'glycerin'],
        imageUrl: getPlaceholderImage(23),
        description: 'Shampoo that repairs and restores damaged hair',
      },
      {
        id: 'bf_repair_2',
        name: 'Intensive Repair Mask',
        brand: 'RepairPro',
        tags: ['mask', 'damaged-hair', 'repair', 'deep-conditioning', 'keratin'],
        price: 28.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'keratin', 'silk protein', 'argan oil', 'panthenol'],
        imageUrl: getPlaceholderImage(24),
        description: 'Intensive repair mask for severely damaged hair',
      },
      {
        id: 'bf_repair_3',
        name: 'Hair Repair Serum',
        brand: 'RepairPro',
        tags: ['serum', 'damaged-hair', 'repair', 'split-ends', 'heat-protectant'],
        price: 26.99,
        source: 'beautyfeeds',
        ingredients: ['dimethicone', 'keratin', 'argan oil', 'vitamin e', 'panthenol'],
        imageUrl: getPlaceholderImage(25),
        description: 'Concentrated serum that repairs split ends and damage',
      },

      // DRY HAIR PRODUCT LINE
      {
        id: 'bf_dry_1',
        name: 'Hydrating Shampoo',
        brand: 'MoistureMax',
        tags: ['shampoo', 'dry-hair', 'hydrating', 'moisturizing', 'sulfate-free'],
        price: 17.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'hyaluronic acid', 'glycerin', 'aloe vera', 'coconut oil'],
        imageUrl: getPlaceholderImage(26),
        description: 'Ultra-hydrating shampoo for dry, dehydrated hair',
      },
      {
        id: 'bf_dry_2',
        name: 'Moisture-Rich Conditioner',
        brand: 'MoistureMax',
        tags: ['conditioner', 'dry-hair', 'moisturizing', 'hydrating', 'nourishing'],
        price: 18.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'shea butter', 'coconut oil', 'argan oil', 'glycerin'],
        imageUrl: getPlaceholderImage(27),
        description: 'Rich conditioner that deeply moisturizes dry hair',
      },
      {
        id: 'bf_dry_3',
        name: 'Hydrating Hair Oil',
        brand: 'MoistureMax',
        tags: ['oil', 'dry-hair', 'hydrating', 'moisturizing', 'shine'],
        price: 24.99,
        source: 'beautyfeeds',
        ingredients: ['argan oil', 'jojoba oil', 'coconut oil', 'avocado oil', 'vitamin e'],
        imageUrl: getPlaceholderImage(28),
        description: 'Nourishing hair oil that restores moisture to dry hair',
      },

      // OILY HAIR PRODUCT LINE
      {
        id: 'bf_oily_1',
        name: 'Clarifying Shampoo',
        brand: 'BalanceClean',
        tags: ['shampoo', 'oily-hair', 'clarifying', 'oil-control', 'deep-cleansing'],
        price: 16.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'salicylic acid', 'tea tree oil', 'glycerin', 'aloe vera'],
        imageUrl: getPlaceholderImage(29),
        description: 'Clarifying shampoo that removes excess oil and buildup',
      },
      {
        id: 'bf_oily_2',
        name: 'Lightweight Conditioner',
        brand: 'BalanceClean',
        tags: ['conditioner', 'oily-hair', 'lightweight', 'oil-free', 'non-greasy'],
        price: 15.99,
        source: 'beautyfeeds',
        ingredients: ['water', 'glycerin', 'panthenol', 'aloe vera', 'vitamin b5'],
        imageUrl: getPlaceholderImage(30),
        description: 'Lightweight conditioner that won\'t weigh down oily hair',
      },
      {
        id: 'bf_oily_3',
        name: 'Oil-Control Dry Shampoo',
        brand: 'BalanceClean',
        tags: ['dry-shampoo', 'oily-hair', 'oil-control', 'volumizing'],
        price: 13.99,
        source: 'beautyfeeds',
        ingredients: ['rice starch', 'aluminum starch', 'silica', 'tea tree oil'],
        imageUrl: getPlaceholderImage(31),
        description: 'Dry shampoo that absorbs excess oil and adds volume',
      },

      // ADDITIONAL PRODUCTS - Various Types
      // Shampoos
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `bf_shampoo_${i + 1}`,
        name: ['Purifying Shampoo', 'Nourishing Shampoo', 'Strengthening Shampoo', 'Smoothing Shampoo', 'Volumizing Shampoo', 'Repairing Shampoo', 'Hydrating Shampoo', 'Clarifying Shampoo', 'Color-Safe Shampoo', 'Anti-Dandruff Shampoo', 'Gentle Shampoo', 'Detox Shampoo', 'Moisturizing Shampoo', 'Balancing Shampoo', 'Revitalizing Shampoo'][i],
        brand: ['PureHair', 'NourishMe', 'StrongLocks', 'SmoothStyle', 'VolumePlus', 'RepairCare', 'HydratePro', 'ClarifyClean', 'ColorSafe', 'DandruffFree', 'GentleCare', 'DetoxPro', 'MoistureRich', 'BalancePro', 'ReviveMe'][i],
        tags: ['shampoo', ...(i % 3 === 0 ? ['sulfate-free'] : []), ...(i % 4 === 0 ? ['vegan'] : []), ...(i % 5 === 0 ? ['cruelty-free'] : [])],
        price: 12.99 + (i * 0.50),
        source: 'beautyfeeds' as const,
        ingredients: ['water', 'glycerin', 'aloe vera', 'coconut oil'],
        imageUrl: getPlaceholderImage(32 + i),
        description: `High-quality shampoo for healthy hair care`,
      })),

      // Conditioners
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `bf_conditioner_${i + 1}`,
        name: ['Deep Conditioner', 'Moisturizing Conditioner', 'Repair Conditioner', 'Smoothing Conditioner', 'Volumizing Conditioner', 'Color-Safe Conditioner', 'Nourishing Conditioner', 'Strengthening Conditioner', 'Hydrating Conditioner', 'Detangling Conditioner', 'Lightweight Conditioner', 'Rich Conditioner', 'Balancing Conditioner', 'Revitalizing Conditioner', 'Protective Conditioner'][i],
        brand: ['DeepCare', 'MoisturePro', 'RepairMax', 'SmoothStyle', 'VolumePlus', 'ColorGuard', 'NourishMe', 'StrongLocks', 'HydratePro', 'TangleFree', 'LightStyle', 'RichCare', 'BalancePro', 'ReviveMe', 'ProtectPro'][i],
        tags: ['conditioner', ...(i % 3 === 0 ? ['deep-conditioning'] : []), ...(i % 4 === 0 ? ['vegan'] : [])],
        price: 13.99 + (i * 0.50),
        source: 'beautyfeeds' as const,
        ingredients: ['water', 'shea butter', 'glycerin', 'argan oil'],
        imageUrl: getPlaceholderImage(47 + i),
        description: `Conditioner that nourishes and protects your hair`,
      })),

      // Hair Masks
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `bf_mask_${i + 1}`,
        name: ['Deep Conditioning Mask', 'Repair Mask', 'Hydrating Mask', 'Keratin Mask', 'Protein Mask', 'Moisture Mask', 'Color-Protect Mask', 'Smoothing Mask', 'Nourishing Mask', 'Revitalizing Mask'][i],
        brand: ['DeepCare', 'RepairPro', 'HydrateMax', 'KeratinPro', 'ProteinPlus', 'MoistureRich', 'ColorGuard', 'SmoothStyle', 'NourishMe', 'RevivePro'][i],
        tags: ['mask', 'deep-conditioning', ...(i % 2 === 0 ? ['repair'] : ['hydrating'])],
        price: 19.99 + (i * 1.00),
        source: 'beautyfeeds' as const,
        ingredients: ['water', 'shea butter', 'keratin', 'argan oil', 'panthenol'],
        imageUrl: getPlaceholderImage(62 + i),
        description: `Intensive treatment mask for deep hair care`,
      })),

      // Hair Oils
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `bf_oil_${i + 1}`,
        name: ['Argan Hair Oil', 'Coconut Hair Oil', 'Jojoba Hair Oil', 'Moroccan Oil', 'Hair Serum Oil', 'Nourishing Hair Oil', 'Shine Hair Oil', 'Repair Hair Oil', 'Lightweight Hair Oil', 'Multi-Purpose Hair Oil'][i],
        brand: ['ArganPure', 'CoconutCare', 'JojobaPro', 'MoroccanGold', 'SerumStyle', 'NourishOil', 'ShineMax', 'RepairOil', 'LightStyle', 'MultiCare'][i],
        tags: ['oil', 'hair-oil', ...(i % 3 === 0 ? ['shine'] : []), ...(i % 4 === 0 ? ['repair'] : [])],
        price: 16.99 + (i * 1.50),
        source: 'beautyfeeds' as const,
        ingredients: ['argan oil', 'jojoba oil', 'coconut oil', 'vitamin e'],
        imageUrl: getPlaceholderImage(72 + i),
        description: `Nourishing hair oil for shine and protection`,
      })),

      // Serums
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `bf_serum_${i + 1}`,
        name: ['Anti-Frizz Serum', 'Heat Protectant Serum', 'Smoothing Serum', 'Shine Serum', 'Repair Serum', 'Volumizing Serum', 'Color-Protect Serum', 'Hair Growth Serum', 'Detangling Serum', 'Multi-Benefit Serum'][i],
        brand: ['FrizzFree', 'HeatGuard', 'SmoothPro', 'ShineMax', 'RepairSerum', 'VolumePlus', 'ColorGuard', 'GrowPro', 'TangleFree', 'MultiBenefit'][i],
        tags: ['serum', ...(i % 2 === 0 ? ['heat-protectant'] : ['anti-frizz'])],
        price: 21.99 + (i * 1.00),
        source: 'beautyfeeds' as const,
        ingredients: ['dimethicone', 'argan oil', 'silk protein', 'vitamin e'],
        imageUrl: getPlaceholderImage(82 + i),
        description: `Lightweight serum for hair protection and styling`,
      })),

      // Styling Products
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `bf_style_${i + 1}`,
        name: ['Hair Gel', 'Hair Mousse', 'Hair Spray', 'Texturizing Spray', 'Curl Cream', 'Wave Spray', 'Pomade', 'Wax', 'Paste', 'Cream', 'Foam', 'Mist', 'Tonic', 'Lotion', 'Balm'][i],
        brand: ['StylePro', 'MousseMax', 'SprayStrong', 'TexturePlus', 'CurlStyle', 'WavePro', 'PomadeStyle', 'WaxPro', 'PasteStyle', 'CreamStyle', 'FoamPro', 'MistStyle', 'TonicPro', 'LotionStyle', 'BalmPro'][i],
        tags: ['styling', ...(i % 3 === 0 ? ['hold'] : []), ...(i % 4 === 0 ? ['light-hold'] : [])],
        price: 12.99 + (i * 0.75),
        source: 'beautyfeeds' as const,
        ingredients: ['water', 'pvp', 'glycerin', 'alcohol'],
        imageUrl: getPlaceholderImage(92 + i),
        description: `Styling product for your desired look`,
      })),

      // Leave-In Treatments
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `bf_leavein_${i + 1}`,
        name: ['Leave-In Conditioner', 'Detangling Leave-In', 'Moisturizing Leave-In', 'Heat Protectant Leave-In', 'Color-Protect Leave-In', 'Repair Leave-In', 'Lightweight Leave-In', 'Rich Leave-In'][i],
        brand: ['LeaveInPro', 'TangleFree', 'MoistureMax', 'HeatGuard', 'ColorGuard', 'RepairPro', 'LightStyle', 'RichCare'][i],
        tags: ['leave-in', ...(i % 2 === 0 ? ['moisturizing'] : ['heat-protectant'])],
        price: 17.99 + (i * 1.00),
        source: 'beautyfeeds' as const,
        ingredients: ['water', 'glycerin', 'panthenol', 'aloe vera'],
        imageUrl: getPlaceholderImage(107 + i),
        description: `Leave-in treatment for daily hair care`,
      })),

      // Dry Shampoos
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `bf_dryshampoo_${i + 1}`,
        name: ['Volumizing Dry Shampoo', 'Oil-Absorbing Dry Shampoo', 'Color-Safe Dry Shampoo', 'Fragrance-Free Dry Shampoo', 'Tinted Dry Shampoo'][i],
        brand: ['VolumePlus', 'OilFree', 'ColorGuard', 'FragranceFree', 'TintPro'][i],
        tags: ['dry-shampoo', ...(i % 2 === 0 ? ['volumizing'] : ['oil-absorbing'])],
        price: 11.99 + (i * 0.50),
        source: 'beautyfeeds' as const,
        ingredients: ['rice starch', 'aluminum starch', 'silica'],
        imageUrl: getPlaceholderImage(115 + i),
        description: `Dry shampoo for quick hair refresh`,
      })),
    ];

    // Filter by tags if provided, otherwise return all
    // For generic tags like 'shampoo', 'conditioner', 'hair-care', return all products
    let filtered = mockProducts;
    if (tags && tags.length > 0) {
      const tagLower = tags.map(t => t.toLowerCase());
      const genericTags = ['shampoo', 'conditioner', 'hair-care', 'hair-treatment', 'hair', 'care'];
      const isGenericSearch = tagLower.some(t => genericTags.some(gt => t.includes(gt)));
      
      if (!isGenericSearch) {
        // Only filter if searching for specific tags
        filtered = mockProducts.filter(product => 
          product.tags.some(tag => tagLower.some(t => tag.toLowerCase().includes(t)))
        );
      }
      // If generic search, return all products (already set to mockProducts)
    }

    // Return all products up to the limit (or all if limit is high enough)
    return filtered.slice(0, Math.max(limit, filtered.length));
  }
}
