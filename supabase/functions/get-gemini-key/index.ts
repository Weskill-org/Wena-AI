import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, model: modelName, mode, debug_user_id } = await req.json();

    // Default to global key
    const globalKey = Deno.env.get('VITE_GEMINI_API_KEY');
    let individualKey: string | null = null;

    // Attempt to fetch user-specific key
    try {
      // DEBUG: Allow testing specific users (Using Service Role to bypass RLS/Auth)
      if (typeof debug_user_id === 'string') {
        console.log('Debug mode: Fetching key for specific user:', debug_user_id);
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          { auth: { persistSession: false } }
        );

        const { data: profile } = await adminClient
          .from('profiles')
          .select('individual_gemini_key')
          .eq('id', debug_user_id)
          .single();

        if (profile?.individual_gemini_key) {
          console.log('Using individual API key for debug user:', debug_user_id);
          individualKey = profile.individual_gemini_key;
        }
      }

      // Standard Auth Flow
      const authHeader = req.headers.get('Authorization');

      // Always check for individual key if user is authenticated, regardless of global key presence
      if (authHeader && !individualKey) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: { headers: { Authorization: authHeader } },
            auth: { persistSession: false } // CRITICAL: Disable session persistence for Edge Functions
          }
        );

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

        if (userError) {
          console.warn('User Error:', userError);
        }

        if (user) {
          const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('individual_gemini_key')
            .eq('id', user.id)
            .single();

          if (profile?.individual_gemini_key) {
            console.log('Using individual API key for user:', user.id);
            individualKey = profile.individual_gemini_key;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch individual key, falling back to global:', err);
    }

    // Prioritize individual key, fallback to global
    const apiKey = individualKey || globalKey;

    if (!apiKey) {
      throw new Error('Gemini API key not configured (neither globally nor individually).');
    }

    // Mode 1: Retrieve Key (For Client-side WebSocket/Live API)
    if (mode === 'get_key') {
      return new Response(
        JSON.stringify({ apiKey: btoa(apiKey) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode 2: Chat Proxy (Default Secure Method for Text)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName || "gemini-2.5-flash" });

    const result = await model.generateContent(message);
    const response = await result.response;
    const generatedText = response.text();

    return new Response(
      JSON.stringify({ generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing Gemini request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
