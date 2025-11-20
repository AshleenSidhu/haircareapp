/**
 * AI Chat Service
 * Handles communication with AI backend for hair care advice
 * Prefers Firebase Cloud Function (secure), falls back to direct API calls
 */

import { ChatMessage, ChatContext } from '../types/chat';
import { chatWithAI } from '../firebase';

const AI_API_URL = process.env.REACT_APP_AI_API_URL || 'https://api.openai.com/v1/chat/completions';
const AI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const USE_FIREBASE_FUNCTION = true; // Prefer Firebase function for security
const AI_PROVIDER = (process.env.REACT_APP_AI_PROVIDER || 'gemini').toLowerCase(); // 'azure', 'gemini', or 'openai'

interface AIResponse {
  content: string;
  done: boolean;
}

/**
 * Send message to AI and get streaming response
 * Prefers Firebase Cloud Function (secure), falls back to direct API or mock
 */
export async function* sendMessageToAI(
  messages: ChatMessage[],
  context?: ChatContext
): AsyncGenerator<string, void, unknown> {
  // Try Firebase Cloud Function first (recommended - keeps API key secure)
  if (USE_FIREBASE_FUNCTION) {
    try {
      console.log('[AI Chat] Attempting Firebase function call with provider:', AI_PROVIDER);
      const result = await chatWithAI({
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        context: context ? removeUndefinedContext(context) : undefined,
        provider: AI_PROVIDER, // 'azure', 'gemini', or 'openai'
      });

      // Type assertion for Firebase callable function response
      const responseData = result.data as { content?: string; model?: string; usage?: any } | undefined;
      const content = responseData?.content || '';
      if (content && content.length > 0) {
        console.log('[AI Chat] Received response from Firebase function, length:', content.length);
        // Simulate streaming for better UX (Firebase function returns complete response)
        for (let i = 0; i < content.length; i++) {
          yield content[i];
          await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay per character
        }
        return;
      } else {
        console.warn('[AI Chat] Firebase function returned empty content');
      }
    } catch (error: any) {
      console.error('[AI Chat] Firebase function failed:', error.code, error.message);
      console.error('[AI Chat] Error details:', error.details);
      // Fall through to direct API or mock
    }
  }

  // Fallback to direct API calls (requires API key in frontend)
  if (AI_PROVIDER === 'gemini' && GEMINI_API_KEY) {
    try {
      yield* streamFromGemini(messages, context);
      return;
    } catch (error) {
      console.error('Error calling Gemini API directly:', error);
      // Fall through to OpenAI or mock
    }
  }

  if (AI_API_KEY) {
    try {
      yield* streamFromOpenAI(messages, context);
      return;
    } catch (error) {
      console.error('Error calling OpenAI API directly:', error);
      // Fall through to mock
    }
  }

  // Final fallback: mock response
  console.warn('[AI Chat] Using mock response. Set up OpenAI API key or deploy Firebase function.');
  yield* generateMockResponse(messages[messages.length - 1]?.content || '');
}

/**
 * Stream response directly from Google Gemini API
 */
async function* streamFromGemini(
  messages: ChatMessage[],
  context?: ChatContext
): AsyncGenerator<string, void, unknown> {
  const systemInstruction = buildSystemPrompt(context);

  // Convert messages to Gemini format
  const geminiMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const requestBody = {
    contents: geminiMessages,
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    },
  };

  const model = 'gemini-1.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  // Gemini streaming uses Server-Sent Events (SSE)
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            yield text;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

/**
 * Stream response directly from OpenAI API
 */
async function* streamFromOpenAI(
  messages: ChatMessage[],
  context?: ChatContext
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = buildSystemPrompt(context);
  
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const response = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: apiMessages,
      stream: true,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

/**
 * Build system prompt with user context
 */
function buildSystemPrompt(context?: ChatContext): string {
  let prompt = `You are a professional hair care expert and stylist with deep knowledge of:
- Hair types (straight, wavy, curly, coily, mixed)
- Porosity levels (low, medium, high)
- Ingredient science and safety
- Product recommendations
- Hair care routines and regimens
- Scalp health
- Hair concerns (frizz, breakage, dryness, etc.)

Provide personalized, evidence-based advice. Be friendly, conversational, and helpful.`;

  if (context) {
    prompt += '\n\nUser Context:';
    if (context.hairType) prompt += `\n- Hair Type: ${context.hairType}`;
    if (context.porosity) prompt += `\n- Porosity: ${context.porosity}`;
    if (context.concerns?.length) prompt += `\n- Concerns: ${context.concerns.join(', ')}`;
    if (context.goals?.length) prompt += `\n- Goals: ${context.goals.join(', ')}`;
    if (context.allergies?.length) prompt += `\n- Allergies: ${context.allergies.join(', ')}`;
  }

  prompt += '\n\nKeep responses concise but informative. Ask follow-up questions when needed.';

  return prompt;
}

/**
 * Generate mock response (fallback when no API key)
 */
async function* generateMockResponse(userMessage: string): AsyncGenerator<string, void, unknown> {
  const responses = [
    "I'd be happy to help you with your hair care! ",
    "Based on what you've shared, ",
    "Here's what I recommend: ",
    "For your hair type and concerns, ",
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  const mockContent = `${randomResponse}I understand you're asking about "${userMessage}". ` +
    `As your hair care expert, I'd suggest starting with a gentle, sulfate-free shampoo and a moisturizing conditioner. ` +
    `Would you like me to help you build a complete routine, or do you have specific questions about ingredients or products?`;

  // Simulate streaming
  for (let i = 0; i < mockContent.length; i++) {
    yield mockContent[i];
    await new Promise(resolve => setTimeout(resolve, 20)); // 20ms delay per character
  }
}

/**
 * Remove undefined values from context (for Firestore compatibility)
 */
function removeUndefinedContext(context: ChatContext): ChatContext {
  const cleaned: ChatContext = {};
  if (context.hairType) cleaned.hairType = context.hairType;
  if (context.porosity) cleaned.porosity = context.porosity;
  if (context.concerns && context.concerns.length > 0) cleaned.concerns = context.concerns;
  if (context.goals && context.goals.length > 0) cleaned.goals = context.goals;
  if (context.allergies && context.allergies.length > 0) cleaned.allergies = context.allergies;
  if (context.currentRoutine && context.currentRoutine.length > 0) cleaned.currentRoutine = context.currentRoutine;
  return cleaned;
}

/**
 * Get user context from quiz results or profile
 */
export async function getUserContext(userId: string): Promise<ChatContext | undefined> {
  try {
    const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    const quizResultsRef = collection(db, 'quizResults');
    const q = query(
      quizResultsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const quizData = snapshot.docs[0].data();
      const answers = quizData.answers || {};
      
      return {
        hairType: answers.hairType || answers.thickness,
        porosity: answers.porosity,
        concerns: Array.isArray(answers.concerns) ? answers.concerns : [],
        allergies: Array.isArray(answers.allergies) ? answers.allergies : [],
      };
    }
  } catch (error) {
    console.error('Error fetching user context:', error);
  }
  
  return undefined;
}

