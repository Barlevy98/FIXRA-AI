export interface MessageType {
  id: string;
  text?: string;
  sender: 'user' | 'bot';
  media?: string;
  mediaType?: 'image' | 'video';
  isLoading?: boolean;
  rating?: 'up' | 'down';
  walkthroughData?: {
    youtube?: { videoId: string; title: string; thumbnail: string };
    wiki?: { title: string; url: string; thumbnail: string };
    ign?: { title: string; url: string; thumbnail: string };
    // אלו השורות החדשות שצריך להוסיף:
    polygon?: { title: string; url: string; thumbnail: string };
    mapgenie?: { title: string; url: string; thumbnail: string };
    fextralife?: { title: string; url: string; thumbnail: string };
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