/**
 * Google Image Search Utility
 * Fetches product images using Google Custom Search API
 * Falls back to scraping if API is not available
 */

import axios from 'axios';

// Google Custom Search API configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
const GOOGLE_CUSTOM_SEARCH_URL = 'https://www.googleapis.com/customsearch/v1';

/**
 * Search for product image using Google Custom Search API
 */
export async function searchProductImage(
  productName: string,
  brand: string
): Promise<string | null> {
  try {
    // If API keys are not configured, try scraping as fallback
    if (!GOOGLE_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
      console.log('[GoogleImageSearch] API keys not configured, trying scraping fallback');
      return await searchProductImageScraping(productName, brand);
    }

    const searchQuery = `${brand} ${productName} hair care product`;
    console.log(`[GoogleImageSearch] Searching for: ${searchQuery}`);

    const response = await axios.get(GOOGLE_CUSTOM_SEARCH_URL, {
      params: {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_SEARCH_ENGINE_ID,
        q: searchQuery,
        searchType: 'image',
        num: 1, // Get first result
        safe: 'active',
        imgSize: 'large',
        imgType: 'photo',
      },
      timeout: 10000,
    });

    if (response.data?.items && response.data.items.length > 0) {
      const imageUrl = response.data.items[0].link;
      console.log(`[GoogleImageSearch] Found image: ${imageUrl}`);
      return imageUrl;
    }

    return null;
  } catch (error: any) {
    console.error('[GoogleImageSearch] Error searching:', error.message);
    // Fallback to scraping
    return await searchProductImageScraping(productName, brand);
  }
}

/**
 * Fallback: Scrape Google Images search results
 * Note: This is less reliable and may be blocked by Google
 */
async function searchProductImageScraping(
  productName: string,
  brand: string
): Promise<string | null> {
  try {
    const searchQuery = encodeURIComponent(`${brand} ${productName} hair product`);
    const searchUrl = `https://www.google.com/search?q=${searchQuery}&tbm=isch&tbs=isz:l`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000,
    });

    // Try to extract image URL from HTML (basic regex - may need improvement)
    const imageMatch = response.data.match(/https?:\/\/[^"'\s]+\.(jpg|jpeg|png|webp)/i);
    if (imageMatch && imageMatch[0]) {
      return imageMatch[0];
    }

    return null;
  } catch (error: any) {
    console.error('[GoogleImageSearch] Scraping failed:', error.message);
    return null;
  }
}

