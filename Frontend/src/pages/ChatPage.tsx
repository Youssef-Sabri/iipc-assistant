import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../components/chat/ChatMessage";
import { ChatInput } from "../components/chat/ChatInput";
import { MessageCircle, Sparkles } from "lucide-react";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isTyping?: boolean;
  fullContent?: string;
}

const initialMessages: Message[] = [];

const suggestionQueries = [
  "What are the latest best practices for web crawling?",
  "How do IIPC members approach quality assurance in web archiving?", 
  "What legal and policy issues affect web archiving?",
  "Who developed WARCrefs for deduplicating web archives?"
];

async function generateSignature(timestamp: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(timestamp + "-iipc-dynamic-salt-2026");
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function ChatPage() {
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
      const timestamp = Date.now().toString();
      const signature = await generateSignature(timestamp);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-app-timestamp": timestamp,
          "x-app-signature": signature
        },
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
      setMessages(prev => prev.map(msg =>
        msg.id === newMessageId
          ? { ...msg, content: "Sorry, there was an error getting the response. Please try again.", isTyping: false, fullContent: undefined }
          : msg
      ));
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const isFirstTimeUser = messages.length === 0;

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col bg-background relative overflow-hidden">
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
              {/* Page Header */}
              <div className="flex items-center gap-3 px-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-primary to-research-green flex items-center justify-center shadow-lg flex-shrink-0">
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg sm:text-2xl text-primary">Ask a Question</h1>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Search IIPC materials
                  </p>
                </div>
              </div>

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
                  
                  {/* Example questions as compact chips */}
                  <div className="max-w-2xl mx-auto px-4">
                    <p className="text-sm text-muted-foreground mb-3 text-center">
                      Try asking:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                      {suggestionQueries.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs sm:text-sm px-3 py-2 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 text-primary transition-all duration-200 cursor-pointer text-center truncate"
                        >
                          {suggestion}
                        </button>
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
