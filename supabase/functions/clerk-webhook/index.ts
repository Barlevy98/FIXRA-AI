import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js"

Deno.serve(async (req) => {
  try {
    const payload = await req.json();

    if (payload.type === 'user.created') {
      const userId = payload.data.id;
      const referredByCode = payload.data.unsafe_metadata?.referred_by || null;
      
      // 🌟 שולפים את השם מתוך הנתונים של קלארק (גם כשזה מגיע מגוגל)
      const firstName = payload.data.first_name || '';
      const lastName = payload.data.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Gamer';

      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 🌟 מכניסים את המשתמש החדש עם השם, והכי חשוב - עם הגבלת הודעה 1 בלבד!
        const { error } = await supabase.from('user_profiles').upsert({
          user_id: userId,
          referred_by: referredByCode,
          full_name: fullName,
          current_plan: 'Free',
          is_pro: false,
          cycle_limit: 1, // <--- הודעה 1 למשתמש חדש
          cycle_used_messages: 0,
          cycle_start_date: Date.now(),
          updated_at: Date.now()
        });

        if (error) {
          console.error("[FATAL DB ERROR] Failed to insert user:", error);
          return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        console.log(`[SUCCESS] User ${userId} (${fullName}) created in DB with 1 free message!`);

        if (referredByCode) {
           const { data: referrer } = await supabase
             .from('user_profiles')
             .select('user_id, registered_invites_count')
             .eq('referral_code', referredByCode)
             .single();

           if (referrer) {
             await supabase
               .from('user_profiles')
               .update({ 
                 registered_invites_count: (referrer.registered_invites_count || 0) + 1,
                 updated_at: Date.now()
               })
               .eq('user_id', referrer.user_id);
           }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})