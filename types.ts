export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface MapChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        reviewText: string;
      }[];
    }[];
  };
}

export interface GroundingMetadata {
  groundingChunks?: MapChunk[];
  groundingSupports?: any[];
  webSearchQueries?: string[];
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  audio?: string; // Base64 encoded audio string
  groundingMetadata?: GroundingMetadata;
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}
