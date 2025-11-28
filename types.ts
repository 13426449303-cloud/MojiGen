export type EmotionType = 
  | 'love' 
  | 'angry' 
  | 'cry' 
  | 'laugh' 
  | 'surprised' 
  | 'confused' 
  | 'cheer' 
  | 'sleepy' 
  | 'ok'
  | 'cool'
  | 'shy'
  | 'rich';

export interface EmotionConfig {
  id: EmotionType;
  label: string;
  emoji: string;
  promptSuffix: string;
}

export interface StyleConfig {
  id: string;
  label: string;
  prompt: string;
}

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface StickerState {
  status: GenerationStatus;
  mediaUrl?: string;
  mediaType?: 'video' | 'image';
  error?: string;
}

export interface AppState {
  selectedImage: string | null; // Base64
  selectedStyleId: string;
  stickers: Record<EmotionType, StickerState>;
  apiKeySet: boolean;
}