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

    const { amount, credits, discountCode } = await req.json();

    if (!amount || !credits) {
      throw new Error("Amount and credits are required");
    }

    let finalAmount = amount;
    let discountApplied = 0;
    let discountCodeUsed = null;

    // Apply discount if provided
    if (discountCode) {
      const { data: discount } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discountCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (discount && amount >= discount.min_cart_value) {
        if (discount.discount_type === "percentage") {
          discountApplied = Math.min(
            Math.floor((amount * discount.discount_value) / 100),
            discount.max_discount || Infinity
          );
        } else {
          discountApplied = discount.discount_value;
        }
        finalAmount = amount - discountApplied;
        discountCodeUsed = discount.code;
      }
    }

    // Create Razorpay order
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: finalAmount * 100, // Razorpay expects amount in paise
        currency: "INR",
        receipt: `order_${Date.now()}`,
      }),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("Razorpay error:", errorText);
      throw new Error("Failed to create Razorpay order");
    }

    const razorpayOrder = await razorpayResponse.json();

    // Store order in database
    const { data: paymentOrder, error: orderError } = await supabase
      .from("payment_orders")
      .insert({
        user_id: user.id,
        amount: finalAmount,
        credits: credits,
        discount_applied: discountApplied,
        discount_code: discountCodeUsed,
        status: "pending",
        razorpay_order_id: razorpayOrder.id,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating payment order:", orderError);
      throw new Error("Failed to create payment order");
    }

    return new Response(
      JSON.stringify({
        orderId: razorpayOrder.id,
        amount: finalAmount,
        currency: "INR",
        keyId: razorpayKeyId,
        paymentOrderId: paymentOrder.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in create-razorpay-order:", error);
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