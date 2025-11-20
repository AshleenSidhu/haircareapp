/**
 * Chat Types for Hair Salon AI
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | number;
  metadata?: {
    hairType?: string;
    concern?: string;
    productId?: string;
    ingredientId?: string;
  };
}

export interface ChatConversation {
  id: string;
  userId?: string; // If logged in
  title?: string; // Auto-generated from first message
  messages: ChatMessage[];
  createdAt: Date | number;
  updatedAt: Date | number;
  context?: {
    hairType?: string;
    porosity?: string;
    concerns?: string[];
    goals?: string[];
  };
}

export interface ChatContext {
  hairType?: string;
  porosity?: string;
  concerns?: string[];
  goals?: string[];
  currentRoutine?: string[];
  allergies?: string[];
}

