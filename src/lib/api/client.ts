/**
 * API Client
 * Centralized API client for making requests to the backend
 */

import { fetchWithCache } from '../../hooks/useFetchWithCache';
import { ApiProduct, ProductsResponse, ApiIngredient } from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com';

/**
 * Fetch products with pagination
 */
export async function fetchProducts(params?: {
  category?: string;
  limit?: number;
  page?: number;
}): Promise<ProductsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.append('category', params.category);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.page) queryParams.append('page', params.page.toString());

  const url = `${API_BASE}/api/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return fetchWithCache<ProductsResponse>(url);
}

/**
 * Fetch a single product by ID
 */
export async function fetchProduct(productId: string): Promise<ApiProduct> {
  const url = `${API_BASE}/api/products/${encodeURIComponent(productId)}`;
  const product = await fetchWithCache<ApiProduct>(url);
  return product;
}

/**
 * Fetch ingredient science data
 */
export async function fetchIngredient(normalizedInci: string): Promise<ApiIngredient | null> {
  try {
    const url = `${API_BASE}/api/ingredients/${encodeURIComponent(normalizedInci)}`;
    const ingredient = await fetchWithCache<ApiIngredient>(url);
    return ingredient;
  } catch (error: any) {
    if (error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch placeholder image
 */
export async function fetchPlaceholder(): Promise<{ url: string; source: string }> {
  const url = `${API_BASE}/api/placeholders/haircare`;
  return fetchWithCache<{ url: string; source: string }>(url);
}

