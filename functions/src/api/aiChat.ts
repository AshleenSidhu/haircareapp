/**
 * AI Chat Cloud Function
 * Secure proxy for AI API calls (Azure OpenAI, OpenAI, or Google Gemini)
 * Keeps API keys secure on backend
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

// Ensure local .env is loaded for emulator / local runs so keys like
// GEMINI_API_KEY (stored at repo root) are available via process.env.
try {
  const envPath = path.resolve(__dirname, '../../.env');
  dotenv.config({ path: envPath });
  console.log('[aiChat] Loaded .env from', envPath);
} catch (e: any) {
  // Non-fatal if .env not present in production
  console.debug('[aiChat] No local .env loaded:', e?.message || e);
}

export const chatWithAI = onCall(
  {
    enforceAppCheck: false,
    region: 'northamerica-northeast1',
    timeoutSeconds: 60,
    secrets: ['GEMINI_API_KEY'], // Grant access to the secret (will be available as process.env.GEMINI_API_KEY)
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to use chat'
      );
    }

    const { messages, context, provider = 'gemini' } = request.data || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'Messages array is required'
      );
    }

    try {
      // Support Azure OpenAI, OpenAI, and Gemini
      if (provider === 'azure') {
        return await callAzureOpenAI(messages, context);
      } else if (provider === 'gemini') {
        return await callGeminiAPI(messages, context);
      } else {
        return await callOpenAIAPI(messages, context);
      }
    } catch (error: any) {
      console.error('[chatWithAI] Error:', error);
      throw new HttpsError(
        'internal',
        `Failed to get AI response: ${error.message}`
      );
    }
  }
);

/**
 * Call Azure OpenAI API
 */
async function callAzureOpenAI(messages: any[], context?: any) {
  // Get Azure OpenAI configuration
  let azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  let azureApiKey = process.env.AZURE_OPENAI_API_KEY;
  let azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-nano';
  let azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';

  // Try Firebase Runtime Config
  if (!azureEndpoint || !azureApiKey) {
    try {
      const config = functions.config();
      azureEndpoint = azureEndpoint || config?.azure?.openai_endpoint;
      azureApiKey = azureApiKey || config?.azure?.openai_api_key;
      azureDeployment = azureDeployment || config?.azure?.openai_deployment || 'gpt-5-nano';
      azureApiVersion = azureApiVersion || config?.azure?.openai_api_version || '2024-12-01-preview';
    } catch (e: any) {
      console.warn('[callAzureOpenAI] Could not read from functions.config():', e.message);
    }
  }

  if (!azureEndpoint || !azureApiKey) {
    throw new HttpsError(
      'failed-precondition',
      'Azure OpenAI configuration not found. Set AZURE_OPENAI_ENDPOINT and '
      + 'AZURE_OPENAI_API_KEY environment variables or use Firebase Runtime Config.'
    );
  }

  // Build system prompt with context
  const systemPrompt = buildSystemPrompt(context);

  // Create Azure OpenAI client
  // Azure OpenAI uses endpoint + /openai path
  const baseURL = `${azureEndpoint.replace(/\/$/, '')}/openai`;
  
  const client = new OpenAI({
    apiKey: azureApiKey,
    baseURL: baseURL,
    defaultQuery: { 'api-version': azureApiVersion },
    defaultHeaders: {
      'api-key': azureApiKey,
    },
  });

  // Format messages for Azure OpenAI
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    // Call Azure OpenAI API
    // For Azure, the model parameter should be the deployment name
    const response = await client.chat.completions.create({
      model: azureDeployment,
      messages: apiMessages,
      max_completion_tokens: 16384,
    });

    const content = response.choices?.[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('Empty response from Azure OpenAI');
    }

    return {
      content,
      model: azureDeployment,
      usage: response.usage,
    };
  } catch (error: any) {
    console.error('[callAzureOpenAI] API error:', error);
    throw new Error(`Azure OpenAI API error: ${error.message}`);
  }
}

/**
 * Call Google Gemini API
 */
async function callGeminiAPI(messages: any[], context?: any) {
  // Get Gemini API key - try multiple sources
  // Priority: 1) Secret Manager (via process.env), 2) Environment variable, 3) Firebase Runtime Config
  // Note: When 'GEMINI_API_KEY' is in the secrets array, it's automatically available as process.env.GEMINI_API_KEY
  let geminiApiKey = process.env.GEMINI_API_KEY 
    || process.env.REACT_APP_GEMINI_API_KEY;

  // Try Firebase Runtime Config (set via: firebase functions:config:set gemini.api_key="your-key")
  if (!geminiApiKey) {
    try {
      const config = functions.config();
      console.log('[callGeminiAPI] Config object keys:', Object.keys(config || {}));
      // Try several possible shapes for the config
      geminiApiKey = config?.gemini?.api_key as string | undefined
        || config?.gemini_api_key as string | undefined
        || config?.gemini?.key as string | undefined;

      if (geminiApiKey) {
        console.log('[callGeminiAPI] Found Gemini API key in Firebase Runtime Config');
      } else {
        console.warn('[callGeminiAPI] Config exists but Gemini key not found. Keys:', Object.keys(config || {}));
      }
    } catch (e: any) {
      console.error('[callGeminiAPI] Error reading from functions.config():', e?.message || e);
    }
  }

  // If there is still no Gemini key, attempt to fallback to OpenAI if available
  if (!geminiApiKey) {
    console.error('[callGeminiAPI] Gemini API key not found. Checked process.env and functions.config()');

    // Inspect OpenAI availability
    const openaiKey = process.env.OPENAI_API_KEY || ((): string | undefined => {
      try { return functions.config().openai?.api_key as string | undefined; } catch { return undefined; }
    })();

    if (openaiKey) {
      console.warn('[callGeminiAPI] No Gemini key, but OpenAI API key present — falling back to OpenAI');
      // Use OpenAI fallback
      return await callOpenAIAPI(messages, context);
    }

    // Nothing to fall back to — provide clearer guidance in the error
    try {
      const config = functions.config();
      console.error('  - functions.config() exists:', !!config);
      console.error('  - functions.config() keys:', Object.keys(config || {}));
    } catch (e: any) {
      console.error('  - functions.config() error:', e?.message || e);
    }

    throw new HttpsError(
      'failed-precondition',
      'Gemini API key not configured. Set GEMINI_API_KEY environment variable, '
      + 'add GEMINI_API_KEY to your deployment, or set Firebase Runtime Config '
      + '(e.g. firebase functions:config:set gemini.api_key="your-key"). '
      + 'Alternatively, set OPENAI_API_KEY to enable an OpenAI fallback.'
    );
  }

  // Build system instruction with context
  const systemInstruction = buildSystemPrompt(context);

  // Initialize Google Generative AI client
  // The SDK reads GEMINI_API_KEY from process.env automatically, but we can also pass it explicitly
  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
  });

  // Build the conversation content
  // The SDK expects contents as a string or structured format
  // For chat conversations, we'll format the messages properly
  let contents: string | any = '';
  
  // If we have a system instruction, prepend it
  if (systemInstruction) {
    contents = `${systemInstruction}\n\n`;
  }

  // Build conversation from messages
  // Format: combine all messages into a coherent conversation
  const conversationParts: string[] = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      conversationParts.push(`User: ${msg.content}`);
    } else if (msg.role === 'assistant') {
      conversationParts.push(`Assistant: ${msg.content}`);
    }
  }
  
  contents += conversationParts.join('\n\n');
  contents += '\n\nAssistant:';

  try {
    // Call Gemini API using the SDK
    // Available models: gemini-2.5-flash, gemini-1.5-pro, gemini-1.5-flash, gemini-pro
    const model = 'gemini-2.5-flash'; // Use the latest model
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
    });

    const content = response.text || '';

    return {
      content,
      model: model,
      usage: response.usageMetadata || {},
    };
  } catch (error: any) {
    console.error('[callGeminiAPI] SDK error:', error);
    throw new Error(`Gemini API error: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAIAPI(messages: any[], context?: any) {
  // Get OpenAI API key
  let openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    try {
      openaiApiKey = functions.config().openai?.api_key as string | undefined;
    } catch (e) {
      // functions.config() might not be available in v2
    }
  }
  
  if (!openaiApiKey) {
    throw new HttpsError(
      'failed-precondition',
      'OpenAI API key not configured. Please set OPENAI_API_KEY environment '
      + 'variable or use Firebase Runtime Config: '
      + 'firebase functions:config:set openai.api_key="your-key"'
    );
  }

  // Build system prompt with context
  const systemPrompt = buildSystemPrompt(context);

  // Format messages for OpenAI API
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  // Call OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // or 'gpt-3.5-turbo' for cost efficiency
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  return {
    content,
    model: data.model,
    usage: data.usage,
  };
}

/**
 * Build system prompt with user context
 */
function buildSystemPrompt(context?: any): string {
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