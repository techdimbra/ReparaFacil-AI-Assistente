
export type MessageRole = 'user' | 'model' | 'system';

export interface Business {
  name: string;
  rating: number;
  uri?: string;
  title?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  imagePreview?: string;
  businesses?: Business[];
  isWaiting?: boolean;
}
