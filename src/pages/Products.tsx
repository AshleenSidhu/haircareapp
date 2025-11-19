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
import { fetchProducts, filterProducts } from "../lib/utils/products";
import { syncProductsToFirestore } from "../lib/utils/productSync";
import { populateDatabase } from "../lib/utils/populateDatabase";
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

const Products = () => {
  const { currentUser } = useAuth();
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

  // Auto-load products from database on mount
  useEffect(() => {
    const initializeProducts = async () => {
      try {
        // First, try to load existing products from database
        const fetchedProducts = await fetchProducts(undefined, 200);
        
        if (fetchedProducts.length > 0) {
          // Products exist, set them
          setProducts(fetchedProducts);
          setFilteredProducts(fetchedProducts);
          setLoading(false);
        } else {
          // No products found, silently populate database in background
          if (!hasAttemptedSyncRef.current) {
            console.log('[Products] No products found, populating database...');
            hasAttemptedSyncRef.current = true;
            setSyncing(true);
            
            try {
              const result = await populateDatabase();
              console.log(`[Products] Database populated: ${result.productsAdded} products added`);
              
              // Wait a bit for Firestore to process
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Reload products after population
              await loadProducts();
            } catch (error: any) {
              console.error('[Products] Error populating database:', error);
            } finally {
              setSyncing(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const fetchedProducts = await fetchProducts(undefined, 200); // Increased limit to show all products
      console.log(`[Products] Loaded ${fetchedProducts.length} products from Firestore`);
      
      // Debug: Check if products have images
      if (fetchedProducts.length > 0) {
        console.log('[Products] First product:', fetchedProducts[0]);
        console.log('[Products] First product imageUrl:', fetchedProducts[0].imageUrl);
        const productsWithImages = fetchedProducts.filter(p => p.imageUrl);
        console.log(`[Products] Products with images: ${productsWithImages.length}/${fetchedProducts.length}`);
      }
      
      // Filter out any undefined/null products and ensure all have required fields
      const validProducts = fetchedProducts.filter((p): p is Product => 
        p != null && 
        typeof p === 'object' && 
        p.id != null && 
        p.title != null && 
        p.brand != null
      );
      
      console.log(`[Products] Valid products: ${validProducts.length} (filtered ${fetchedProducts.length - validProducts.length} invalid)`);
      
      setProducts(validProducts);
      setFilteredProducts(validProducts);
    } catch (error: any) {
      console.error("Error loading products:", error);
      // Don't show toast for empty results, only for actual errors
      if (error.message && !error.message.includes('empty')) {
        toast({
          title: "Error loading products",
          description: error.message || "Please try again later.",
          variant: "destructive",
        });
      }
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
          description: "Fetching products from APIs. This may take a minute.",
        });
      }

      console.log('[Products] Starting product sync...');
      console.log('[Products] User authenticated:', currentUser.uid);
      const result = await syncProductsToFirestore(['shampoo', 'conditioner', 'hair-care', 'hair-treatment'], 150); // Increased to sync all 120+ products
      
      console.log(`[Products] Sync result: ${result.success}, products synced: ${result.productsSynced}`);
      
      if (result.success) {
        if (showToast) {
          toast({
            title: "Products synced!",
            description: `Successfully synced ${result.productsSynced} products to the database.`,
          });
        }
        
        // Wait a bit before reloading to ensure Firestore has processed the writes
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reload products after sync
        await loadProducts();
      } else {
        if (showToast) {
          toast({
            title: "Sync completed with errors",
            description: result.errors?.join(', ') || "Some products may not have synced.",
            variant: "destructive",
          });
        }
        
        // Still reload to show what was synced
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loadProducts();
      }
    } catch (error: any) {
      console.error("Error syncing products:", error);
      if (showToast) {
        toast({
          title: "Error syncing products",
          description: error.message || "Please try again later.",
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
            <p className="text-muted-foreground">No products found matching your filters.</p>
            {hasActiveFilters() && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
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
