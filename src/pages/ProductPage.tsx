/**
 * Product Page Component
 * Displays product details with ingredient science and compatibility scoring
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Skeleton } from '../components/ui/skeleton';
import { Alert, AlertDescription } from '../components/ui/alert';
import { IngredientPopover } from '../components/IngredientPopover';
import { CompatibilityBadge } from '../components/CompatibilityBadge';
import { useFetchWithCache } from '../hooks/useFetchWithCache';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { ApiProduct, UserProfile } from '../lib/types/api';
import { calculateCompatibility } from '../lib/utils/compatibilityScore';
import { parseIngredientsText } from '../lib/utils/ingredientNormalizer';
import {
  ArrowLeft,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// TODO: Replace with actual Firebase Functions base URL
// Format: https://REGION-PROJECT_ID.cloudfunctions.net
// Example: https://northamerica-northeast1-hair-care-ad421.cloudfunctions.net
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com';

export function ProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showNormalized, setShowNormalized] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [compatibilityScore, setCompatibilityScore] = useState<number | null>(null);
  const [compatibilityExplainers, setCompatibilityExplainers] = useState<string[]>([]);

  // Build API URL with user profile for server-side compatibility scoring
  const buildProductUrl = () => {
    if (!productId) return null;
    const baseUrl = `${API_BASE}/api/products/${productId}`;
    if (userProfile) {
      const params = new URLSearchParams({
        user_profile: JSON.stringify(userProfile),
      });
      return `${baseUrl}?${params.toString()}`;
    }
    return baseUrl;
  };

  // Fetch product data (with user profile for server-side scoring)
  const {
    data: productData,
    loading: productLoading,
    error: productError,
  } = useFetchWithCache<ApiProduct>(buildProductUrl());

  // Load user profile from localStorage or context
  useEffect(() => {
    if (currentUser) {
      // Try to load from localStorage (set by quiz)
      const savedProfile = localStorage.getItem(`userProfile_${currentUser.uid}`);
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile);
          setUserProfile(profile);
        } catch (e) {
          console.error('Error parsing user profile:', e);
        }
      }
    }
  }, [currentUser]);

  // Update product state when data is fetched
  useEffect(() => {
    if (productData) {
      setProduct(productData);
      setLoading(false);

      // Use server-calculated compatibility score if available
      if (productData.compatibility_score) {
        setCompatibilityScore(productData.compatibility_score.score);
        setCompatibilityExplainers(productData.compatibility_score.explainers);
      } else if (productData.product_profile && userProfile) {
        // Fallback to client-side calculation if server didn't calculate
        const result = calculateCompatibility(productData.product_profile, userProfile);
        setCompatibilityScore(result.score);
        setCompatibilityExplainers(result.explainers);
      }
    } else if (productError) {
      setError('Failed to load product. Please try again later.');
      setLoading(false);
    } else if (productLoading) {
      setLoading(true);
    }
  }, [productData, productError, productLoading, userProfile]);

  // Handle image fallback
  const handleImageError = async () => {
    if (!product) return;

    const images = product.images || {};
    const fallbackOrder = [images.ingredients, getPlaceholderImage()];

    for (const fallbackUrl of fallbackOrder) {
      if (fallbackUrl) {
        try {
          const response = await fetch(fallbackUrl, { method: 'HEAD' });
          if (response.ok) {
            setImageError(false);
            return;
          }
        } catch (e) {
          continue;
        }
      }
    }

    setImageError(true);
  };

  const getPlaceholderImage = () => {
    // Try to get from placeholder API, fallback to static
    return '/assets/img/product-placeholder.png';
  };

  const getCurrentImage = () => {
    if (!product) return null;

    const images = product.images || {};
    const imageList = [images.front, images.ingredients].filter(Boolean);

    if (imageError || imageList.length === 0) {
      return getPlaceholderImage();
    }

    return imageList[currentImageIndex] || imageList[0];
  };

  const getNextImage = () => {
    if (!product) return;
    const images = product.images || {};
    const imageList = [images.front, images.ingredients].filter(Boolean);
    setCurrentImageIndex((prev) => (prev + 1) % imageList.length);
  };

  const getPrevImage = () => {
    if (!product) return;
    const images = product.images || {};
    const imageList = [images.front, images.ingredients].filter(Boolean);
    setCurrentImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Product not found'}
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  const images = product.images || {};
  const imageList = [images.front, images.ingredients].filter(Boolean);
  const hasMultipleImages = imageList.length > 1;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Images */}
          <div>
            <Card className="overflow-hidden">
              <div className="relative aspect-square">
                {imageError ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <AlertCircle className="w-16 h-16 text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <img
                      src={getCurrentImage() || getPlaceholderImage()}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                    />
                    {hasMultipleImages && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-2 top-1/2 -translate-y-1/2"
                          onClick={getPrevImage}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={getNextImage}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: Product Info */}
          <div className="space-y-6">
            {/* Product Header */}
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              {product.brand && (
                <p className="text-lg text-muted-foreground mb-4">{product.brand}</p>
              )}
              {product.categories && product.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.categories.map((category, index) => (
                    <Badge key={index} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Compatibility Score */}
            {compatibilityScore !== null && (
              <CompatibilityBadge
                score={compatibilityScore}
                explainers={compatibilityExplainers}
                productProfile={product.product_profile}
                userProfile={userProfile || undefined}
              />
            )}

            {/* Ingredients Section */}
            {product.ingredients_inci && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Ingredients</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNormalized(!showNormalized)}
                  >
                    {showNormalized ? 'Show INCI' : 'Show Normalized'}
                  </Button>
                </div>

                {showNormalized && product.normalized_ingredients ? (
                  <div className="space-y-2">
                    {product.normalized_ingredients.map((ing, index) => (
                      <IngredientPopover key={index} inciName={ing}>
                        <Button variant="link" className="p-0 h-auto text-sm">
                          {ing}
                        </Button>
                      </IngredientPopover>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {product.ingredients_inci.split(',').map((ing, index) => {
                      const trimmed = ing.trim();
                      const normalized = product.normalized_ingredients?.find(
                        (n) => n.toLowerCase() === trimmed.toLowerCase()
                      );

                      if (normalized) {
                        return (
                          <IngredientPopover key={index} inciName={normalized}>
                            <span className="text-sm cursor-pointer hover:underline text-primary">
                              {trimmed}
                            </span>
                          </IngredientPopover>
                        );
                      }

                      return (
                        <span key={index} className="text-sm">
                          {trimmed}
                        </span>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {/* Ingredient Science Summary */}
            {product.ingredient_science && product.ingredient_science.length > 0 && (
              <Card className="p-4">
                <h2 className="text-xl font-semibold mb-4">Ingredient Science</h2>
                <div className="space-y-3">
                  {product.ingredient_science.map((science, index) => (
                    <div key={index} className="border-b pb-3 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">{science.inci_name}</span>
                        {science.functions && science.functions.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {science.functions.map((func, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {func}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {science.tags && science.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {science.tags.map((tag, i) => (
                            <Badge
                              key={i}
                              variant={
                                tag === 'harsh' || tag === 'irritant'
                                  ? 'destructive'
                                  : tag === 'safe' || tag === 'hydration'
                                  ? 'default'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {science.safety_notes && (
                        <p className="text-xs text-muted-foreground">{science.safety_notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* External Link */}
            {product.url && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(product.url, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Open Beauty Facts
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

