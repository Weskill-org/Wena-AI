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
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { code, amount } = await req.json();

    if (!code || !amount) {
      throw new Error("Code and amount are required");
    }

    const { data: discount, error } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !discount) {
      throw new Error("Invalid or inactive discount code");
    }

    if (amount < discount.min_cart_value) {
      throw new Error(`Minimum cart value is ₹${discount.min_cart_value}`);
    }

    let discountAmount = 0;
    if (discount.discount_type === "percentage") {
      discountAmount = Math.min(
        Math.floor((amount * discount.discount_value) / 100),
        discount.max_discount || Infinity
      );
    } else {
      discountAmount = discount.discount_value;
    }

    const finalAmount = amount - discountAmount;

    return new Response(
      JSON.stringify({
        valid: true,
        discountAmount,
        finalAmount,
        discountType: discount.discount_type,
        discountValue: discount.discount_value,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in validate-discount:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ valid: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});