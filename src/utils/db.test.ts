import { 
    saveChatSession, 
    getUserSubscriptionData, 
    createReferralCode, 
    deleteChatSession 
  } from './db';
  import { getAuthenticatedSupabase } from './supabase';
  
  // --- בניית הזיוף (Mock) לשרשרת הפקודות של Supabase ---
  const mockEqDelete = jest.fn();
  const mockSingle = jest.fn();
  const mockOrder = jest.fn();
  const mockUpsert = jest.fn();
  
  const mockSupabase = {
    from: jest.fn().mockReturnValue({
      upsert: mockUpsert,
      delete: jest.fn().mockReturnValue({ eq: mockEqDelete }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: mockSingle,
          order: mockOrder
        })
      })
    })
  };
  
  // אומר ל-Jest להחליף את הפונקציה האמיתית בזיוף שלנו
  jest.mock('./supabase', () => ({
    getAuthenticatedSupabase: jest.fn(() => mockSupabase)
  }));
  
  describe('Database Methods (db.ts)', () => {
    const fakeToken = 'fake-clerk-token';
    const fakeUserId = 'user_123';
  
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('1. saveChatSession - Successfully saves data and returns true', async () => {
      // מדמה הצלחה בשמירה (אין שגיאה)
      mockUpsert.mockResolvedValue({ error: null });
  
      const result = await saveChatSession(fakeToken, 'session_1', fakeUserId, 'Test Title', []);
  
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions');
      expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'session_1',
        user_id: fakeUserId,
        title: 'Test Title'
      }));
    });
  
    it('2. getUserSubscriptionData - Handles new user (PGRST116) gracefully', async () => {
      // מדמה משתמש חדש שעוד אין לו שורה בטבלת פרופילים
      mockSingle.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Row not found' } 
      });
  
      const result = await getUserSubscriptionData(fakeToken, fakeUserId);
  
      // אנחנו מצפים שהוא לא יקרוס, אלא פשוט יחזיר null
      expect(result).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
    });
  
    it('3. createReferralCode - Fails if code is already taken by someone else', async () => {
      // מדמה מצב שהקוד המבוקש כבר תפוס על ידי משתמש אחר (user_999)
      mockSingle.mockResolvedValue({ 
        data: { user_id: 'user_999' }, 
        error: null 
      });
  
      const result = await createReferralCode(fakeToken, fakeUserId, 'NINJA');
  
      expect(result.success).toBe(false);
      expect(result.error).toBe('Code already taken');
      // מוודא שהפונקציה עצרה ולא ניסתה לשמור את הקוד
      expect(mockUpsert).not.toHaveBeenCalled(); 
    });
  
    it('4. createReferralCode - Succeeds if code is available', async () => {
      // מדמה מצב שהקוד פנוי (השאילתה לא מצאה כלום)
      mockSingle.mockResolvedValue({ data: null, error: null });
      // מדמה שמירה מוצלחת
      mockUpsert.mockResolvedValue({ error: null });
  
      const result = await createReferralCode(fakeToken, fakeUserId, 'NEW_CODE');
  
      expect(result.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
        referral_code: 'NEW_CODE'
      }));
    });
  
    it('5. deleteChatSession - Successfully calls delete on the correct table', async () => {
      mockEqDelete.mockResolvedValue({ error: null });
  
      const result = await deleteChatSession(fakeToken, 'session_1');
  
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions');
      expect(mockEqDelete).toHaveBeenCalledWith('id', 'session_1');
    });
  });