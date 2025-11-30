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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentOrderId } =
      await req.json();

    // Verify signature
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(razorpayKeySecret);
    const messageData = encoder.encode(text);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const generatedSignature = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (generatedSignature !== razorpay_signature) {
      throw new Error("Invalid payment signature");
    }

    // Get payment order details
    const { data: paymentOrder, error: orderError } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("id", paymentOrderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !paymentOrder) {
      throw new Error("Payment order not found");
    }

    // Update payment order
    await supabase
      .from("payment_orders")
      .update({
        status: "completed",
        payment_id: razorpay_payment_id,
      })
      .eq("id", paymentOrderId);

    // Add credits to wallet
    const { data: wallet } = await supabase
      .from("wallets")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    await supabase
      .from("wallets")
      .update({ credits: (wallet?.credits || 0) + paymentOrder.credits })
      .eq("user_id", user.id);

    // Create transaction record
    await supabase.from("transactions").insert({
      user_id: user.id,
      amount: paymentOrder.credits,
      type: "earned",
      label: `Purchased ${paymentOrder.credits} credits`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        credits: paymentOrder.credits,
        message: `Successfully added ${paymentOrder.credits} credits!`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in verify-razorpay-payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});