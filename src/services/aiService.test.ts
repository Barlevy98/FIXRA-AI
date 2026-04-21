import { getTranslation } from '../utils/translations';

// מזייפים את קובץ התרגומים
jest.mock('../utils/translations', () => ({
  getTranslation: jest.fn(),
}));

// מזייפים את פקודת ה-fetch המובנית של ג'אווה-סקריפט
global.fetch = jest.fn();

describe('QA: aiService - fetchGameWalkthrough (Backend Version)', () => {
  let fetchGameWalkthrough: any;

  beforeAll(() => {
    // 🌟 התיקון הקריטי: מגדירים את המשתנים *לפני* שטוענים את הקובץ לזיכרון
    // זה מונע מ-Jest לטעון את הקובץ לפני שיש לו את הכתובת
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://mock-supabase.com';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'mock-key';
    
    // עכשיו בטוח לטעון את פונקציית השירות
    fetchGameWalkthrough = require('./aiService').fetchGameWalkthrough;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getTranslation as jest.Mock).mockReturnValue({
      aiError: 'An error occurred while connecting to the server.'
    });
  });

  it('1. Returns successful response from the Edge Function', async () => {
    // זה ה-JSON שאנחנו מצפים שהשרת שלכם יחזיר
    const mockServerResponse = {
      message: "Here is how to beat the boss.",
      category: "Elden Ring",
      walkthroughData: { youtube: { videoId: '123', title: 'Guide' } },
      isError: false
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockServerResponse)
    });

    const result = await fetchGameWalkthrough('help me', null, 'English', [], 'Free', 'General');

    expect(result.isError).toBe(false);
    expect(result.message).toBe("Here is how to beat the boss.");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    // מוודאים שהטלפון אכן פנה לכתובת הנכונה של השרת
    expect(global.fetch).toHaveBeenCalledWith(
      'https://mock-supabase.com/functions/v1/chat',
      expect.any(Object)
    );
  });

  it('2. Handles Server Errors (500) gracefully and returns isError flag', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500
    });

    const result = await fetchGameWalkthrough('help me', null, 'English', [], 'Free', 'General');
    
    expect(result.isError).toBe(true);
    expect(result.message).toBe("An error occurred while connecting to the server.");
  });
});