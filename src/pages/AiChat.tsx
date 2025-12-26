import VoiceMode from "@/components/ui/VoiceMode";
import { BottomNav } from "@/components/layout/BottomNav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Coins } from "lucide-react";

export default function AiChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const credits = wallet?.credits || 0;

  const { data: persona } = useQuery({
    queryKey: ['persona', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_personas')
        .select('persona_text')
        .eq('user_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const personaText = persona?.persona_text || "";

  const deductUsageMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || credits <= 0) return;

      // Use secure RPC function instead of direct update
      const { error } = await supabase.rpc('deduct_ai_credits', { amount: 1 });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (error) => {
      console.error("Failed to deduct credit:", error);
      toast.error("Failed to process credit deduction");
    }
  });

  const handleDeductCredit = () => {
    deductUsageMutation.mutate();
  };

  return (
    <div className="h-screen flex flex-col bg-background safe-area-top safe-area-bottom">
      {/* Voice Mode Container */}
      <div className="flex-1 relative overflow-hidden">
        <VoiceMode
          onDeductCredit={handleDeductCredit}
          hasCredits={credits > 0}
          personaContext={personaText}
        />

        {/* Credit Display */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 z-20"
        >
          <div className="glass border border-border/50 px-3 py-1.5 rounded-full flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-medium text-foreground">{credits}</span>
          </div>
        </motion.div>
      </div>
      
      <BottomNav />
    </div>
  );
}
