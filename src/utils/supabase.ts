import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// הלקוח הרגיל והבסיסי (פחות נשתמש בו עכשיו)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


// הלקוח המאובטח שיודע לקבל את ה-Token מ-Clerk ולהזדהות מול השרת
export const getAuthenticatedSupabase = (clerkToken: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    },
  });
};