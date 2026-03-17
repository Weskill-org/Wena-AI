import { motion } from "framer-motion";
import { Copy, Gift, Share2, Check } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function Referral() {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);

    const { data: referralCode, isLoading } = useQuery({
        queryKey: ['referralCode', user?.id],
        queryFn: async () => {
            // First try to get existing code
            const { data, error } = await supabase
                .from('referral_codes')
                .select('*')
                .eq('user_id', user!.id)
                .maybeSingle();
            
            if (error) throw error;
            
            // If no code exists, generate one
            if (!data) {
                const { data: newCode, error: genError } = await supabase
                    .rpc('generate_referral_code', { user_id_param: user!.id });
                
                if (genError) throw genError;
                
                // Insert the new referral code
                const { data: inserted, error: insertError } = await supabase
                    .from('referral_codes')
                    .insert({
                        user_id: user!.id,
                        referral_code: newCode,
                    })
                    .select()
                    .single();
                
                if (insertError) throw insertError;
                return inserted;
            }
            
            return data;
        },
        enabled: !!user?.id,
    });
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
        if (navigator.share) {
            navigator.share({
                title: 'Join me on Wena AI',
                text: 'Sign up with my referral code and get 100 bonus credits!',
                url: link,
            }).catch((error) => console.log('Error sharing', error));
        } else {
            navigator.clipboard.writeText(link);
            toast({
                title: "Link Copied!",
                description: "Referral link copied to clipboard",
            });
        }
    };

    return (
        <div className="min-h-screen pb-20 px-4 pt-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold mb-2">Refer & Earn</h1>
                <p className="text-muted-foreground">Invite friends and earn rewards together</p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-primary rounded-3xl p-8 mb-6 glow-primary text-center relative overflow-hidden"
            >
                <div className="relative z-10">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
                        <Gift className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Earn 50 Credits</h2>
                    <p className="text-white/80 mb-6">
                        For every friend who joins using your referral code
                    </p>

                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 mb-4">
                        <div className="text-white/60 text-sm mb-1 uppercase tracking-wider">Your Referral Code</div>
                        <div className="text-3xl font-mono font-bold text-white tracking-widest">
                            {referralCode?.referral_code || "LOADING"}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            onClick={copyReferralCode}
                            className="flex-1 bg-white text-primary hover:bg-white/90 border-0 font-semibold h-12 rounded-xl"
                        >
                            {copied ? <Check className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
                            {copied ? "Copied" : "Copy Code"}
                        </Button>
                        <Button
                            onClick={shareReferralLink}
                            className="flex-1 bg-white/20 text-white hover:bg-white/30 border-0 font-semibold h-12 rounded-xl"
                        >
                            <Share2 className="w-5 h-5 mr-2" />
                            Share
                        </Button>
                    </div>
                </div>

                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -ml-16 -mb-16"></div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h3 className="text-lg font-semibold mb-4">How it works</h3>
                <div className="space-y-4">
                    <div className="bg-surface/50 backdrop-blur-lg border border-border rounded-2xl p-4 flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">1</div>
                        <div>
                            <h4 className="font-semibold mb-1">Share your code</h4>
                            <p className="text-sm text-muted-foreground">Share your unique referral code with friends via WhatsApp, Email, or Social Media.</p>
                        </div>
                    </div>
                    <div className="bg-surface/50 backdrop-blur-lg border border-border rounded-2xl p-4 flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">2</div>
                        <div>
                            <h4 className="font-semibold mb-1">Friend signs up</h4>
                            <p className="text-sm text-muted-foreground">Your friend creates an account using your referral code.</p>
                        </div>
                    </div>
                    <div className="bg-surface/50 backdrop-blur-lg border border-border rounded-2xl p-4 flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">3</div>
                        <div>
                            <h4 className="font-semibold mb-1">You both earn</h4>
                            <p className="text-sm text-muted-foreground">You get 50 credits and your friend gets 100 bonus credits instantly!</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8"
            >
                <div className="bg-surface/50 backdrop-blur-lg border border-border rounded-2xl p-6 flex justify-between items-center">
                    <div>
                        <div className="text-lg font-bold">{referralCode?.total_referrals || 0}</div>
                        <div className="text-sm text-muted-foreground">Total Referred</div>
                    </div>
                    <div className="h-10 w-px bg-border"></div>
                    <div>
                        <div className="text-lg font-bold text-accent">{(referralCode?.total_referrals || 0) * 50}</div>
                        <div className="text-sm text-muted-foreground">Credits Earned</div>
                    </div>
                </div>
            </motion.div>

            <BottomNav />
        </div>
    );
}
