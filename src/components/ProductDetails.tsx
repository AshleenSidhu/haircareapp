/**
 * Product Details Component
 * Displays full product information including ingredients, AI explanations, reviews, and sustainability info
 */

import { Product } from '../lib/types/products';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { 
  Heart, 
  Star, 
  Leaf, 
  Shield, 
  AlertTriangle, 
  Sparkles,
  ExternalLink,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { likeProduct, unlikeProduct, isProductLiked } from '../lib/utils/products';
import { useToast } from '../hooks/use-toast';
import { getProductDetails } from '../lib/firebase';
import { ProductImage } from './ProductImage';

interface ProductDetailsProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userQuizAnswers?: any; // For AI recommendation explanation
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  open,
  onOpenChange,
  userQuizAnswers,
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enrichedProduct, setEnrichedProduct] = useState<Product | null>(product);
  const [loadingEnrichment, setLoadingEnrichment] = useState(false);

  useEffect(() => {
    if (product && currentUser) {
      checkLikedStatus();
    }
  }, [product, currentUser]);

  // Fetch enriched product data with AI explanations when dialog opens
  useEffect(() => {
    if (open && product && currentUser) {
      fetchEnrichedProduct();
    } else {
      setEnrichedProduct(product);
    }
  }, [open, product, currentUser]);

  const fetchEnrichedProduct = async () => {
    if (!product || !currentUser) return;
    
    setLoadingEnrichment(true);
    try {
      const result = await getProductDetails({ productId: product.id });
      const enriched = result.data as { product: Product };
      if (enriched?.product) {
        setEnrichedProduct(enriched.product);
      }
    } catch (error: any) {
      console.error('Error fetching enriched product:', error);
      // Keep original product if enrichment fails
      setEnrichedProduct(product);
    } finally {
      setLoadingEnrichment(false);
    }
  };

  const checkLikedStatus = async () => {
    if (!product || !currentUser) return;
    try {
      const liked = await isProductLiked(currentUser.uid, product.id);
      setIsLiked(liked);
    } catch (error) {
      console.error('Error checking liked status:', error);
    }
  };

  const handleLikeToggle = async () => {
    if (!product || !currentUser) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to like products.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isLiked) {
        await unlikeProduct(currentUser.uid, product.id);
        setIsLiked(false);
        toast({
          title: "Product unliked",
          description: "Removed from your favorites.",
        });
      } else {
        await likeProduct(currentUser.uid, product);
        setIsLiked(true);
        toast({
          title: "Product liked",
          description: "Added to your favorites.",
        });
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update favorite status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  // Use enriched product if available, otherwise use original
  const displayProduct = enrichedProduct || product;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-3xl mb-2">{displayProduct.title}</DialogTitle>
              <p className="text-lg text-muted-foreground">{displayProduct.brand}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLikeToggle}
              disabled={loading}
              className={isLiked ? "text-red-500" : ""}
            >
              <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {loadingEnrichment && (
            <div className="text-center py-4 text-muted-foreground">
              <Sparkles className="w-5 h-5 inline-block mr-2 animate-pulse" />
              Loading AI-powered ingredient explanations...
            </div>
          )}

          {/* Main Image */}
          <div className="w-full h-64 rounded-lg overflow-hidden bg-muted">
            <ProductImage
              product={{
                images: {
                  front: displayProduct.imageUrl,
                },
              }}
              alt={displayProduct.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Tags */}
          {displayProduct.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {displayProduct.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Reviews Summary */}
          {displayProduct.reviews && displayProduct.reviews.totalReviews > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-2xl font-semibold">
                    {displayProduct.reviews.averageRating.toFixed(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {displayProduct.reviews.totalReviews} reviews
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* AI Recommendation Explanation */}
          {displayProduct.aiRecommendationExplanation && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">Why this product fits you</h3>
                  <p className="text-sm text-muted-foreground">
                    {displayProduct.aiRecommendationExplanation}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Separator />

          {/* Ingredients with AI Explanations */}
          {displayProduct.ingredients && displayProduct.ingredients.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Ingredients & AI Explanations
              </h3>
              <div className="space-y-3">
                {displayProduct.ingredients.map((ingredient, index) => {
                  // Handle both string and IngredientWithExplanation formats
                  const ingredientName = typeof ingredient === 'string' ? ingredient : ingredient.name;
                  const ingredientExplanation = typeof ingredient === 'string' 
                    ? 'Ingredient information will be available after enrichment.' 
                    : ingredient.aiExplanation || 'No explanation available.';
                  const ingredientSafety = typeof ingredient === 'string' 
                    ? 'safe' 
                    : ingredient.safetyLevel || 'safe';
                  const ingredientAllergen = typeof ingredient === 'string' 
                    ? false 
                    : ingredient.allergenFlag || false;
                  
                  return (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ingredientName}</span>
                          {ingredientAllergen && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Allergen
                            </Badge>
                          )}
                          <Badge
                            variant={
                              ingredientSafety === 'safe'
                                ? 'default'
                                : ingredientSafety === 'caution'
                                ? 'secondary'
                                : 'destructive'
                            }
                            className="text-xs"
                          >
                            {ingredientSafety}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ingredientExplanation}
                      </p>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Safety & Allergen Warnings */}
          {displayProduct.safety && displayProduct.safety.allergenWarnings && displayProduct.safety.allergenWarnings.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Safety & Allergen Warnings
              </h3>
              <div className="space-y-2">
                {displayProduct.safety.allergenWarnings.map((warning, index) => (
                  <Card
                    key={index}
                    className={`p-3 ${
                      warning.severity === 'high'
                        ? 'bg-red-50 border-red-200'
                        : warning.severity === 'medium'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 mt-0.5 ${
                          warning.severity === 'high'
                            ? 'text-red-600'
                            : warning.severity === 'medium'
                            ? 'text-yellow-600'
                            : 'text-blue-600'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-sm">{warning.ingredient}</p>
                        <p className="text-xs text-muted-foreground">
                          {warning.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Sustainability Info */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-600" />
              Sustainability
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {displayProduct.sustainability.ecoFriendly && (
                <Card className="p-3 bg-green-50 border-green-200">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Eco-Friendly</span>
                  </div>
                </Card>
              )}
              {displayProduct.sustainability.sustainable && (
                <Card className="p-3 bg-green-50 border-green-200">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Sustainable</span>
                  </div>
                </Card>
              )}
              {displayProduct.sustainability.crueltyFree && (
                <Card className="p-3 bg-green-50 border-green-200">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Cruelty-Free</span>
                  </div>
                </Card>
              )}
              {displayProduct.sustainability.locallyOwned && (
                <Card className="p-3 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Locally Owned</span>
                  </div>
                </Card>
              )}
              {displayProduct.sustainability.smallBrand && (
                <Card className="p-3 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Small Brand</span>
                  </div>
                </Card>
              )}
            </div>
            {displayProduct.sustainability.explanation && (
              <Card className="p-4 mt-3 bg-green-50 border-green-200">
                <p className="text-sm text-muted-foreground">
                  {displayProduct.sustainability.explanation}
                </p>
              </Card>
            )}
          </div>

          <Separator />

          {/* Google Reviews */}
          {displayProduct.reviews && displayProduct.reviews.reviews && displayProduct.reviews.reviews.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Customer Reviews</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {displayProduct.reviews.reviews.map((review, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{review.author}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{review.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.text}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* External Link */}
          {displayProduct.url && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(displayProduct.url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Product Details
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

