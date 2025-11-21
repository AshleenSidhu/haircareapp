/**
 * Chat Box Component
 * Interactive AI chat interface for hair care advice
 */

import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import { ChatMessage, ChatConversation, ChatContext } from '../lib/types/chat';
import { 
  createNewConversation, 
  addMessageToConversation,
  saveConversationToLocal,
  getCurrentConversation,
  setCurrentConversation,
  saveConversationToFirestore
} from '../lib/utils/chat';
import { sendMessageToAI, getUserContext } from '../lib/services/aiChat';
import { validateMessage, getCharacterCount } from '../lib/utils/chatValidation';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { AlertCircle } from 'lucide-react';

interface ChatBoxProps {
  className?: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ className = '' }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [userContext, setUserContext] = useState<ChatContext | undefined>();

  // Character count
  const charCount = getCharacterCount(input);
  const maxLength = 200;
  const isOverLimit = charCount > maxLength;

  useEffect(() => {
    // Load current conversation or create new
    const current = getCurrentConversation();
    if (current) {
      setConversation(current);
    } else {
      const newConv = createNewConversation(currentUser?.uid);
      setConversation(newConv);
      setCurrentConversation(newConv);
    }

    // Load user context if logged in
    if (currentUser) {
      getUserContext(currentUser.uid).then(setUserContext);
    }
  }, [currentUser]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }

    // Validate input on change and clear error if valid
    if (input.trim()) {
      const error = validateMessage(input.trim());
      setErrorMessage(error);
    } else {
      setErrorMessage(null);
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !conversation) return;

    const userMessage = input.trim();

    // Validate message before sending
    const validationError = validateMessage(userMessage);
    if (validationError) {
      setErrorMessage(validationError);
      toast({
        title: "Message blocked",
        description: validationError,
        variant: "destructive",
      });
      return; // Do NOT send blocked messages
    }

    // Clear error and input
    setErrorMessage(null);
    setInput('');
    setIsLoading(true);

    // Add user message
    const updatedConv = addMessageToConversation(conversation, {
      role: 'user',
      content: userMessage,
    });
    setConversation(updatedConv);
    setCurrentConversation(updatedConv);
    saveConversationToLocal(updatedConv);

    // Save to Firestore if logged in
    if (currentUser) {
      try {
        await saveConversationToFirestore(updatedConv, currentUser.uid);
      } catch (error) {
        console.error('Error saving to Firestore:', error);
      }
    }

    // Get AI response
    setIsStreaming(true);
    let aiResponseContent = '';

    try {
      const aiResponse = sendMessageToAI(updatedConv.messages, userContext);
      
      // Create assistant message placeholder
      const assistantMessageId = `msg_${Date.now()}_ai`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      let streamingConv = {
        ...updatedConv,
        messages: [...updatedConv.messages, assistantMessage],
      };

      // Stream response
      for await (const chunk of aiResponse) {
        aiResponseContent += chunk;
        streamingConv = {
          ...streamingConv,
          messages: streamingConv.messages.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: aiResponseContent }
              : m
          ),
        };
        setConversation(streamingConv);
        setCurrentConversation(streamingConv);
      }

      // Final update
      const finalConv = {
        ...streamingConv,
        updatedAt: new Date(),
      };
      setConversation(finalConv);
      setCurrentConversation(finalConv);
      saveConversationToLocal(finalConv);

      // Save to Firestore if logged in
      if (currentUser) {
        try {
          await saveConversationToFirestore(finalConv, currentUser.uid);
        } catch (error) {
          console.error('Error saving to Firestore:', error);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // Validate before sending on Enter key
      const userMessage = input.trim();
      if (userMessage) {
        const validationError = validateMessage(userMessage);
        if (validationError) {
          setErrorMessage(validationError);
          toast({
            title: "Message blocked",
            description: validationError,
            variant: "destructive",
          });
          return; // Do NOT send blocked messages
        }
      }
      
      handleSend();
    }
  };

  const handleNewChat = () => {
    const newConv = createNewConversation(currentUser?.uid);
    setConversation(newConv);
    setCurrentConversation(newConv);
    setInput('');
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 bg-primary/10">
            <AvatarFallback>
              <Bot className="w-4 h-4 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm">Hair Care Expert</h3>
            <p className="text-xs text-muted-foreground">
              {isStreaming ? 'Typing...' : 'Online'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleNewChat}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation?.messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h4 className="font-semibold mb-2">Hi! I'm your Hair Care Expert</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Ask me anything about hair care, products, ingredients, or routines.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "What's the best routine for curly hair?",
                "Explain this ingredient",
                "Help me build a routine",
                "Product recommendations",
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => setInput(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {conversation?.messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <Avatar className="w-8 h-8 bg-primary/10 flex-shrink-0">
                <AvatarFallback>
                  <Bot className="w-4 h-4 text-primary" />
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.role === 'user' && (
              <Avatar className="w-8 h-8 bg-muted flex-shrink-0">
                <AvatarFallback>
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {isStreaming && (
          <div className="flex gap-3 justify-start">
            <Avatar className="w-8 h-8 bg-primary/10 flex-shrink-0">
              <AvatarFallback>
                <Bot className="w-4 h-4 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                // Limit input to maxLength
                const newValue = e.target.value;
                if (newValue.length <= maxLength) {
                  setInput(newValue);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about hair care, products, ingredients..."
              className={`min-h-[60px] max-h-[200px] resize-none ${
                errorMessage ? 'border-destructive focus-visible:ring-destructive' : ''
              }`}
              disabled={isLoading}
              maxLength={maxLength}
            />
            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}
            {/* Character Counter */}
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </p>
              <p
                className={`text-xs ${
                  isOverLimit
                    ? 'text-destructive font-semibold'
                    : charCount > maxLength * 0.8
                    ? 'text-yellow-600'
                    : 'text-muted-foreground'
                }`}
              >
                {charCount}/{maxLength}
              </p>
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !!errorMessage || isOverLimit}
            size="icon"
            className="self-end"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

