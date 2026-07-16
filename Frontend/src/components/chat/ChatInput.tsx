import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_MESSAGE_LENGTH, MAX_TEXTAREA_HEIGHT } from "@/lib/constants";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  onSendMessage, 
  isLoading = false,
  placeholder = "Ask about IIPC materials..."
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT) + 'px';
    }
  }, [message]);

  return (
    <Card className={cn(
      "transition-all duration-200 border-0 shadow-lg bg-background",
      isFocused && "shadow-xl ring-2 ring-primary/20"
    )}>
      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3 sm:p-4">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={isLoading}
            className={cn(
              "min-h-[44px] max-h-[120px] resize-none border-0 bg-muted/30 focus:bg-background",
              "placeholder:text-muted-foreground/70 text-base sm:text-lg rounded-2xl",
              "focus:ring-2 focus:ring-primary/20 focus:border-transparent",
              "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
            )}
            style={{ fontSize: '16px', lineHeight: '1.4' }}
          />
          
          {message.length > 0 && (
            <div className="absolute bottom-2 left-3 text-xs text-muted-foreground/60 hidden sm:block">
              {message.length}/{MAX_MESSAGE_LENGTH}
            </div>
          )}
        </div>

        <Button 
          type="submit" 
          disabled={!message.trim() || isLoading}
          size="sm"
          className={cn(
            "w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 p-0 rounded-full sm:rounded-lg",
            "bg-gradient-to-r from-primary to-research-green hover:from-primary-dark hover:to-research-green-dark",
            "text-white shadow-lg hover:shadow-xl transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              <span className="hidden sm:inline sm:ml-2">Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline sm:ml-2">Send</span>
            </>
          )}
        </Button>
      </form>

      <div className="hidden sm:block px-4 pb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd>
              <span>to send</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Shift</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd>
              <span>for new line</span>
            </div>
          </div>
          {message.length > 0 && (
            <div className="text-muted-foreground/60">
              {message.length}/{MAX_MESSAGE_LENGTH}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
