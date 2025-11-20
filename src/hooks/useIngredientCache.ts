/**
 * Custom hook for caching ingredient science data
 * Debounces requests and caches ingredient details for the session
 */

import { useState, useCallback, useRef } from 'react';
import { ApiIngredient } from '../lib/types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com';

// In-memory cache for ingredient data (session cache)
const ingredientCache = new Map<string, ApiIngredient | null>();
const pendingRequests = new Map<string, Promise<ApiIngredient | null>>();

// Debounce helper
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function useIngredientCache() {
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof debounce> | null>(null);

  const fetchIngredient = useCallback(
    async (normalizedInci: string): Promise<ApiIngredient | null> => {
      if (!normalizedInci || normalizedInci.trim() === '') {
        return null;
      }

      const key = normalizedInci.toLowerCase().trim();

      // Check cache first
      if (ingredientCache.has(key)) {
        return ingredientCache.get(key) || null;
      }

      // Check if request is already pending
      if (pendingRequests.has(key)) {
        return pendingRequests.get(key)!;
      }

      // Create new request
      const request = (async () => {
        try {
          setLoading(true);
          const encodedInci = encodeURIComponent(key);
          const response = await fetch(`${API_BASE}/api/ingredients/${encodedInci}`);

          if (response.status === 404) {
            ingredientCache.set(key, null);
            return null;
          }

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data: ApiIngredient = await response.json();
          ingredientCache.set(key, data);
          return data;
        } catch (error) {
          console.error(`[useIngredientCache] Error fetching ingredient ${key}:`, error);
          ingredientCache.set(key, null);
          return null;
        } finally {
          pendingRequests.delete(key);
          setLoading(false);
        }
      })();

      pendingRequests.set(key, request);
      return request;
    },
    []
  );

  // Debounced version for use in input fields
  const fetchIngredientDebounced = useCallback(
    debounce((normalizedInci: string, callback: (data: ApiIngredient | null) => void) => {
      fetchIngredient(normalizedInci).then(callback);
    }, 300),
    [fetchIngredient]
  );

  const clearCache = useCallback(() => {
    ingredientCache.clear();
    pendingRequests.clear();
  }, []);

  return {
    fetchIngredient,
    fetchIngredientDebounced,
    clearCache,
    loading,
  };
}

// Standalone function for fetching ingredient (for use outside components)
export async function fetchIngredient(
  normalizedInci: string
): Promise<ApiIngredient | null> {
  if (!normalizedInci || normalizedInci.trim() === '') {
    return null;
  }

  const key = normalizedInci.toLowerCase().trim();

  // Check cache first
  if (ingredientCache.has(key)) {
    return ingredientCache.get(key) || null;
  }

  // Check if request is already pending
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  // Create new request
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com';
  const request = (async () => {
    try {
      const encodedInci = encodeURIComponent(key);
      const response = await fetch(`${API_BASE}/api/ingredients/${encodedInci}`);

      if (response.status === 404) {
        ingredientCache.set(key, null);
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiIngredient = await response.json();
      ingredientCache.set(key, data);
      return data;
    } catch (error) {
      console.error(`[fetchIngredient] Error fetching ingredient ${key}:`, error);
      ingredientCache.set(key, null);
      return null;
    } finally {
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, request);
  return request;
}

