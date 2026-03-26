export interface MessageType {
  id: string;
  text?: string;
  media?: string;
  mediaType?: 'image' | 'video';
  sender: 'user' | 'bot';
  isLoading?: boolean;
  rating?: 'up' | 'down';
  walkthroughData?: {
    youtube?: { videoId: string; title: string; thumbnail: string; };
    wiki?: { title: string; url: string; thumbnail?: string; };
    ign?: { title: string; url: string; thumbnail?: string; }; // <--- IGN במקום רדיט
    twitch?: { title: string; url: string; thumbnail: string; streamer: string; };
  };
}

export interface ChatSession {
  id: string;
  title: string;
  category: string;
  messages: MessageType[];
  updatedAt: number;
}

export interface AIResponse {
  message: string;
  youtubeQuery?: string;
  wikiQuery?: string;
  ignQuery?: string; // <--- IGN במקום רדיט
  category: string;
}