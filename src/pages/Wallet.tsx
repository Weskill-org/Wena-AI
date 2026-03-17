import { motion } from "framer-motion";
import { Coins, Gift, TrendingUp, ChevronRight, Copy, Check } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { GradientButton } from "@/components/ui/gradient-button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { loadRazorpayScript } from "@/lib/razorpay";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Wallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("100");
  const [discountCode, setDiscountCode] = useState("");
  const [discountInfo, setDiscountInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .neq('type', 'ai_usage') // Filter out AI usage deductions
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: referralCode } = useQuery({
    queryKey: ['referralCode', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;
      // Auto-generate referral code if missing
      const { data: newCode, error: rpcError } = await supabase.rpc('generate_referral_code', { user_id_param: user!.id });
      if (rpcError) throw rpcError;
      const { data: inserted, error: insertError } = await supabase
        .from('referral_codes')
        .insert({ user_id: user!.id, referral_code: newCode })
        .select('*')
        .single();
      if (insertError) throw insertError;
      return inserted;
    },
    enabled: !!user?.id,
  });

  const redeemCouponMutation = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.functions.invoke('redeem-coupon', {
        body: { code },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: "Success!",
        description: data.message,
      });
      setRedeemDialogOpen(false);
      setCouponCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to redeem coupon",
        variant: "destructive",
      });
    },
  });

  const validateDiscountMutation = useMutation({
    mutationFn: async ({ code, amount }: { code: string; amount: number }) => {
      const { data, error } = await supabase.functions.invoke('validate-discount', {
        body: { code, amount },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.valid) {
        setDiscountInfo(data);
        toast({
          title: "Discount Applied!",
          description: `You saved ₹${data.discountAmount}`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Discount",
        description: error.message || "Discount code is invalid",
        variant: "destructive",
      });
      setDiscountCode("");
      setDiscountInfo(null);
    },
  });

  const handleRedeemCoupon = () => {
    if (!couponCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a coupon code",
        variant: "destructive",
      });
      return;
    }
    redeemCouponMutation.mutate(couponCode.trim().toUpperCase());
  };

  const handleValidateDiscount = () => {
    if (!discountCode.trim()) return;
    const amount = parseInt(selectedPlan);
    validateDiscountMutation.mutate({ code: discountCode.trim().toUpperCase(), amount });
  };

  const handleTopUp = async () => {
    try {
      const amount = parseInt(selectedPlan);
      const credits = amount; // 1:1 ratio

      const { data: orderData, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount,
          credits,
          discountCode: discountCode || null
        },
      });

      if (error) throw error;

      const res = await loadRazorpayScript();

      if (!res) {
        toast({
          title: "Error",
          description: "Razorpay SDK failed to load. Please check your internet connection.",
          variant: "destructive",
        });
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount * 100,
        currency: orderData.currency,
        name: "WeSkill",
        description: `Purchase ${credits} Credits`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'verify-razorpay-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  paymentOrderId: orderData.paymentOrderId,
                },
              }
            );

            if (verifyError) throw verifyError;

            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast({
              title: "Payment Successful!",
              description: verifyData.message,
            });
            setTopUpDialogOpen(false);
            setDiscountCode("");
            setDiscountInfo(null);
          } catch (error: any) {
            toast({
              title: "Payment Verification Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        },
        prefill: {
          email: user?.email,
        },
        theme: {
          color: "#8B5CF6",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
    }
  };

  const copyReferralCode = () => {
    if (referralCode?.referral_code) {
      navigator.clipboard.writeText(referralCode.referral_code);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareReferralLink = () => {
    const link = `${window.location.origin}/login?ref=${referralCode?.referral_code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  return (
    <>
      <div className="min-h-screen pb-24 safe-area-top">
        {/* Header */}
        <div className="px-4 pt-6 pb-4">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
          >
            Wallet
          </motion.h1>
        </div>

        <div className="px-4 space-y-4">
          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-accent rounded-3xl p-5 glow-accent relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-white/70 text-xs mb-1">Total Balance</p>
                  <h1 className="text-4xl font-bold text-white">{wallet?.credits || 0}</h1>
                  <p className="text-white/70 text-xs mt-1">Credits</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Coins className="w-7 h-7 text-white" />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setRedeemDialogOpen(true)}
                  className="flex-1 h-10 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium text-sm flex items-center justify-center gap-2 active-scale"
                >
                  <Gift className="w-4 h-4" />
                  Redeem
                </button>
                <button
                  onClick={() => setTopUpDialogOpen(true)}
                  className="flex-1 h-10 rounded-xl bg-white text-accent font-medium text-sm flex items-center justify-center gap-2 active-scale"
                >
                  <TrendingUp className="w-4 h-4" />
                  Top Up
                </button>
              </div>
            </div>

            {/* Decorative */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          </motion.div>

          {/* Referral Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-primary rounded-2xl p-4 glow-primary"
          >
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-white font-semibold text-sm">Refer & Earn</h3>
                <p className="text-white/70 text-xs">Get 50 credits per friend</p>
              </div>
              <div className="bg-white/20 px-2 py-1 rounded-lg">
                <span className="text-white text-xs font-medium">{referralCode?.total_referrals || 0} referrals</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 flex justify-between items-center">
                <code className="text-white font-mono font-semibold text-sm">
                  {referralCode?.referral_code || "Loading..."}
                </code>
                <button
                  onClick={copyReferralCode}
                  className="text-white text-xs font-semibold flex items-center gap-1 active-scale"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                onClick={shareReferralLink}
                className="w-full h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium active-scale"
              >
                Share Referral Link
              </button>
            </div>
          </motion.div>

          {/* Transaction History */}
          <div>
            <h2 className="text-base font-semibold mb-3">Recent Transactions</h2>
            {!transactions || transactions.length === 0 ? (
              <div className="glass border border-border rounded-2xl p-6 text-center">
                <span className="text-3xl block mb-2">📭</span>
                <p className="text-muted-foreground text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + index * 0.03 }}
                    className="glass border border-border rounded-2xl p-3 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tx.type === "earned" ? "bg-accent/20" : "bg-destructive/20"
                        }`}>
                        {tx.type === "earned" ? (
                          <TrendingUp className="w-4 h-4 text-accent" />
                        ) : (
                          <Coins className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{tx.label}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className={`text-base font-bold ${tx.type === "earned" ? "text-accent" : "text-destructive"
                      }`}>
                      {tx.type === "earned" ? "+" : "-"}{Math.abs(tx.amount)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <BottomNav />

        {/* Redeem Coupon Dialog */}
        <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Redeem Credit Code</DialogTitle>
              <DialogDescription>
                Enter your credit code to add credits to your wallet
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="coupon">Credit Code</Label>
                <Input
                  id="coupon"
                  placeholder="Enter code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRedeemDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRedeemCoupon}
                disabled={redeemCouponMutation.isPending}
              >
                {redeemCouponMutation.isPending ? "Redeeming..." : "Redeem"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Top Up Dialog */}
        <Dialog open={topUpDialogOpen} onOpenChange={setTopUpDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Top Up Credits</DialogTitle>
              <DialogDescription>
                Choose a plan and complete payment to add credits
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Plan</Label>
                <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="100" id="plan1" />
                    <Label htmlFor="plan1" className="flex-1 cursor-pointer">
                      <div className="font-semibold">100 Credits</div>
                      <div className="text-sm text-muted-foreground">₹100</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="500" id="plan2" />
                    <Label htmlFor="plan2" className="flex-1 cursor-pointer">
                      <div className="font-semibold">500 Credits</div>
                      <div className="text-sm text-muted-foreground">₹500</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="1000" id="plan3" />
                    <Label htmlFor="plan3" className="flex-1 cursor-pointer">
                      <div className="font-semibold">1000 Credits</div>
                      <div className="text-sm text-muted-foreground">₹1000</div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount">Discount Code (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="discount"
                    placeholder="Enter discount code"
                    value={discountCode}
                    onChange={(e) => {
                      setDiscountCode(e.target.value.toUpperCase());
                      setDiscountInfo(null);
                    }}
                    className="uppercase"
                  />
                  <Button
                    variant="outline"
                    onClick={handleValidateDiscount}
                    disabled={!discountCode || validateDiscountMutation.isPending}
                  >
                    Apply
                  </Button>
                </div>
                {discountInfo && (
                  <div className="text-sm text-green-600">
                    Discount: -₹{discountInfo.discountAmount} | Final: ₹{discountInfo.finalAmount}
                  </div>
                )}
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span>Subtotal:</span>
                  <span>₹{selectedPlan}</span>
                </div>
                {discountInfo && (
                  <div className="flex justify-between text-sm text-green-600 mb-1">
                    <span>Discount:</span>
                    <span>-₹{discountInfo.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total:</span>
                  <span>₹{discountInfo ? discountInfo.finalAmount : selectedPlan}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setTopUpDialogOpen(false);
                setDiscountCode("");
                setDiscountInfo(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleTopUp}>
                Proceed to Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div >
    </>
  );
}
