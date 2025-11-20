/**
 * Products Page with Advanced Filtering
 * Allows users to filter products by allergens, ingredients, sustainability, and locally-owned brands
 */

import { useState, useEffect, useRef } from "react";
import { Layout } from "../components/Layout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { ProductDetails } from "../components/ProductDetails";
import { Product, ProductFilters } from "../lib/types/products";
import { filterProducts, fetchProducts } from "../lib/utils/products";
import { 
  Filter, 
  Search, 
  Sparkles, 
  Leaf, 
  Shield,
  X,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import { syncProducts as syncProductsFunction } from "../lib/firebase";

const Products = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const hasAttemptedSyncRef = useRef(false); // Use ref to prevent re-renders

  // Filter state
  const [filters, setFilters] = useState<ProductFilters>({});
  const [allergenInput, setAllergenInput] = useState("");
  const [includeIngredientInput, setIncludeIngredientInput] = useState("");
  const [excludeIngredientInput, setExcludeIngredientInput] = useState("");

  // Auto-load products from Firestore on mount (no CORS issues!)
  useEffect(() => {
    const initializeProducts = async () => {
      // Wait for auth to be ready
      if (authLoading) {
        return;
      }
      
      try {
        setLoading(true);
        
        // First, try to load products from Firestore (fast, no CORS issues)
        console.log('[Products] Loading products from Firestore...');
        const firestoreProducts = await fetchProducts(undefined, 200);
        
        if (firestoreProducts && firestoreProducts.length > 0) {
          console.log(`[Products] Loaded ${firestoreProducts.length} products from Firestore`);
          console.log('[Products] First product sample:', firestoreProducts[0]);
          setProducts(firestoreProducts);
          setFilteredProducts(firestoreProducts);
          setLoading(false);
          
          // Optionally sync in background to update products (non-blocking)
          if (currentUser && !hasAttemptedSyncRef.current) {
            hasAttemptedSyncRef.current = true;
            // Sync in background without blocking UI
            syncProductsFunction({
              tags: ['shampoo', 'conditioner', 'hair-care'],
              limit: 100
            }).then((syncResult) => {
              // Firebase callable functions always wrap response in .data
              // Handle both cases for safety
              const result = syncResult?.data || syncResult;
              if (result && typeof result === 'object' && 'success' in result) {
                const syncData = result as { 
                  success: boolean; 
                  productsSynced: number;
                };
                if (syncData.success && syncData.productsSynced > 0) {
                  // Reload products after sync
                  fetchProducts(undefined, 200).then((updatedProducts) => {
                    if (updatedProducts.length > 0) {
                      setProducts(updatedProducts);
                      setFilteredProducts(updatedProducts);
                    }
                  });
                }
              }
            }).catch((error: any) => {
              // Silently handle background sync errors - they're non-critical
              if (error?.code === 'functions/not-found') {
                console.warn('[Products] syncProducts function not deployed yet');
              } else if (error?.message?.includes('missing data field')) {
                console.warn('[Products] syncProducts returned invalid response - function may need redeployment');
              } else {
                console.warn('[Products] Background sync failed (non-critical):', error?.message || error);
              }
            });
          }
        } else {
          // No products in Firestore - trigger sync
          console.warn('[Products] No products returned from fetchProducts');
          console.warn('[Products] This could mean:');
          console.warn('  1. No products in Firestore - try syncing products');
          console.warn('  2. Products exist but were filtered out');
          console.warn('  3. Firestore query failed - check console for errors');
          setLoading(false);
          
          console.log('[Products] No products in Firestore, triggering sync...');
          if (currentUser && !hasAttemptedSyncRef.current) {
            hasAttemptedSyncRef.current = true;
            setSyncing(true);
            
            try {
              await currentUser.getIdToken();
              console.log('[Products] Calling syncProducts (handleSyncProducts)...');
              console.log('[Products] User:', currentUser?.uid);
              console.log('[Products] Function name: syncProducts');
              
              let syncResult;
              try {
                syncResult = await syncProductsFunction({
                  tags: ['shampoo', 'conditioner', 'hair-care'],
                  limit: 100
                });
                console.log('[Products] Sync result received:', syncResult);
                console.log('[Products] Sync result type:', typeof syncResult);
                console.log('[Products] Sync result keys:', syncResult ? Object.keys(syncResult) : 'null');
                console.log('[Products] Sync result.data:', syncResult?.data);
              } catch (funcError: any) {
                console.error('[Products] Function call error:', funcError);
                console.error('[Products] Error code:', funcError.code);
                console.error('[Products] Error message:', funcError.message);
                console.error('[Products] Error details:', funcError.details);
                throw funcError;
              }
              
              // Firebase callable functions wrap response in .data
              if (!syncResult) {
                throw new Error('syncProducts returned null or undefined');
              }
              
              // Handle response - Firebase callable functions always wrap in .data
              const result = (syncResult?.data || syncResult) as { 
                success: boolean; 
                productsSynced: number;
              };
              
              if (!result || typeof result !== 'object' || !('success' in result)) {
                console.error('[Products] Invalid response structure:', JSON.stringify(syncResult, null, 2));
                throw new Error('Invalid response from syncProducts: missing data field. The function may not be deployed or may have returned an unexpected format.');
              }
              
              if (result && result.success) {
                // Reload products from Firestore after sync
                const syncedProducts = await fetchProducts(undefined, 200);
                if (syncedProducts.length > 0) {
                  setProducts(syncedProducts);
                  setFilteredProducts(syncedProducts);
                  toast({
                    title: "Products synced",
                    description: `Successfully synced ${result.productsSynced} products from APIs.`,
                  });
                }
              }
            } catch (error: any) {
              console.error('[Products] Error syncing products:', error);
              console.error('[Products] Error code:', error.code);
              console.error('[Products] Error message:', error.message);
              console.error('[Products] Error details:', error.details);
              toast({
                title: "Sync failed",
                description: error.message || "Could not sync products. Please try again later.",
                variant: "destructive",
              });
            } finally {
              setSyncing(false);
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        }
      } catch (error: any) {
        console.error('[Products] Error initializing products:', error);
        setLoading(false);
      }
    };

    initializeProducts();
  }, [currentUser, authLoading]);

  useEffect(() => {
    // Apply filters when products or filters change
    if (products.length > 0) {
      const filtered = filterProducts(products, filters);
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [products, filters]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      console.log('[Products] Loading products from Firestore...');
      
      // Load products from Firestore (no CORS issues!)
      const firestoreProducts = await fetchProducts(undefined, 200);
      
      if (firestoreProducts && firestoreProducts.length > 0) {
        console.log(`[Products] Loaded ${firestoreProducts.length} products from Firestore`);
        setProducts(firestoreProducts);
        setFilteredProducts(firestoreProducts);
      } else {
        console.warn('[Products] No products in Firestore');
        toast({
          title: "No products found",
          description: "No products available. Try syncing products first.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error loading products:", error);
      toast({
        title: "Error loading products",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncProducts = async (showToast: boolean = true) => {
    if (syncing) {
      console.log('[Products] Sync already in progress, skipping');
      return;
    }
    
    // Check authentication
    if (!currentUser) {
      console.error('[Products] User not authenticated, cannot sync products');
      if (showToast) {
        toast({
          title: "Authentication required",
          description: "Please log in to sync products.",
          variant: "destructive",
        });
      }
      return;
    }
    
    setSyncing(true);
    try {
      if (showToast) {
        toast({
          title: "Syncing products...",
          description: "Fetching products from APIs and storing in Firestore. This may take a minute.",
        });
      }

      console.log('[Products] Starting product sync via Firebase Function...');
      console.log('[Products] User authenticated:', currentUser.uid);
      
      // Get auth token
      await currentUser.getIdToken();
      
      // Use Firebase Function to sync real products from APIs (Open Beauty Facts)
      console.log('[Products] Calling syncProducts callable function...');
      console.log('[Products] User authenticated:', !!currentUser);
      console.log('[Products] User ID:', currentUser?.uid);
      
      let result;
      try {
        result = await syncProductsFunction({
          tags: ['shampoo', 'conditioner', 'hair-care'],
          limit: 100
        });
        console.log('[Products] Sync function returned:', result);
        console.log('[Products] Result type:', typeof result);
        console.log('[Products] Result.data:', result.data);
        console.log('[Products] Result keys:', Object.keys(result));
      } catch (callError: any) {
        console.error('[Products] Error calling syncProducts:', callError);
        console.error('[Products] Error code:', callError.code);
        console.error('[Products] Error message:', callError.message);
        console.error('[Products] Error details:', callError.details);
        throw callError; // Re-throw to be caught by outer catch
      }
      
      // Firebase callable functions return { data: <result> }
      // But if the function throws an error, result might be undefined
      if (!result) {
        throw new Error('syncProducts returned undefined');
      }
      
      // Access the data field (Firebase callable functions wrap response in .data)
      // Handle both cases for safety
      const syncResult = (result?.data || result) as { 
        success: boolean; 
        productsSynced: number; 
        totalFound: number;
        errors?: string[] 
      };
      
      if (!syncResult || typeof syncResult !== 'object' || !('success' in syncResult)) {
        console.error('[Products] Invalid response structure:', JSON.stringify(result, null, 2));
        throw new Error('syncProducts returned invalid response. The function may not be deployed or may have returned an unexpected format.');
      }
      
      console.log(`[Products] Sync result: ${syncResult.success}, products synced: ${syncResult.productsSynced}`);
      
      if (syncResult.success && syncResult.productsSynced > 0) {
        // Reload products from Firestore (no CORS issues!)
        console.log('[Products] Reloading products from Firestore after sync...');
        const syncedProducts = await fetchProducts(undefined, 200);
        
        if (syncedProducts.length > 0) {
          setProducts(syncedProducts);
          setFilteredProducts(syncedProducts);
          
          if (showToast) {
            toast({
              title: "Products synced!",
              description: `Successfully synced ${syncResult.productsSynced} products from APIs.`,
            });
          }
        } else {
          if (showToast) {
            toast({
              title: "Sync completed",
              description: `Synced ${syncResult.productsSynced} products, but couldn't load them from Firestore.`,
              variant: "destructive",
            });
          }
        }
      } else {
        if (showToast) {
          toast({
            title: "No products synced",
            description: syncResult.errors?.join(', ') || "Could not sync products from APIs.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Error syncing products:", error);
      if (showToast) {
        toast({
          title: "Sync Error",
          description: error.message || "Failed to sync real products from APIs. Only real products from Open Beauty Facts and BeautyFeeds are used - no mock data.",
          variant: "destructive",
        });
      }
    } finally {
      setSyncing(false);
    }
  };

  const addAllergen = () => {
    if (allergenInput.trim()) {
      setFilters({
        ...filters,
        allergens: [...(filters.allergens || []), allergenInput.trim()],
      });
      setAllergenInput("");
    }
  };

  const removeAllergen = (allergen: string) => {
    setFilters({
      ...filters,
      allergens: filters.allergens?.filter(a => a !== allergen) || [],
    });
  };

  const addIncludeIngredient = () => {
    if (includeIngredientInput.trim()) {
      setFilters({
        ...filters,
        includeIngredients: [...(filters.includeIngredients || []), includeIngredientInput.trim()],
      });
      setIncludeIngredientInput("");
    }
  };

  const removeIncludeIngredient = (ingredient: string) => {
    setFilters({
      ...filters,
      includeIngredients: filters.includeIngredients?.filter(i => i !== ingredient) || [],
    });
  };

  const addExcludeIngredient = () => {
    if (excludeIngredientInput.trim()) {
      setFilters({
        ...filters,
        excludeIngredients: [...(filters.excludeIngredients || []), excludeIngredientInput.trim()],
      });
      setExcludeIngredientInput("");
    }
  };

  const removeExcludeIngredient = (ingredient: string) => {
    setFilters({
      ...filters,
      excludeIngredients: filters.excludeIngredients?.filter(i => i !== ingredient) || [],
    });
  };

  const clearFilters = () => {
    setFilters({});
    setAllergenInput("");
    setIncludeIngredientInput("");
    setExcludeIngredientInput("");
  };

  const hasActiveFilters = () => {
    return !!(
      filters.allergens?.length ||
      filters.includeIngredients?.length ||
      filters.excludeIngredients?.length ||
      filters.sustainability ||
      filters.minRating ||
      filters.maxPrice
    );
  };

  return (
    <Layout showBackButton>
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl mb-2 text-foreground">Our Products</h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Discover curated hair care products tailored to your unique needs
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters() && (
                <Badge variant="secondary" className="ml-2">
                  {[
                    filters.allergens?.length || 0,
                    filters.includeIngredients?.length || 0,
                    filters.excludeIngredients?.length || 0,
                    filters.sustainability ? Object.values(filters.sustainability).filter(Boolean).length : 0,
                  ].reduce((a, b) => a + b, 0)}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="p-6 mb-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Filter Products</h3>
                  {hasActiveFilters() && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear All
                    </Button>
                  )}
                </div>

                {/* Allergens Filter */}
                <div>
                  <Label className="mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Avoid Allergens
                  </Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Enter allergen to avoid..."
                      value={allergenInput}
                      onChange={(e) => setAllergenInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addAllergen()}
                    />
                    <Button onClick={addAllergen}>Add</Button>
                  </div>
                  {filters.allergens && filters.allergens.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {filters.allergens.map((allergen, index) => (
                        <Badge key={index} variant="destructive" className="flex items-center gap-1">
                          {allergen}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeAllergen(allergen)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Include Ingredients */}
                <div>
                  <Label className="mb-2">Include Ingredients</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Enter ingredient to include..."
                      value={includeIngredientInput}
                      onChange={(e) => setIncludeIngredientInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addIncludeIngredient()}
                    />
                    <Button onClick={addIncludeIngredient}>Add</Button>
                  </div>
                  {filters.includeIngredients && filters.includeIngredients.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {filters.includeIngredients.map((ingredient, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {ingredient}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeIncludeIngredient(ingredient)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Exclude Ingredients */}
                <div>
                  <Label className="mb-2">Exclude Ingredients</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Enter ingredient to exclude..."
                      value={excludeIngredientInput}
                      onChange={(e) => setExcludeIngredientInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addExcludeIngredient()}
                    />
                    <Button onClick={addExcludeIngredient}>Add</Button>
                  </div>
                  {filters.excludeIngredients && filters.excludeIngredients.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {filters.excludeIngredients.map((ingredient, index) => (
                        <Badge key={index} variant="outline" className="flex items-center gap-1">
                          {ingredient}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeExcludeIngredient(ingredient)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sustainability Filters */}
                <div>
                  <Label className="mb-3 flex items-center gap-2">
                    <Leaf className="w-4 h-4" />
                    Sustainability
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="eco-friendly"
                        checked={filters.sustainability?.ecoFriendly || false}
                        onCheckedChange={(checked) =>
                          setFilters({
                            ...filters,
                            sustainability: {
                              ...filters.sustainability,
                              ecoFriendly: checked as boolean,
                            },
                          })
                        }
                      />
                      <Label htmlFor="eco-friendly" className="cursor-pointer">
                        Eco-Friendly
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sustainable"
                        checked={filters.sustainability?.sustainable || false}
                        onCheckedChange={(checked) =>
                          setFilters({
                            ...filters,
                            sustainability: {
                              ...filters.sustainability,
                              sustainable: checked as boolean,
                            },
                          })
                        }
                      />
                      <Label htmlFor="sustainable" className="cursor-pointer">
                        Sustainable
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="cruelty-free"
                        checked={filters.sustainability?.crueltyFree || false}
                        onCheckedChange={(checked) =>
                          setFilters({
                            ...filters,
                            sustainability: {
                              ...filters.sustainability,
                              crueltyFree: checked as boolean,
                            },
                          })
                        }
                      />
                      <Label htmlFor="cruelty-free" className="cursor-pointer">
                        Cruelty-Free
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="locally-owned"
                        checked={filters.sustainability?.locallyOwned || false}
                        onCheckedChange={(checked) =>
                          setFilters({
                            ...filters,
                            sustainability: {
                              ...filters.sustainability,
                              locallyOwned: checked as boolean,
                            },
                          })
                        }
                      />
                      <Label htmlFor="locally-owned" className="cursor-pointer">
                        Locally Owned
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="small-brand"
                        checked={filters.sustainability?.smallBrand || false}
                        onCheckedChange={(checked) =>
                          setFilters({
                            ...filters,
                            sustainability: {
                              ...filters.sustainability,
                              smallBrand: checked as boolean,
                            },
                          })
                        }
                      />
                      <Label htmlFor="small-brand" className="cursor-pointer">
                        Small Brand
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <Label>Minimum Rating</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    placeholder="0.0"
                    value={filters.minRating || ""}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        minRating: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>

                {/* Price Filter */}
                <div>
                  <Label>Maximum Price ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="No limit"
                    value={filters.maxPrice || ""}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        maxPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {syncing ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading products...</span>
                </div>
              ) : (
                `Showing ${filteredProducts.length} of ${products.length} products`
              )}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <Card className="p-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary opacity-50" />
            <h3 className="text-xl mb-2 text-foreground">
              {syncing ? 'Loading Products...' : 'No Products Found'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {syncing 
                ? 'Loading products from database. Please wait...'
                : 'No products available. Products will load automatically.'}
            </p>
            {syncing && (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              {hasActiveFilters() 
                ? "No products found matching your filters."
                : "No products found. Try syncing products from Open Beauty Facts."}
            </p>
            {hasActiveFilters() && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
            {!hasActiveFilters() && currentUser && (
              <Button variant="outline" className="mt-4" onClick={() => handleSyncProducts(true)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Products
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts
              .filter((product): product is Product => product != null && typeof product === 'object' && product.id != null)
              .map((product) => (
              <Card
                key={product.id}
                className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="w-full h-48 bg-muted rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                  {product?.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title || 'Product image'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error(`[Products] Image failed to load for ${product?.title}:`, product?.imageUrl);
                        // Fallback to placeholder if image fails
                        (e.target as HTMLImageElement).src = `https://picsum.photos/400/400?random=${product?.id || Math.random()}`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Sparkles className="w-12 h-12 text-primary" />
                    </div>
                  )}
                </div>
                <h3 className="text-xl mb-2 text-foreground">{product?.title || 'Unknown Product'}</h3>
                <p className="text-muted-foreground mb-2">{product?.brand || 'Unknown Brand'}</p>
                {product.reviews && product.reviews.averageRating > 0 && (
                  <div className="flex items-center gap-1 mb-3">
                    <span className="text-sm font-medium">
                      {product.reviews.averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({product.reviews.totalReviews} reviews)
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mb-4">
                  {product?.sustainability?.ecoFriendly && (
                    <Badge variant="secondary" className="text-xs">
                      <Leaf className="w-3 h-3 mr-1" />
                      Eco
                    </Badge>
                  )}
                  {product?.sustainability?.crueltyFree && (
                    <Badge variant="secondary" className="text-xs">
                      Cruelty-Free
                    </Badge>
                  )}
                  {product?.sustainability?.locallyOwned && (
                    <Badge variant="secondary" className="text-xs">
                      Local
                    </Badge>
                  )}
                </div>
                <Button variant="outline" className="w-full">
                  View Details
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      <ProductDetails
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      />
    </Layout>
  );
};

export default Products;
