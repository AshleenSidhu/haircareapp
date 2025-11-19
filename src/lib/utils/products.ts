/**
 * Product Utilities
 * Helper functions for product filtering, querying, and management
 */

import { Product, ProductFilters, LikedProduct } from '../types/products';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  getDoc,
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';

/**
 * Filter products based on user criteria
 * This is a client-side filter - for large datasets, use Cloud Functions
 */
export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  return products.filter(product => {
    // Filter by allergens (avoid flagged ingredients)
    if (filters.allergens && filters.allergens.length > 0) {
      const hasAllergen = product.safety.allergenWarnings.some(warning =>
        filters.allergens!.some(allergen =>
          warning.ingredient.toLowerCase().includes(allergen.toLowerCase())
        )
      );
      if (hasAllergen) return false;
    }

    // Filter by include ingredients
    if (filters.includeIngredients && filters.includeIngredients.length > 0) {
      const hasAllIngredients = filters.includeIngredients.every(ingredient =>
        product.ingredients.some(ing =>
          ing.name.toLowerCase().includes(ingredient.toLowerCase())
        )
      );
      if (!hasAllIngredients) return false;
    }

    // Filter by exclude ingredients
    if (filters.excludeIngredients && filters.excludeIngredients.length > 0) {
      const hasExcludedIngredient = product.ingredients.some(ing =>
        filters.excludeIngredients!.some(excluded =>
          ing.name.toLowerCase().includes(excluded.toLowerCase())
        )
      );
      if (hasExcludedIngredient) return false;
    }

    // Filter by sustainability
    if (filters.sustainability) {
      const sust = filters.sustainability;
      if (sust.ecoFriendly && !product.sustainability.ecoFriendly) return false;
      if (sust.sustainable && !product.sustainability.sustainable) return false;
      if (sust.crueltyFree && !product.sustainability.crueltyFree) return false;
      if (sust.locallyOwned && !product.sustainability.locallyOwned) return false;
      if (sust.smallBrand && !product.sustainability.smallBrand) return false;
    }

    // Filter by minimum rating
    if (filters.minRating && product.reviews.averageRating < filters.minRating) {
      return false;
    }

    // Filter by max price
    if (filters.maxPrice && product.price && product.price > filters.maxPrice) {
      return false;
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      const hasAllTags = filters.tags.every(tag =>
        product.tags.some(productTag =>
          productTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
      if (!hasAllTags) return false;
    }

    return true;
  });
}

/**
 * Fetch products from Firestore with optional filters
 * For complex filtering, consider using Cloud Functions
 */
export async function fetchProducts(
  filters?: ProductFilters,
  limitCount: number = 200
): Promise<Product[]> {
  try {
    const productsRef = collection(db, 'products');
    
    // Try to query with orderBy, but handle case where index might not exist or permission issues
    let q;
    try {
      // First try with orderBy - this might fail if index doesn't exist
      q = query(productsRef, orderBy('createdAt', 'desc'), firestoreLimit(limitCount));
    } catch (error: any) {
      // If orderBy fails (no index or permission), just get products without ordering
      console.warn('Could not order by createdAt, fetching without order:', error);
      q = query(productsRef, firestoreLimit(limitCount));
    }

    // Note: Firestore has limitations on complex queries
    // For complex filters, we fetch and filter client-side or use Cloud Functions
    let querySnapshot;
    try {
      querySnapshot = await getDocs(q);
    } catch (error: any) {
      // If query fails due to permissions or index, try a simpler query
      if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
        console.warn('Query failed, trying simple fetch without orderBy:', error);
        try {
          // Try without orderBy and limit
          const simpleQuery = query(productsRef);
          querySnapshot = await getDocs(simpleQuery);
        } catch (simpleError: any) {
          console.error('Even simple query failed:', simpleError);
          // If still fails, return empty array
          return [];
        }
      } else {
        throw error;
      }
    }
    
    const products = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const product = {
        id: doc.id,
        title: data.title || data.name || 'Unknown Product',
        brand: data.brand || 'Unknown Brand',
        imageUrl: data.imageUrl || data.image || undefined,
        tags: data.tags || [],
        description: data.description,
        price: data.price,
        currency: data.currency || 'USD',
        upc: data.upc,
        ingredients: data.ingredients || [],
        sustainability: data.sustainability || {
          ecoFriendly: false,
          sustainable: false,
          crueltyFree: false,
          locallyOwned: false,
          smallBrand: false,
        },
        safety: data.safety || {
          overallScore: 50,
          allergenWarnings: [],
          flaggedIngredients: [],
        },
        reviews: data.reviews || {
          averageRating: 0,
          totalReviews: 0,
          sentimentScore: 0,
          reviews: [],
        },
        aiRecommendationExplanation: data.aiRecommendationExplanation,
        source: data.source || 'manual',
        sourceId: data.sourceId,
        url: data.url,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Product;
      
      // Debug: Log first product to check imageUrl
      if (products.length === 0) {
        console.log('[fetchProducts] First product:', product);
        console.log('[fetchProducts] First product imageUrl:', product.imageUrl);
      }
      
      return product;
    });

    // Apply client-side filtering if filters provided
    if (filters) {
      return filterProducts(products, filters);
    }

    return products;
  } catch (error: any) {
    console.error('Error fetching products:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Return empty array instead of throwing to prevent UI crashes
    if (error.code === 'failed-precondition') {
      console.warn('⚠️ Firestore index required. Please create index for products collection.');
    } else if (error.code === 'permission-denied') {
      console.error('❌ Permission denied! Firestore rules may not be deployed.');
      console.error('📋 To fix: Deploy Firestore rules using: firebase deploy --only firestore:rules');
      console.error('📋 Or update rules in Firebase Console → Firestore → Rules');
      console.error('📋 Rules should allow: allow read: if true; for products collection');
    }
    return [];
  }
}

/**
 * Fetch a single product by ID
 */
export async function fetchProductById(productId: string): Promise<Product | null> {
  try {
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists()) {
      return null;
    }

    return {
      id: productSnap.id,
      ...productSnap.data(),
    } as Product;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
}

/**
 * Like a product (add to user's liked products)
 */
export async function likeProduct(userId: string, product: Product): Promise<void> {
  try {
    const likedProductRef = doc(db, 'users', userId, 'likedProducts', product.id);
    await setDoc(likedProductRef, {
      userId,
      productId: product.id,
      product, // Store full product snapshot
      likedAt: new Date(),
    });
  } catch (error) {
    console.error('Error liking product:', error);
    throw error;
  }
}

/**
 * Unlike a product (remove from user's liked products)
 */
export async function unlikeProduct(userId: string, productId: string): Promise<void> {
  try {
    const likedProductRef = doc(db, 'users', userId, 'likedProducts', productId);
    await deleteDoc(likedProductRef);
  } catch (error) {
    console.error('Error unliking product:', error);
    throw error;
  }
}

/**
 * Check if a product is liked by user
 */
export async function isProductLiked(userId: string, productId: string): Promise<boolean> {
  try {
    const likedProductRef = doc(db, 'users', userId, 'likedProducts', productId);
    const likedProductSnap = await getDoc(likedProductRef);
    return likedProductSnap.exists();
  } catch (error) {
    console.error('Error checking if product is liked:', error);
    return false;
  }
}

  /**
   * Fetch all liked products for a user
   */
  export async function fetchLikedProducts(userId: string): Promise<LikedProduct[]> {
    try {
      const likedProductsRef = collection(db, 'users', userId, 'likedProducts');
      const q = query(likedProductsRef, orderBy('likedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || userId,
          productId: data.productId || doc.id,
          product: data.product || {},
          likedAt: data.likedAt?.toDate ? data.likedAt.toDate() : (data.likedAt || new Date()),
        } as LikedProduct;
      });
    } catch (error) {
      console.error('Error fetching liked products:', error);
      throw error;
    }
  }

