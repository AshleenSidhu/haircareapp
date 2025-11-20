/**
 * Image Storage Functions
 * Downloads external images and stores them in Firebase Storage
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

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
const bucket = admin.storage().bucket();

/**
 * Download and store image from external URL to Firebase Storage
 * Updates Firestore with storage_url and stored_at timestamp
 */
export const downloadAndStoreImage = onCall(
  {
    enforceAppCheck: false,
    region: 'northamerica-northeast1',
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (request) => {
    console.log('[downloadAndStoreImage] Function called');
    console.log('[downloadAndStoreImage] Request data:', request.data);
    console.log('[downloadAndStoreImage] Auth:', request.auth ? `User ${request.auth.uid}` : 'No auth');

    // Verify authentication
    if (!request.auth) {
      console.error('[downloadAndStoreImage] Unauthenticated request');
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { productId, imageUrl, imageType = 'front' } = request.data;

    // Validate required parameters
    if (!productId || !imageUrl) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required parameters: productId and imageUrl are required'
      );
    }

    // Validate imageUrl is a valid URL
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch (error) {
      throw new HttpsError('invalid-argument', 'Invalid imageUrl: must be a valid URL');
    }

    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new HttpsError('invalid-argument', 'Invalid imageUrl: must use http or https protocol');
    }

    try {
      console.log(`[downloadAndStoreImage] Fetching image from ${imageUrl}`);

      // Fetch image with timeout
      const response = await fetch(imageUrl, {
        timeout: 20000, // 20 second timeout
        headers: {
          'User-Agent': 'HairCareApp/1.0 (Firebase Functions)',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      // Validate content type
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}. Expected image/*`);
      }

      // Get image buffer
      const buffer = await response.buffer();
      const sizeInMB = buffer.length / (1024 * 1024);

      // Limit image size to 10MB
      if (sizeInMB > 10) {
        throw new Error(`Image too large: ${sizeInMB.toFixed(2)}MB. Maximum size is 10MB`);
      }

      console.log(`[downloadAndStoreImage] Image fetched: ${sizeInMB.toFixed(2)}MB, type: ${contentType}`);

      // Determine file extension from content type
      const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
      const filename = `products/${productId}/${imageType}.${ext}`;

      console.log(`[downloadAndStoreImage] Uploading to Storage: ${filename}`);

      // Upload to Firebase Storage
      const file = bucket.file(filename);
      await file.save(buffer, {
        contentType,
        metadata: {
          metadata: {
            productId,
            imageType,
            originalUrl: imageUrl,
            uploadedAt: new Date().toISOString(),
            uploadedBy: request.auth.uid,
          },
        },
      });

      // Make file publicly accessible (or create signed URL)
      // Option 1: Make public (simpler, but less secure)
      // await file.makePublic();

      // Option 2: Create signed URL (more secure, expires in future)
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2030', // Expires in ~6 years
      });

      console.log(`[downloadAndStoreImage] Image uploaded successfully. URL: ${signedUrl}`);

      // Update Firestore with storage information
      const updateData = {
        images_stored: {
          storage_url: signedUrl,
          stored_at: admin.firestore.FieldValue.serverTimestamp(),
          image_type: imageType,
          original_url: imageUrl,
        },
      };

      await db.collection('products').doc(productId).set(updateData, { merge: true });

      console.log(`[downloadAndStoreImage] Firestore updated for product ${productId}`);

      return {
        success: true,
        storage_url: signedUrl,
        productId,
        imageType,
        size: buffer.length,
        contentType,
      };
    } catch (error: any) {
      console.error('[downloadAndStoreImage] Error:', error);
      console.error('[downloadAndStoreImage] Error stack:', error.stack);

      // Return user-friendly error
      throw new HttpsError(
        'internal',
        `Failed to download and store image: ${error.message}`
      );
    }
  }
);

