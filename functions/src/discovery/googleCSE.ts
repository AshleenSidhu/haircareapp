/**
 * Google Custom Search Engine (CSE) Product Discovery
 * Discovers product pages from Sephora and Ulta using Google Custom Search
 * Enqueues valid URLs to staged_product queue after robots.txt validation
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import axios from 'axios';
import { cache } from '../utils/cache';

// Initialize Firebase Admin if not already initialized
try {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (error: any) {
  if (error.code !== 'app/duplicate-app') {
    throw error;
  }
}

const db = admin.firestore();

// Google Custom Search API endpoint
const GOOGLE_CSE_API = 'https://www.googleapis.com/customsearch/v1';

// Product page URL patterns for filtering
const PRODUCT_URL_PATTERNS = {
  sephora: [
    /sephora\.com\/product\//i,
    /sephora\.com\/p\//i,
    /sephora\.com\/.*-P\d+/i,
  ],
  ulta: [
    /ulta\.com\/product\//i,
    /ulta\.com\/p\//i,
    /ulta\.com\/.*\/prod\d+/i,
  ],
};

// Robots.txt cache (24 hours)
const robotsCache = new Map<string, { rules: any; expires: number }>();

/**
 * Check robots.txt for a given URL
 */
async function checkRobotsTxt(url: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const urlObj = new URL(url);
    const domain = `${urlObj.protocol}//${urlObj.host}`;
    const path = urlObj.pathname;

    // Check cache
    const cached = robotsCache.get(domain);
    if (cached && cached.expires > Date.now()) {
      return checkPathAgainstRules(path, cached.rules);
    }

    // Fetch robots.txt
    const robotsUrl = `${domain}/robots.txt`;
    console.log(`[GoogleCSE] Fetching robots.txt from ${robotsUrl}`);

    try {
      const response = await axios.get(robotsUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': 'HairCareApp/1.0 (Product Discovery Bot)',
        },
      });

      const rules = parseRobotsTxt(response.data);
      robotsCache.set(domain, {
        rules,
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });

      return checkPathAgainstRules(path, rules);
    } catch (error: any) {
      // If robots.txt doesn't exist or is inaccessible, assume allowed
      if (error.response?.status === 404) {
        console.log(`[GoogleCSE] No robots.txt found for ${domain}, assuming allowed`);
        return { allowed: true, reason: 'No robots.txt found' };
      }
      throw error;
    }
  } catch (error: any) {
    console.error(`[GoogleCSE] Error checking robots.txt for ${url}:`, error.message);
    // On error, assume disallowed for safety
    return { allowed: false, reason: `Error: ${error.message}` };
  }
}

/**
 * Parse robots.txt content
 */
function parseRobotsTxt(content: string): any {
  const rules: { [key: string]: Array<{ allow: boolean; path: string }> } = {};
  let currentUserAgent = '*';

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([^:]+):\s*(.+)$/i);
    if (!match) continue;

    const [, key, value] = match;
    const lowerKey = key.toLowerCase().trim();

    if (lowerKey === 'user-agent') {
      currentUserAgent = value.trim();
      if (!rules[currentUserAgent]) {
        rules[currentUserAgent] = [];
      }
    } else if (lowerKey === 'allow' || lowerKey === 'disallow') {
      if (!rules[currentUserAgent]) {
        rules[currentUserAgent] = [];
      }
      rules[currentUserAgent].push({
        allow: lowerKey === 'allow',
        path: value.trim(),
      });
    }
  }

  return rules;
}

/**
 * Check if a path is allowed by robots.txt rules
 */
function checkPathAgainstRules(path: string, rules: any): { allowed: boolean; reason?: string } {
  // Check for specific user-agent rules first, then wildcard
  const userAgents = ['HairCareApp', '*'];
  
  for (const userAgent of userAgents) {
    const agentRules = rules[userAgent] || [];
    if (agentRules.length === 0) continue;

    // Sort rules by specificity (longer paths first)
    const sortedRules = agentRules.sort((a: any, b: any) => b.path.length - a.path.length);

    for (const rule of sortedRules) {
      const pattern = rule.path === '' ? '.*' : rule.path.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}`);
      
      if (regex.test(path)) {
        return {
          allowed: rule.allow,
          reason: rule.allow ? 'Allowed by robots.txt' : 'Disallowed by robots.txt',
        };
      }
    }
  }

  // Default: allow if no rules match
  return { allowed: true, reason: 'No matching robots.txt rule' };
}

/**
 * Check if URL matches product page pattern
 */
function isProductPage(url: string, domain: string): boolean {
  const patterns = PRODUCT_URL_PATTERNS[domain as keyof typeof PRODUCT_URL_PATTERNS];
  if (!patterns) return false;

  return patterns.some((pattern) => pattern.test(url));
}

/**
 * Extract domain from URL
 */
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Search Google Custom Search Engine for product pages
 */
async function searchGoogleCSE(
  query: string,
  apiKey: string,
  cseId: string,
  startIndex: number = 1
): Promise<any> {
  const cacheKey = `google_cse_${query}_${startIndex}`;
  
  // Check cache (24 hours)
  const cached = cache.get<any>(cacheKey);
  if (cached) {
    console.log(`[GoogleCSE] Cache hit for query: ${query}`);
    return cached;
  }

  // Rate limit: wait 100ms between requests
  await new Promise((resolve) => setTimeout(resolve, 100));

  const params = {
    key: apiKey,
    cx: cseId,
    q: query,
    start: startIndex,
    num: 10, // Max results per page
  };

  console.log(`[GoogleCSE] Searching: ${query} (start: ${startIndex})`);

  try {
    const response = await axios.get(GOOGLE_CSE_API, { params, timeout: 10000 });
    
    // Cache for 24 hours
    if (response.data) {
      cache.set(cacheKey, response.data, 24 * 60 * 60);
    }

    return response.data;
  } catch (error: any) {
    console.error(`[GoogleCSE] Search error:`, error.message);
    if (error.response?.status === 429) {
      throw new Error('Google CSE API rate limit exceeded. Please wait before retrying.');
    }
    throw error;
  }
}

/**
 * Main function: Discover products using Google CSE
 */
export const discoverProductsWithGoogleCSE = onCall(
  {
    enforceAppCheck: false,
    region: 'northamerica-northeast1',
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async (request) => {
    console.log('[GoogleCSE] Function called');

    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Get API credentials from environment or request data
    // Priority: env vars > Firebase config > request data
    const apiKey = 
      process.env.GOOGLE_API_KEY || 
      functions.config().google?.api_key ||
      request.data?.apiKey;
    
    const cseId = 
      process.env.GOOGLE_CSE_ID || 
      functions.config().google?.cse_id ||
      request.data?.cseId;

    if (!apiKey || !cseId) {
      throw new HttpsError(
        'invalid-argument',
        'GOOGLE_API_KEY and GOOGLE_CSE_ID are required. Set via environment variables or function config.'
      );
    }

    try {
      const maxResults = request.data?.maxResults || 50;
      const domains = request.data?.domains || ['sephora.com', 'ulta.com'];

      const enqueued: any[] = [];
      const skipped: any[] = [];
      const errors: any[] = [];

      // Build search queries
      const queries: string[] = [];
      
      // Site-specific queries
      for (const domain of domains) {
        queries.push(`site:${domain} "ingredients" "product"`);
        queries.push(`site:${domain} "hair care" "ingredients"`);
        queries.push(`site:${domain} "shampoo" "conditioner"`);
      }

      // Brand-specific queries (common hair care brands)
      const brands = ['Olaplex', 'Redken', 'Moroccanoil', 'Living Proof', 'Ouai'];
      for (const brand of brands) {
        for (const domain of domains) {
          queries.push(`site:${domain} "${brand}" "ingredients"`);
        }
      }

      console.log(`[GoogleCSE] Processing ${queries.length} search queries`);

      // Process each query
      for (const query of queries) {
        if (enqueued.length >= maxResults) break;

        try {
          let startIndex = 1;
          let hasMore = true;

          while (hasMore && enqueued.length < maxResults) {
            const searchResults = await searchGoogleCSE(query, apiKey, cseId, startIndex);

            if (!searchResults.items || searchResults.items.length === 0) {
              hasMore = false;
              break;
            }

            // Process each search result
            for (const item of searchResults.items) {
              if (enqueued.length >= maxResults) break;

              const url = item.link;
              const domain = getDomain(url);

              // Check if it's a product page
              if (!isProductPage(url, domain)) {
                skipped.push({
                  url,
                  reason: 'Not a product page URL pattern',
                  snippet: item.snippet,
                });
                continue;
              }

              // Check robots.txt
              const robotsCheck = await checkRobotsTxt(url);
              if (!robotsCheck.allowed) {
                skipped.push({
                  url,
                  reason: robotsCheck.reason || 'Disallowed by robots.txt',
                  snippet: item.snippet,
                });
                continue;
              }

              // Check if already in queue
              const existing = await db
                .collection('staged_products')
                .where('url', '==', url)
                .limit(1)
                .get();

              if (!existing.empty) {
                skipped.push({
                  url,
                  reason: 'Already in queue',
                  snippet: item.snippet,
                });
                continue;
              }

              // Enqueue to staged_products
              const stagedProduct = {
                url,
                source_domain: domain,
                discovered_by: 'google_cse',
                discovered_at: admin.firestore.FieldValue.serverTimestamp(),
                raw_search_snippet: item.snippet,
                title: item.title,
                confidence_score: calculateConfidenceScore(item),
                status: 'pending',
                query_used: query,
              };

              await db.collection('staged_products').add(stagedProduct);
              enqueued.push(stagedProduct);

              console.log(`[GoogleCSE] Enqueued: ${url}`);
            }

            // Check if there are more results
            const totalResults = parseInt(searchResults.searchInformation?.totalResults || '0');
            const currentResults = startIndex + searchResults.items.length - 1;
            hasMore = currentResults < totalResults && currentResults < 100; // Google CSE max 100 results
            startIndex += 10;
          }
        } catch (error: any) {
          console.error(`[GoogleCSE] Error processing query "${query}":`, error.message);
          errors.push({
            query,
            error: error.message,
          });
        }
      }

      // Generate report
      const report = {
        summary: {
          total_queries: queries.length,
          new_urls_enqueued: enqueued.length,
          skipped: skipped.length,
          errors: errors.length,
          domains_checked: domains,
        },
        enqueued: enqueued.slice(0, 10), // Sample of 10
        skipped_samples: skipped.slice(0, 5),
        errors: errors.slice(0, 5),
      };

      console.log(`[GoogleCSE] Discovery complete: ${enqueued.length} enqueued, ${skipped.length} skipped`);

      return report;
    } catch (error: any) {
      console.error('[GoogleCSE] Fatal error:', error);
      throw new HttpsError('internal', `Discovery failed: ${error.message}`);
    }
  }
);

/**
 * Calculate confidence score based on search result metadata
 */
function calculateConfidenceScore(item: any): number {
  let score = 0.5; // Base score

  // Boost if snippet contains "ingredients"
  if (item.snippet?.toLowerCase().includes('ingredient')) {
    score += 0.2;
  }

  // Boost if title looks like a product name
  if (item.title && item.title.length > 10 && item.title.length < 100) {
    score += 0.1;
  }

  // Boost if URL contains product identifiers
  if (item.link && (/\d+/.test(item.link) || /product|p\/|prod/i.test(item.link))) {
    score += 0.2;
  }

  return Math.min(1.0, score);
}

