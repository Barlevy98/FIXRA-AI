// 1. הגדרת המוקים - Jest מעלה אותם אוטומטית למעלה
jest.mock('@google/generative-ai', () => {
  const mSendMessage = jest.fn();
  const mStartChat = jest.fn(() => ({ sendMessage: mSendMessage }));
  const mGetGenerativeModel = jest.fn(() => ({ startChat: mStartChat }));
  
  return {
    GoogleGenerativeAI: jest.fn(() => ({
      getGenerativeModel: mGetGenerativeModel,
    })),
  };
});

jest.mock('../utils/translations', () => ({
  getTranslation: jest.fn(),
}));

global.fetch = jest.fn();

// 2. הגדרת מפתחות הדמה *לפני* הטעינה של הקובץ
process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'dummy-gemini-key';
process.env.EXPO_PUBLIC_YOUTUBE_API_KEY = 'dummy-youtube-key';

// 3. שימוש ב-require כדי למנוע את באג ההקפצה (Hoisting)
const { fetchGameWalkthrough } = require('./aiService');
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getTranslation } from '../utils/translations';

describe('aiService - fetchGameWalkthrough', () => {
  let mockSendMessage: jest.Mock;

  beforeAll(() => {
    const genAI = new GoogleGenerativeAI('dummy-key');
    const model = genAI.getGenerativeModel({ model: 'dummy' });
    const chat = model.startChat({ history: [] });
    mockSendMessage = chat.sendMessage as jest.Mock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getTranslation as jest.Mock).mockReturnValue({
      aiError: 'An error occurred. Don\'t worry, your credit was not used.'
    });
  });

  it('1. Returns successful response and exactly 1 link for a FREE user', async () => {
    const fakeAIResponse = {
      message: "Here is how to beat the boss.",
      category: "Elden Ring",
      youtubeQuery: "Elden Ring boss guide",
      wikiQuery: "Elden Ring boss wiki"
    };
    mockSendMessage.mockResolvedValue({ response: { text: () => JSON.stringify(fakeAIResponse) } });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        items: [{ id: { videoId: '123' }, snippet: { title: 'Guide', thumbnails: { high: { url: 'url' } } } }]
      })
    });

    const result = await fetchGameWalkthrough('help me', null, 'English', [], 'Free');

    expect(result.isError).toBe(false);
    expect(result.message).toBe("Here is how to beat the boss.");
    expect(result.category).toBe("Elden Ring");
    expect(Object.keys(result.walkthroughData || {}).length).toBe(1);
  });

  it('2. Returns multiple links for a PREMIUM user', async () => {
    const fakeAIResponse = {
      message: "Premium guide.",
      category: "GTA V",
      youtubeQuery: "GTA V guide",
      wikiQuery: "GTA V wiki",
      ignQuery: "GTA V ign"
    };
    mockSendMessage.mockResolvedValue({ response: { text: () => JSON.stringify(fakeAIResponse) } });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        items: [{ id: { videoId: '456' }, snippet: { title: 'Premium Video', thumbnails: { high: { url: 'url' } } } }]
      })
    });

    const result = await fetchGameWalkthrough('help me', null, 'English', [], 'PREMIUM');

    expect(result.isError).toBe(false);
    expect(Object.keys(result.walkthroughData || {}).length).toBe(3);
  });

  it('3. Handles API Errors gracefully and returns isError flag', async () => {
    mockSendMessage.mockRejectedValue(new Error('503 Service Unavailable'));
    const result = await fetchGameWalkthrough('help me', null, 'English', [], 'Free');
    expect(result.isError).toBe(true);
    expect(result.message).toBe("An error occurred. Don't worry, your credit was not used.");
  });

  it('4. Handles invalid JSON response from AI gracefully', async () => {
    mockSendMessage.mockResolvedValue({ response: { text: () => "I am an AI and I forgot how to JSON." } });
    const result = await fetchGameWalkthrough('help me', null, 'English', [], 'Free');
    expect(result.isError).toBe(true);
    expect(result.category).toBe("General");
  });
});