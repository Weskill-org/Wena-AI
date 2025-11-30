import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { code } = await req.json();

    if (!code) {
      throw new Error("Code is required");
    }

    // Check if coupon exists and is not redeemed
    const { data: coupon, error: couponError } = await supabase
      .from("coupon_codes")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_redeemed", false)
      .single();

    if (couponError || !coupon) {
      throw new Error("Invalid or already redeemed coupon code");
    }

    // Mark coupon as redeemed
    const { error: updateError } = await supabase
      .from("coupon_codes")
      .update({
        is_redeemed: true,
        redeemed_by: user.id,
        redeemed_at: new Date().toISOString(),
      })
      .eq("id", coupon.id);

    if (updateError) {
      console.error("Error updating coupon:", updateError);
      throw new Error("Failed to redeem coupon");
    }

    // Add credits to user's wallet
    const { error: walletError } = await supabase.rpc("add_credits", {
      user_id_param: user.id,
      credits_param: coupon.credits,
    });

    if (walletError) {
      // If adding credits fails, we need to manually update
      const { data: wallet } = await supabase
        .from("wallets")
        .select("credits")
        .eq("user_id", user.id)
        .single();

      await supabase
        .from("wallets")
        .update({ credits: (wallet?.credits || 0) + coupon.credits })
        .eq("user_id", user.id);
    }

    // Create transaction record
    await supabase.from("transactions").insert({
      user_id: user.id,
      amount: coupon.credits,
      type: "earned",
      label: `Redeemed coupon: ${code}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        credits: coupon.credits,
        message: `Successfully redeemed ${coupon.credits} credits!`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in redeem-coupon:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});