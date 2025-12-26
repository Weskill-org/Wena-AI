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

    if (!code || typeof code !== "string") {
      throw new Error("Code is required");
    }

    // Validate code format (alphanumeric, max 50 chars)
    const sanitizedCode = code.toUpperCase().trim();
    if (!/^[A-Z0-9]{1,50}$/.test(sanitizedCode)) {
      throw new Error("Invalid coupon code format");
    }

    // Use atomic UPDATE with RETURNING to prevent race conditions
    // This atomically checks is_redeemed=false AND sets it to true in one operation
    const { data: redeemedCoupon, error: redeemError } = await supabase
      .from("coupon_codes")
      .update({
        is_redeemed: true,
        redeemed_by: user.id,
        redeemed_at: new Date().toISOString(),
      })
      .eq("code", sanitizedCode)
      .eq("is_redeemed", false)
      .select("id, credits, code")
      .maybeSingle();

    if (redeemError) {
      console.error("Error redeeming coupon:", redeemError);
      throw new Error("Failed to redeem coupon");
    }

    if (!redeemedCoupon) {
      throw new Error("Invalid or already redeemed coupon code");
    }

    console.log(`Coupon ${sanitizedCode} redeemed by user ${user.id} for ${redeemedCoupon.credits} credits`);

    // Add credits to user's wallet
    const { error: walletError } = await supabase.rpc("add_credits", {
      user_id_param: user.id,
      credits_param: redeemedCoupon.credits,
    });

    if (walletError) {
      console.error("RPC add_credits failed, using fallback:", walletError);
      // Fallback: manually update wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("credits")
        .eq("user_id", user.id)
        .single();

      const { error: updateError } = await supabase
        .from("wallets")
        .update({ credits: (wallet?.credits || 0) + redeemedCoupon.credits })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Wallet update failed:", updateError);
        throw new Error("Failed to add credits to wallet");
      }
    }

    // Create transaction record
    const { error: transactionError } = await supabase.from("transactions").insert({
      user_id: user.id,
      amount: redeemedCoupon.credits,
      type: "earned",
      label: `Redeemed coupon: ${sanitizedCode}`,
    });

    if (transactionError) {
      console.error("Transaction record failed:", transactionError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        credits: redeemedCoupon.credits,
        message: `Successfully redeemed ${redeemedCoupon.credits} credits!`,
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
