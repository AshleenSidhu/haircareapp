/**
 * Placeholder Images API
 * GET /api/placeholders/haircare (or /getHaircarePlaceholder depending on routing configuration)
 * Get Unsplash placeholder image for haircare products
 * 
 * Note: Firebase Functions v2 routes by function name.
 * To use /api/placeholders/haircare, configure Firebase Hosting rewrites.
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions';
import fetch from 'node-fetch';

/**
 * GET /api/placeholders/haircare
 * Proxies Unsplash API to get placeholder images
 * Requires UNSPLASH_KEY environment variable
 */
export const getHaircarePlaceholder = onRequest(
  {
    cors: true,
    region: 'northamerica-northeast1',
  },
  async (req, res) => {
    try {
      const unsplashKey = process.env.UNSPLASH_KEY || functions.config().unsplash?.key;

      if (!unsplashKey) {
        // Return a default placeholder URL if Unsplash key is not configured
        res.json({
          url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop&q=80',
          source: 'default',
        });
        return;
      }

      // Fetch a random haircare-related image from Unsplash
      const unsplashUrl = `https://api.unsplash.com/photos/random?query=haircare&orientation=square&client_id=${unsplashKey}`;

      const response = await fetch(unsplashUrl);
      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.statusText}`);
      }

      const data = await response.json();
      const imageUrl = data.urls?.regular || data.urls?.small || '';

      if (!imageUrl) {
        throw new Error('No image URL in Unsplash response');
      }

      res.json({
        url: imageUrl,
        source: 'unsplash',
        attribution: {
          photographer: data.user?.name,
          photographer_url: data.user?.links?.html,
          unsplash_url: data.links?.html,
        },
      });
    } catch (error: any) {
      console.error('[getHaircarePlaceholder] Error:', error);
      // Fallback to default placeholder
      res.json({
        url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop&q=80',
        source: 'default',
        error: error.message,
      });
    }
  }
);

