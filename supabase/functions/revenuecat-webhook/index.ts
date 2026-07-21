import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js"

Deno.serve(async (req) => {
  try {
    // 🛡️ חסימת אבטחה: אימות חתימה מ-RevenueCat 🛡️
    const authHeader = req.headers.get('Authorization');
    const RC_WEBHOOK_SECRET = Deno.env.get('RC_WEBHOOK_SECRET');

    // בודקים אם חסרה סיסמה או אם הסיסמה לא תואמת (מצפים לפורמט: Bearer YOUR_SECRET)
    if (!RC_WEBHOOK_SECRET || authHeader !== `Bearer ${RC_WEBHOOK_SECRET}`) {
      console.warn("🚨 Unauthorized Webhook Attempt Blocked!");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const payload = await req.json();
    const event = payload.event;

    if (!event) {
      return new Response(JSON.stringify({ error: 'No event data received' }), { status: 400 });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
       throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const eventType = event.type; 
    const userId = event.app_user_id; 
    const productId = event.product_id; 
    const price = event.price || 0; 

    // ==========================================
    // תסריט א': הלקוח שילם (קנייה חדשה או חידוש)
    // ==========================================
    if (eventType === 'INITIAL_PURCHASE' || eventType === 'RENEWAL') {
      
      // מגדירים את הלימיט בהתאם לחבילה שנקנתה/חודשה
      let limit = 3;
      if (productId === 'PRO_monthly' || productId === 'PRO_onetime') limit = 50;
      if (productId === 'PREMIUM') limit = 500;

      await supabase
        .from('user_profiles')
        .update({ 
          is_pro: true, 
          current_plan: productId,
          cycle_limit: limit,          // הוספנו: עדכון הלימיט בהתאם לחבילה
          cycle_used_messages: 0,      // הוספנו: איפוס ההודעות שהשתמש בהן
          cycle_start_date: Date.now(),// הוספנו: תחילת מחזור חדש מהיום!
          updated_at: Date.now() 
        })
        .eq('user_id', userId);

      await supabase
        .from('payment_logs')
        .insert({
          user_id: userId,
          amount: price,
          event_type: eventType, 
          currency: event.currency || 'USD'
        });

      console.log(`[SUCCESS] User ${userId} upgraded to ${productId} with limit ${limit}`);
    }
    
    // ==========================================
    // תסריט ב': הלקוח ביטל מנוי או שהמנוי פג תוקף (גם בטסטים של אפל)
    // ==========================================
    if (eventType === 'CANCELLATION' || eventType === 'EXPIRATION') {
      
      await supabase
        .from('user_profiles')
        .update({ 
          is_pro: false, 
          current_plan: 'Free',
          cycle_limit: 3,              // התיקון הקריטי: מחזירים אותו ל-3 הודעות
          cycle_used_messages: 0,      // התיקון הקריטי: מאפסים לו את המונה
          cycle_start_date: Date.now(),// התיקון הקריטי: מתחילים טיימר של 24 שעות מהרגע שבוטל!
          updated_at: Date.now() 
        })
        .eq('user_id', userId);
        
      console.log(`[INFO] User ${userId} downgraded to Free with limit 3`);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})