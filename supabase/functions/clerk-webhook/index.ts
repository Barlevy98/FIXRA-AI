import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js"

Deno.serve(async (req) => {
  try {
    // מנתחים את הבקשה שמגיעה מ-Clerk
    const payload = await req.json();

    // אנחנו בודקים אם האירוע הוא "משתמש חדש נרשם"
    if (payload.type === 'user.created') {
      const userId = payload.data.id;
      const email = payload.data.email_addresses?.[0]?.email_address || '';
      
      // אנחנו מושכים את קוד ההפניה (השותף) שהאפליקציה שמרה בזמן ההרשמה
      const referredByCode = payload.data.unsafe_metadata?.referred_by || null;

      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. יוצרים למשתמש החדש פרופיל במסד הנתונים שלנו
        await supabase.from('user_profiles').upsert({
          user_id: userId,
          email: email,
          referred_by: referredByCode,
          updated_at: Date.now()
        });

        // 2. קסם השותפים: אם הוא הגיע דרך לינק של חבר/משפיען, נתגמל את המזמין!
        if (referredByCode) {
           // מחפשים למי שייך הקוד הזה
           const { data: referrer } = await supabase
             .from('user_profiles')
             .select('user_id, registered_invites_count')
             .eq('referral_code', referredByCode)
             .single();

           if (referrer) {
             // הופ! מוסיפים לו +1 לספירת החברים!
             await supabase
               .from('user_profiles')
               .update({ 
                 registered_invites_count: (referrer.registered_invites_count || 0) + 1,
                 updated_at: Date.now()
               })
               .eq('user_id', referrer.user_id);
               
             console.log(`[SUCCESS] Added +1 invite to referrer: ${referredByCode}`);
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