/**
 * Custom hook for fetching data with IndexedDB/localStorage caching
 * Caches responses for 24 hours with ETag support
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 24 hours)
  useIndexedDB?: boolean; // Use IndexedDB instead of localStorage (default: false)
}

interface FetchOptions extends RequestInit {
  skipCache?: boolean; // Skip cache and force fresh fetch
}

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Simple IndexedDB wrapper
class CacheDB {
  private dbName = 'haircare-cache';
  private storeName = 'api-cache';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async get(key: string): Promise<{ data: any; etag?: string; timestamp: number } | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  async set(key: string, value: { data: any; etag?: string; timestamp: number }): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

const cacheDB = new CacheDB();

// LocalStorage fallback
const localStorageCache = {
  get: (key: string): { data: any; etag?: string; timestamp: number } | null => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item);
    } catch {
      return null;
    }
  },
  set: (key: string, value: { data: any; etag?: string; timestamp: number }): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Storage quota exceeded, clear old entries
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        // Clear entries older than 7 days
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('api-cache-')) {
            const item = localStorageCache.get(key);
            if (item && item.timestamp < sevenDaysAgo) {
              localStorage.removeItem(key);
            }
          }
        }
        // Retry
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // Still failing, give up
        }
      }
    }
  },
  delete: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },
};

export function useFetchWithCache<T>(
  url: string | null,
  options: FetchOptions = {},
  cacheOptions: CacheOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isRefetchingRef = useRef(false);

  const { ttl = DEFAULT_TTL, useIndexedDB = false } = cacheOptions;
  const { skipCache: originalSkipCache = false, ...fetchOptions } = options;

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    const cacheKey = `api-cache-${url}`;
    const cache = useIndexedDB ? cacheDB : localStorageCache;
    const shouldSkipCache = originalSkipCache || isRefetchingRef.current;

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check cache first (unless skipCache is true or refetching)
        if (!shouldSkipCache) {
          const cached = await cache.get(cacheKey);
          if (cached) {
            const age = Date.now() - cached.timestamp;
            if (age < ttl) {
              // Cache is still valid
              if (!cancelled) {
                setData(cached.data);
                setLoading(false);
              }

              // Check for updates using ETag
              if (cached.etag) {
                const headers: HeadersInit = {
                  'If-None-Match': cached.etag,
                  ...fetchOptions.headers,
                };

                try {
                  const response = await fetch(url, {
                    ...fetchOptions,
                    headers,
                  });

                  if (response.status === 304) {
                    // Not modified, use cached data
                    return;
                  }

                  // Data has changed, update cache
                  const etag = response.headers.get('ETag');
                  const newData = await response.json();
                  await cache.set(cacheKey, {
                    data: newData,
                    etag: etag || undefined,
                    timestamp: Date.now(),
                  });

                  if (!cancelled) {
                    setData(newData);
                  }
                } catch (e) {
                  // ETag check failed, but we have cached data, so continue
                  console.warn('ETag check failed, using cached data:', e);
                }
              }

              return;
            } else {
              // Cache expired, delete it
              await cache.delete(cacheKey);
            }
          }
        }

        // Fetch fresh data
        abortControllerRef.current = new AbortController();
        const response = await fetch(url, {
          ...fetchOptions,
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        const etag = response.headers.get('ETag');

        // Cache the response
        await cache.set(cacheKey, {
          data: json,
          etag: etag || undefined,
          timestamp: Date.now(),
        });

        if (!cancelled) {
          setData(json);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return; // Request was cancelled
        }
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, originalSkipCache, ttl, useIndexedDB, refetchTrigger]);

  const refetch = useCallback(() => {
    isRefetchingRef.current = true;
    setRefetchTrigger((prev) => prev + 1);
    // Reset refetch flag after a short delay
    setTimeout(() => {
      isRefetchingRef.current = false;
    }, 100);
  }, []);

  return { data, loading, error, refetch };
}

// Standalone fetch function with cache
export async function fetchWithCache<T>(
  url: string,
  options: FetchOptions = {},
  cacheOptions: CacheOptions = {}
): Promise<T> {
  const { ttl = DEFAULT_TTL, useIndexedDB = false } = cacheOptions;
  const { skipCache = false, ...fetchOptions } = options;

  const cacheKey = `api-cache-${url}`;
  const cache = useIndexedDB ? cacheDB : localStorageCache;

  // Check cache first
  if (!skipCache) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < ttl) {
        return cached.data;
      }
    }
  }

  // Fetch fresh data
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const json = await response.json();
  const etag = response.headers.get('ETag');

  // Cache the response
  await cache.set(cacheKey, {
    data: json,
    etag: etag || undefined,
    timestamp: Date.now(),
  });

  return json;
}

