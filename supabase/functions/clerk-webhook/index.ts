import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js"

Deno.serve(async (req) => {
  try {
    const payload = await req.json();

    if (payload.type === 'user.created') {
      const userId = payload.data.id;
      const referredByCode = payload.data.unsafe_metadata?.referred_by || null;

      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // הסרנו לחלוטין את הניסיון להכניס את האימייל לטבלה
        const { error } = await supabase.from('user_profiles').upsert({
          user_id: userId,
          referred_by: referredByCode,
          updated_at: Date.now()
        });

        if (error) {
          console.error("[FATAL DB ERROR] Failed to insert user:", error);
          return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        console.log(`[SUCCESS] User ${userId} created in DB!`);

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