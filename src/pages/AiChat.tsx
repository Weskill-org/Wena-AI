import VoiceMode from "@/components/ui/VoiceMode";
import { BottomNav } from "@/components/layout/BottomNav";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function AiChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's wallet to get credits
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

  // Fetch user's persona
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

  // Mutation to deduct purchase usage
  const deductUsageMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || credits <= 0) return;

      // Use secure RPC to deduct credits and log transaction
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
    <div className="h-screen flex flex-col bg-black">
      <div className="flex-1 relative overflow-hidden">
        <VoiceMode
          onDeductCredit={handleDeductCredit}
          hasCredits={credits > 0}
          personaContext={personaText}
        />

        {/* Credit Display (Optional Overlay) */}
        <div className="absolute top-4 left-4 z-20 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
          <span className="text-xs font-medium text-white">Credits: {credits}</span>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
