import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";

import { 
  MessageCircle, 
  Sparkles, 
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isTyping?: boolean;
  fullContent?: string;
}

const initialMessages: Message[] = [
  {
    id: "welcome",
    content: "Welcome to the IIPC Assistant! I can help you explore conference materials, research papers, and presentations from the International Internet Preservation Consortium. Ask me about web archiving practices, quality assurance methods, technical standards, or any specific topics you're researching.",
    role: "system",
    timestamp: new Date()
  }
];

const suggestionQueries = [
  "What are the latest best practices for web crawling?",
  "How do IIPC members handle quality assurance?", 
  "What legal issues affect web archiving?",
  "Creator of WARCrefs for Deduplicating Web Archives?"
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Keep the typing timeout ID so we can cancel it if we flush the typing early
  const typingTimeoutRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]); 

  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
    }
    
    return () => {
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1');
      }
    };
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current !== null) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date()
    };

    // If there's currently an assistant message that is typing, flush it immediately
    setMessages(prev => {
      let flushed = false;
      const updated = prev.map(msg => {
        if (!flushed && msg.role === "assistant" && msg.isTyping) {
          flushed = true;
          // cancel the pending typing timeout (if any)
          if (typingTimeoutRef.current !== null) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
          return {
            ...msg,
            content: msg.fullContent ?? msg.content,
            isTyping: false,
            fullContent: undefined
          };
        }
        return msg;
      });
      // Append the new user message after flushing
      return [...updated, userMessage];
    });

    setIsLoading(true);

    // Add placeholder assistant message immediately to show "Thinking..."
    const newMessageId = (Date.now() + 1).toString();
    const placeholderAssistantMessage: Message = {
      id: newMessageId,
      content: "",
      role: "assistant",
      timestamp: new Date(),
      isTyping: true,
      fullContent: "" // Will be set after fetch
    };
    setMessages(prev => [...prev, placeholderAssistantMessage]);

    try {
      const apiBaseUrl = import.meta.env.VITE_CHAT_API_URL || "";
      const hfToken = import.meta.env.VITE_HF_TOKEN;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (hfToken) {
        headers["Authorization"] = `Bearer ${hfToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: content }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from backend");
      }

      const data = await response.json();
      const fullText = data.response || "No response available.";

      // Update the existing placeholder message with the actual content
      setMessages(prev => prev.map(msg => 
        msg.id === newMessageId 
          ? { ...msg, fullContent: fullText }
          : msg
      ));
      
      setIsLoading(false);

      // Simulate typing: compute duration and schedule final reveal
      const typingDuration = (fullText.length / 30) * 1000; 
      // Clear any previous timeout reference just in case
      if (typingTimeoutRef.current !== null) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      const timeoutId = window.setTimeout(() => {
        setMessages(prev => prev.map(msg =>
          msg.id === newMessageId 
            ? { ...msg, content: fullText, isTyping: false, fullContent: undefined }
            : msg
        ));
        typingTimeoutRef.current = null;
      }, typingDuration + 100);

      typingTimeoutRef.current = timeoutId;

    } catch (error) {
      console.error("Failed to fetch assistant response:", error);
      // If there was a typing message pending, flush it (safety)
      if (typingTimeoutRef.current !== null) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: "Sorry, there was an error getting the response. Please try again.",
          role: "assistant",
          timestamp: new Date()
        }
      ]);
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const isFirstTimeUser = messages.length === 1;

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col bg-background relative overflow-hidden">
      {/* Mobile Header - More Compact */}
      <div className="flex-shrink-0 border-b border-border bg-background z-10">
        <div className="flex items-center justify-between p-3 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-primary to-research-green flex items-center justify-center shadow-lg flex-shrink-0">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-lg sm:text-2xl text-primary truncate">Ask a Question</h1>
              <p className="text-muted-foreground text-xs sm:text-sm truncate">
                Search IIPC materials
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container - Desktop: flex layout, Mobile: absolute positioning */}
      <div className="flex-1 flex flex-col relative min-h-0 sm:flex sm:flex-col">
        {/* Messages Area - Mobile: absolute positioning with bottom padding for input */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto overscroll-behavior-y-contain sm:flex-1 sm:overflow-y-auto absolute inset-0 sm:relative"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            // Mobile: Add bottom padding to account for fixed input
            paddingBottom: '120px'
          }}
        >
          <div className="p-2 sm:p-4 pb-safe">
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
              {/* Welcome Screen - Mobile Optimized */}
              {isFirstTimeUser && (
                <div className="text-center py-6 sm:py-12 animate-in fade-in-0 slide-in-from-bottom-4">
                  <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-primary/20 to-research-green/20 flex items-center justify-center mx-auto mb-3 sm:mb-6 shadow-lg">
                    <Sparkles className="w-6 h-6 sm:w-10 sm:h-10 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-3xl font-bold mb-2 sm:mb-4 bg-gradient-to-r from-primary to-research-green bg-clip-text text-transparent px-4">
                    Welcome to IIPC Assistant
                  </h2>
                  <p className="text-muted-foreground mb-4 sm:mb-8 max-w-3xl mx-auto text-sm sm:text-lg leading-relaxed px-4">
                    I can help you explore conference materials, research papers, and presentations from the International Internet Preservation Consortium.
                  </p>
                  
                  {/* Desktop Suggestions - Always Visible */}
                  <div className="hidden sm:block space-y-3 max-w-3xl mx-auto px-4">
                    <p className="text-lg text-muted-foreground mb-4 font-semibold">
                      Try asking about:
                    </p>
                    <div className="grid gap-3">
                      {suggestionQueries.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="text-left h-auto p-4 justify-start hover:bg-gradient-to-r hover:from-primary/10 hover:to-research-green/10 hover:border-primary/50 transition-all duration-300 transform hover:scale-105 border-2 border-primary/30 rounded-xl bg-gradient-to-r from-background to-primary/5"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <BookOpen className="w-5 h-5 mr-3 text-primary flex-shrink-0" />
                          <span className="text-base text-primary font-medium">{suggestion}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Suggestions - Always Visible - Compact */}
                  <div className="sm:hidden space-y-1.5 max-w-sm mx-auto px-4">
                    <p className="text-sm text-muted-foreground mb-2 font-medium text-center">
                      Try asking:
                    </p>
                    <div className="grid gap-1.5">
                      {suggestionQueries.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="text-left h-auto p-2 justify-start hover:bg-gradient-to-r hover:from-primary/10 hover:to-research-green/10 hover:border-primary/50 transition-all duration-200 border border-primary/20 rounded-md bg-gradient-to-r from-background to-primary/5"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <BookOpen className="w-3 h-3 mr-1.5 text-primary flex-shrink-0" />
                          <span className="text-xs text-primary font-medium text-left line-clamp-2">{suggestion}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                />
              ))}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input Area - Mobile: Fixed at bottom, Desktop: Normal flex layout */}
        <div className="fixed bottom-0 left-0 right-0 sm:relative sm:flex-shrink-0 border-t border-border bg-background backdrop-blur-sm z-20">
          <div className="p-2 sm:p-4 pb-safe">
            <div className="max-w-4xl mx-auto">
              <ChatInput 
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
