/**
 * Get Product Details - Callable Function
 * Fetches enriched product data from Firestore
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const getProductDetails = onCall(
  {
    enforceAppCheck: false,
    region: 'northamerica-northeast1',
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to get product details'
      );
    }

    const { productId } = request.data || {};

    if (!productId) {
      throw new HttpsError(
        'invalid-argument',
        'productId is required'
      );
    }

    try {
      console.log(`[getProductDetails] Fetching product ${productId}`);

      // Try to find product by product_id or barcode
      let productDoc = await db.collection('products').doc(productId).get();

      // If not found by ID, try searching by barcode
      if (!productDoc.exists) {
        const barcodeQuery = await db
          .collection('products')
          .where('barcode', '==', productId)
          .limit(1)
          .get();

        if (!barcodeQuery.empty) {
          productDoc = barcodeQuery.docs[0];
        }
      }

      if (!productDoc.exists) {
        throw new HttpsError(
          'not-found',
          `Product with ID ${productId} not found`
        );
      }

      const productData = productDoc.data();
      if (!productData) {
        throw new HttpsError(
          'not-found',
          `Product data not found for ID ${productId}`
        );
      }

      // Return product data
      return {
        product: {
          id: productDoc.id,
          ...productData,
        },
      };
    } catch (error: any) {
      console.error('[getProductDetails] Error:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        'internal',
        `Failed to fetch product details: ${error.message}`
      );
    }
  }
);

