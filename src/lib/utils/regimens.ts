/**
 * Regimen Utilities
 * Functions for fetching, creating, and managing regimens
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../firebase';
import { Regimen, Comment, RegimenLike, RegimenSave, Follow, Report, RegimenFilters, Notification } from '../types/regimens';

/**
 * Fetch public regimens with filters and sorting
 */
export async function fetchRegimens(
  filters: RegimenFilters = {},
  pageSize: number = 20
): Promise<Regimen[]> {
  try {
    const constraints: QueryConstraint[] = [];
    
    // Base query: only public, non-draft regimens
    constraints.push(where('isPublic', '==', true));
    constraints.push(where('isDraft', '==', false));
    
    // Apply filters
    if (filters.tags && filters.tags.length > 0) {
      constraints.push(where('tags', 'array-contains-any', filters.tags));
    }
    
    if (filters.authorId) {
      constraints.push(where('authorId', '==', filters.authorId));
    }
    
    if (filters.hairType) {
      constraints.push(where('hairType', '==', filters.hairType));
    }
    
    if (filters.porosity) {
      constraints.push(where('porosity', '==', filters.porosity));
    }
    
    // Apply sorting
    switch (filters.sortBy) {
      case 'trending':
        constraints.push(orderBy('engagementScore', 'desc'));
        break;
      case 'top':
        constraints.push(orderBy('likesCount', 'desc'));
        break;
      case 'new':
      default:
        constraints.push(orderBy('publishedAt', 'desc'));
        break;
    }
    
    constraints.push(limit(pageSize));
    
    const q = query(collection(db, 'regimens'), ...constraints);
    const snapshot = await getDocs(q);
    
    let regimens = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
      publishedAt: doc.data().publishedAt?.toDate?.() || doc.data().publishedAt,
    })) as Regimen[];
    
    // Client-side search if provided
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      regimens = regimens.filter(r => 
        r.title.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower) ||
        r.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        r.authorName.toLowerCase().includes(searchLower)
      );
    }
    
    return regimens;
  } catch (error) {
    console.error('Error fetching regimens:', error);
    throw error;
  }
}

/**
 * Fetch a single regimen by ID
 */
export async function fetchRegimenById(regimenId: string): Promise<Regimen | null> {
  try {
    const docRef = doc(db, 'regimens', regimenId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      publishedAt: data.publishedAt?.toDate?.() || data.publishedAt,
    } as Regimen;
  } catch (error) {
    console.error('Error fetching regimen:', error);
    throw error;
  }
}

/**
 * Like a regimen
 */
export async function likeRegimen(regimenId: string, userId: string): Promise<void> {
  try {
    const regimenRef = doc(db, 'regimens', regimenId);
    const likeRef = doc(db, 'regimenLikes', `${regimenId}_${userId}`);
    
    // Check if already liked
    const likeDoc = await getDoc(likeRef);
    if (likeDoc.exists()) {
      // Unlike
      await deleteDoc(likeRef);
      await updateDoc(regimenRef, {
        likesCount: increment(-1)
      });
    } else {
      // Like
      await addDoc(collection(db, 'regimenLikes'), {
        regimenId,
        userId,
        createdAt: serverTimestamp(),
      });
      await updateDoc(regimenRef, {
        likesCount: increment(1)
      });
      
      // Create notification for author
      const regimen = await fetchRegimenById(regimenId);
      if (regimen && regimen.authorId !== userId) {
        await createNotification(regimen.authorId, {
          type: 'like',
          relatedRegimenId: regimenId,
          relatedUserId: userId,
          message: `${userId} liked your regimen "${regimen.title}"`,
        });
      }
    }
  } catch (error) {
    console.error('Error liking regimen:', error);
    throw error;
  }
}

/**
 * Check if user has liked a regimen
 */
export async function isRegimenLiked(regimenId: string, userId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'regimenLikes'),
      where('regimenId', '==', regimenId),
      where('userId', '==', userId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking like status:', error);
    return false;
  }
}

/**
 * Save a regimen
 */
export async function saveRegimen(
  regimenId: string, 
  userId: string, 
  savedToRegimenId?: string
): Promise<void> {
  try {
    const regimenRef = doc(db, 'regimens', regimenId);
    const saveRef = doc(db, 'regimenSaves', `${regimenId}_${userId}`);
    
    // Check if already saved
    const saveDoc = await getDoc(saveRef);
    if (saveDoc.exists()) {
      // Unsave
      await deleteDoc(saveRef);
      await updateDoc(regimenRef, {
        savesCount: increment(-1)
      });
    } else {
      // Save
      await addDoc(collection(db, 'regimenSaves'), {
        regimenId,
        userId,
        savedToRegimenId,
        createdAt: serverTimestamp(),
      });
      await updateDoc(regimenRef, {
        savesCount: increment(1)
      });
      
      // Create notification for author
      const regimen = await fetchRegimenById(regimenId);
      if (regimen && regimen.authorId !== userId) {
        await createNotification(regimen.authorId, {
          type: 'save',
          relatedRegimenId: regimenId,
          relatedUserId: userId,
          message: `${userId} saved your regimen "${regimen.title}"`,
        });
      }
    }
  } catch (error) {
    console.error('Error saving regimen:', error);
    throw error;
  }
}

/**
 * Check if user has saved a regimen
 */
export async function isRegimenSaved(regimenId: string, userId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'regimenSaves'),
      where('regimenId', '==', regimenId),
      where('userId', '==', userId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking save status:', error);
    return false;
  }
}

/**
 * Follow a user
 */
export async function followUser(followerId: string, followingId: string): Promise<void> {
  try {
    const followRef = doc(db, 'follows', `${followerId}_${followingId}`);
    
    // Check if already following
    const followDoc = await getDoc(followRef);
    if (followDoc.exists()) {
      // Unfollow
      await deleteDoc(followRef);
    } else {
      // Follow
      await addDoc(collection(db, 'follows'), {
        followerId,
        followingId,
        createdAt: serverTimestamp(),
      });
      
      // Create notification
      await createNotification(followingId, {
        type: 'follow',
        relatedUserId: followerId,
        message: `${followerId} started following you`,
      });
    }
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
}

/**
 * Check if user is following another user
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'follows'),
      where('followerId', '==', followerId),
      where('followingId', '==', followingId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

/**
 * Add a comment to a regimen
 */
export async function addComment(
  regimenId: string,
  userId: string,
  userName: string,
  content: string,
  parentCommentId?: string
): Promise<string> {
  try {
    const commentData = {
      regimenId,
      authorId: userId,
      authorName: userName,
      content,
      parentCommentId,
      likesCount: 0,
      createdAt: serverTimestamp(),
      isEdited: false,
      isDeleted: false,
    };
    
    const commentRef = await addDoc(collection(db, 'comments'), commentData);
    
    // Update regimen comment count
    const regimenRef = doc(db, 'regimens', regimenId);
    await updateDoc(regimenRef, {
      commentsCount: increment(1)
    });
    
    // Create notification for author
    const regimen = await fetchRegimenById(regimenId);
    if (regimen && regimen.authorId !== userId) {
      await createNotification(regimen.authorId, {
        type: 'comment',
        relatedRegimenId: regimenId,
        relatedCommentId: commentRef.id,
        relatedUserId: userId,
        message: `${userName} commented on your regimen "${regimen.title}"`,
      });
    }
    
    return commentRef.id;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

/**
 * Fetch comments for a regimen
 */
export async function fetchComments(regimenId: string): Promise<Comment[]> {
  try {
    const q = query(
      collection(db, 'comments'),
      where('regimenId', '==', regimenId),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
    })) as Comment[];
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
}

/**
 * Report a regimen or comment
 */
export async function reportContent(
  reporterId: string,
  reportedType: 'regimen' | 'comment',
  reportedId: string,
  reason: Report['reason'],
  description?: string
): Promise<string> {
  try {
    const reportData = {
      reporterId,
      reportedType,
      reportedId,
      reason,
      description,
      status: 'pending',
      createdAt: serverTimestamp(),
    };
    
    const reportRef = await addDoc(collection(db, 'reports'), reportData);
    return reportRef.id;
  } catch (error) {
    console.error('Error reporting content:', error);
    throw error;
  }
}

/**
 * Create a new regimen
 */
export async function createRegimen(
  userId: string,
  userName: string,
  userAvatar: string | undefined,
  regimenData: {
    title: string;
    description?: string;
    steps: Regimen['steps'];
    tags: string[];
    hairType?: Regimen['hairType'];
    porosity?: Regimen['porosity'];
    isPublic: boolean;
  }
): Promise<string> {
  try {
    const regimenDoc = {
      authorId: userId,
      authorName: userName,
      authorAvatar: userAvatar,
      title: regimenData.title,
      description: regimenData.description,
      steps: regimenData.steps,
      tags: regimenData.tags,
      hairType: regimenData.hairType,
      porosity: regimenData.porosity,
      isPublic: regimenData.isPublic,
      isDraft: false,
      likesCount: 0,
      savesCount: 0,
      commentsCount: 0,
      viewsCount: 0,
      engagementScore: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'regimens'), regimenDoc);
    return docRef.id;
  } catch (error) {
    console.error('Error creating regimen:', error);
    throw error;
  }
}

/**
 * Update a regimen
 */
export async function updateRegimen(
  regimenId: string,
  userId: string,
  updates: Partial<Regimen>
): Promise<void> {
  try {
    const regimenRef = doc(db, 'regimens', regimenId);
    const regimenDoc = await getDoc(regimenRef);
    
    if (!regimenDoc.exists()) {
      throw new Error('Regimen not found');
    }
    
    if (regimenDoc.data().authorId !== userId) {
      throw new Error('Not authorized to update this regimen');
    }

    await updateDoc(regimenRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating regimen:', error);
    throw error;
  }
}

/**
 * Create a notification
 */
async function createNotification(
  userId: string,
  notification: {
    type: Notification['type'];
    relatedRegimenId?: string;
    relatedCommentId?: string;
    relatedUserId?: string;
    message: string;
  }
): Promise<void> {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      ...notification,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw - notifications are non-critical
  }
}

