/**
 * Utility functions for quiz-related operations
 */
import { db } from './firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

/**
 * Check if a user has already completed the quiz
 * @param userId - The user's Firebase UID
 * @returns Promise<boolean> - True if user has completed quiz, false otherwise
 */
export async function hasUserCompletedQuiz(userId: string): Promise<boolean> {
  try {
    const quizResultsRef = collection(db, 'quizResults');
    // Simplified query without orderBy to avoid index requirement and improve speed
    const q = query(
      quizResultsRef,
      where('userId', '==', userId),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking quiz completion:', error);
    // Return false on error to allow user to proceed
    return false;
  }
}

/**
 * Get the latest quiz result for a user
 * @param userId - The user's Firebase UID
 * @returns Promise<any> - The latest quiz result or null
 */
export async function getLatestQuizResult(userId: string) {
  try {
    const quizResultsRef = collection(db, 'quizResults');
    const q = query(
      quizResultsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data(),
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching latest quiz result:', error);
    return null;
  }
}

