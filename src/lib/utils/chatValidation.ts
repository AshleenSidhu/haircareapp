/**
 * Chat Message Validation
 * Validates user messages before sending
 */

// List of forbidden words (profanity filter)
// In production, this should be more comprehensive or loaded from a backend
const FORBIDDEN_WORDS = [
  // Common profanity - add more as needed
  'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard',
  'crap', 'hell', 'piss', 'dick', 'cock', 'pussy',
  // Add more words as needed
];

/**
 * Validate a chat message
 * @param message - The message to validate
 * @returns Error message string if validation fails, null if valid
 */
export function validateMessage(message: string): string | null {
  // Check length
  if (message.length > 200) {
    return 'Message exceeds 200 characters.';
  }

  // Check for forbidden words (case-insensitive)
  const lowerMessage = message.toLowerCase();
  const containsForbiddenWord = FORBIDDEN_WORDS.some(word => 
    lowerMessage.includes(word.toLowerCase())
  );

  if (containsForbiddenWord) {
    return 'Message contains disallowed language.';
  }

  return null;
}

/**
 * Get character count for display
 */
export function getCharacterCount(message: string): number {
  return message.length;
}

/**
 * Get remaining characters
 */
export function getRemainingCharacters(message: string, maxLength: number = 200): number {
  return Math.max(0, maxLength - message.length);
}

