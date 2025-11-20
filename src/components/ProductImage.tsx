/**
 * ProductImage Component
 * Handles image loading with fallback chain:
 * 1. product.images_stored.storage_url (Firebase Storage)
 * 2. product.images.front (external URL)
 * 3. product.images.ingredients (external URL)
 * 4. /api/placeholders/haircare (backend proxy to Unsplash) - fetched dynamically
 * 5. /assets/img/product-placeholder.png (static local)
 */

import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface ProductImageProps {
  product: {
    images?: {
      front?: string;
      ingredients?: string;
    };
    images_stored?: {
      storage_url?: string | null;
      stored_at?: number | string | null;
      image_type?: string;
      original_url?: string;
    };
  };
  alt: string;
  className?: string;
  onError?: () => void;
}

export function ProductImage({ product, alt, className = '', onError }: ProductImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [triedFallbacks, setTriedFallbacks] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [placeholderUrl, setPlaceholderUrl] = useState<string | null>(null);
  const [loadingPlaceholder, setLoadingPlaceholder] = useState(false);

  // Build fallback chain (excluding placeholder API which is fetched separately)
  const fallbacks = [
    // Priority 1: Stored image in Firebase Storage (if available)
    product.images_stored?.storage_url || null,
    // Priority 2: External front image URL
    product.images?.front || null,
    // Priority 3: External ingredients image URL
    product.images?.ingredients || null,
  ].filter(Boolean) as string[];

  // Fetch placeholder from API when needed
  useEffect(() => {
    const fetchPlaceholder = async () => {
      if (loadingPlaceholder || placeholderUrl) return;
      
      setLoadingPlaceholder(true);
      try {
        // Try to get placeholder from backend API
        const apiBase = process.env.REACT_APP_BACKEND_BASE_URL || '';
        const response = await fetch(`${apiBase}/api/placeholders/haircare`);
        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            setPlaceholderUrl(data.url);
          }
        }
      } catch (error) {
        console.error('Failed to fetch placeholder:', error);
      } finally {
        setLoadingPlaceholder(false);
      }
    };

    // Fetch placeholder when we've exhausted direct image URLs
    if (triedFallbacks >= fallbacks.length && !placeholderUrl && !loadingPlaceholder) {
      fetchPlaceholder();
    }
  }, [triedFallbacks, fallbacks.length, placeholderUrl, loadingPlaceholder]);

  // Initialize with first fallback
  useEffect(() => {
    if (fallbacks.length > 0) {
      setCurrentSrc(fallbacks[0]);
      setTriedFallbacks(0);
      setHasError(false);
    } else {
      // No direct images, try placeholder API or static
      setCurrentSrc('/assets/img/product-placeholder.png');
    }
  }, [product.images?.front, product.images?.ingredients, product.images_stored?.storage_url]);

  // Update src when placeholder is loaded
  useEffect(() => {
    if (placeholderUrl && triedFallbacks >= fallbacks.length) {
      setCurrentSrc(placeholderUrl);
    }
  }, [placeholderUrl, triedFallbacks, fallbacks.length]);

  const handleError = () => {
    const nextIndex = triedFallbacks + 1;
    
    if (nextIndex < fallbacks.length) {
      // Try next fallback
      setTriedFallbacks(nextIndex);
      setCurrentSrc(fallbacks[nextIndex]);
    } else if (placeholderUrl) {
      // Try placeholder from API
      setTriedFallbacks(nextIndex);
      setCurrentSrc(placeholderUrl);
    } else if (nextIndex === fallbacks.length) {
      // All direct images failed, use static placeholder
      setCurrentSrc('/assets/img/product-placeholder.png');
      setTriedFallbacks(nextIndex);
    } else {
      // All fallbacks exhausted
      setHasError(true);
      if (onError) {
        onError();
      }
    }
  };

  if (hasError && triedFallbacks >= fallbacks.length + 1) {
    // Show placeholder UI when all fallbacks fail
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
}
