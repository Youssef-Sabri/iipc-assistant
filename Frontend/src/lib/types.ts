export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isTyping?: boolean;
  fullContent?: string;
}

export interface ItemType {
  type: string;
  count: number;
}
