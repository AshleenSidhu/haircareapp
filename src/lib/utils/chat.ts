/**
 * Chat Utilities
 * Functions for managing chat conversations and history
 */

import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { ChatMessage, ChatConversation } from '../types/chat';

const STORAGE_KEY = 'haircare_chat_conversations';
const CURRENT_CONVERSATION_KEY = 'haircare_current_conversation';

/**
 * Save conversation to localStorage
 */
export function saveConversationToLocal(conversation: ChatConversation): void {
  try {
    const conversations = getLocalConversations();
    const index = conversations.findIndex(c => c.id === conversation.id);
    
    if (index >= 0) {
      conversations[index] = conversation;
    } else {
      conversations.push(conversation);
    }
    
    // Keep only last 10 conversations
    const sorted = conversations.sort((a, b) => {
      const aTime = typeof a.updatedAt === 'number' ? a.updatedAt : a.updatedAt.getTime();
      const bTime = typeof b.updatedAt === 'number' ? b.updatedAt : b.updatedAt.getTime();
      return bTime - aTime;
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted.slice(0, 10)));
  } catch (error) {
    console.error('Error saving conversation to local storage:', error);
  }
}

/**
 * Get all conversations from localStorage
 */
export function getLocalConversations(): ChatConversation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const conversations = JSON.parse(stored) as ChatConversation[];
    return conversations.map(c => ({
      ...c,
      messages: c.messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    }));
  } catch (error) {
    console.error('Error reading conversations from local storage:', error);
    return [];
  }
}

/**
 * Get current conversation from localStorage
 */
export function getCurrentConversation(): ChatConversation | null {
  try {
    const stored = localStorage.getItem(CURRENT_CONVERSATION_KEY);
    if (!stored) return null;
    
    const conversation = JSON.parse(stored) as ChatConversation;
    return {
      ...conversation,
      messages: conversation.messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
      createdAt: new Date(conversation.createdAt),
      updatedAt: new Date(conversation.updatedAt),
    };
  } catch (error) {
    console.error('Error reading current conversation from local storage:', error);
    return null;
  }
}

/**
 * Set current conversation in localStorage
 */
export function setCurrentConversation(conversation: ChatConversation | null): void {
  try {
    if (conversation) {
      localStorage.setItem(CURRENT_CONVERSATION_KEY, JSON.stringify(conversation));
    } else {
      localStorage.removeItem(CURRENT_CONVERSATION_KEY);
    }
  } catch (error) {
    console.error('Error saving current conversation to local storage:', error);
  }
}

/**
 * Save conversation to Firestore (if logged in)
 */
/**
 * Remove undefined values from object (Firestore doesn't allow undefined)
 */
function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedFields(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}

export async function saveConversationToFirestore(
  conversation: ChatConversation,
  userId: string
): Promise<string> {
  try {
    // Build conversation data and remove undefined values
    const conversationData = removeUndefinedFields({
      userId,
      title: conversation.title || 'Chat Conversation',
      messages: conversation.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp instanceof Date ? Timestamp.fromDate(m.timestamp) : Timestamp.fromMillis(m.timestamp as number),
        metadata: m.metadata ? removeUndefinedFields(m.metadata) : undefined,
      })),
      context: conversation.context ? removeUndefinedFields(conversation.context) : undefined,
      createdAt: conversation.createdAt instanceof Date 
        ? Timestamp.fromDate(conversation.createdAt) 
        : Timestamp.fromMillis(conversation.createdAt as number),
      updatedAt: serverTimestamp(),
    });

    // Check if this conversation already exists in Firestore
    // If conversation.id starts with 'conv_', it's a local ID - we need to find the Firestore doc
    // Otherwise, it's already a Firestore document ID
    if (conversation.id) {
      if (conversation.id.startsWith('conv_')) {
        // Local ID - try to find existing document by matching userId and title or first message
        const q = query(
          collection(db, 'chatConversations'),
          where('userId', '==', userId),
          orderBy('updatedAt', 'desc'),
          limit(10) // Check recent conversations
        );
        const snapshot = await getDocs(q);
        
        // Try to find a match (could match by title or first message content)
        let foundDoc = null;
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          // Match by title or first message if available
          if (data.title === conversation.title || 
              (conversation.messages.length > 0 && 
               data.messages?.[0]?.content === conversation.messages[0].content)) {
            foundDoc = docSnap;
            break;
          }
        }
        
        if (foundDoc) {
          // Update existing
          await updateDoc(foundDoc.ref, conversationData);
          return foundDoc.id;
        } else {
          // Create new if not found
          const docRef = await addDoc(collection(db, 'chatConversations'), conversationData);
          return docRef.id;
        }
      } else {
        // Firestore document ID - update directly
        const { doc } = await import('firebase/firestore');
        const docRef = doc(db, 'chatConversations', conversation.id);
        await updateDoc(docRef, conversationData);
        return conversation.id;
      }
    } else {
      // Create new
      const docRef = await addDoc(collection(db, 'chatConversations'), conversationData);
      return docRef.id;
    }
  } catch (error) {
    console.error('Error saving conversation to Firestore:', error);
    throw error;
  }
}

/**
 * Fetch conversations from Firestore
 */
export async function fetchConversationsFromFirestore(
  userId: string,
  limitCount: number = 20
): Promise<ChatConversation[]> {
  try {
    const q = query(
      collection(db, 'chatConversations'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      messages: doc.data().messages.map((m: any) => ({
        ...m,
        timestamp: m.timestamp?.toDate?.() || new Date(m.timestamp),
      })),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
    })) as ChatConversation[];
  } catch (error) {
    console.error('Error fetching conversations from Firestore:', error);
    return [];
  }
}

/**
 * Create a new conversation
 */
export function createNewConversation(userId?: string): ChatConversation {
  return {
    id: `conv_${Date.now()}`,
    userId,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Add message to conversation
 */
export function addMessageToConversation(
  conversation: ChatConversation,
  message: Omit<ChatMessage, 'id' | 'timestamp'>
): ChatConversation {
  const newMessage: ChatMessage = {
    ...message,
    id: `msg_${Date.now()}_${Math.random()}`,
    timestamp: new Date(),
  };

  return {
    ...conversation,
    messages: [...conversation.messages, newMessage],
    updatedAt: new Date(),
    title: conversation.title || generateTitleFromMessage(message.content),
  };
}

/**
 * Generate a title from the first user message
 */
function generateTitleFromMessage(content: string): string {
  const words = content.split(' ').slice(0, 5).join(' ');
  return words.length > 30 ? words.substring(0, 30) + '...' : words;
}

