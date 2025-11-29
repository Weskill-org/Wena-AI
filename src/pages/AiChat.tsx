import VoiceMode from "@/components/ui/VoiceMode";
import { BottomNav } from "@/components/layout/BottomNav";
import { useState } from "react";
import { toast } from "sonner";

export default function AiChat() {
  // Simulation of user credits
  const [credits, setCredits] = useState(100);

  const handleDeductCredit = () => {
    if (credits > 0) {
      setCredits((prev) => prev - 1);
      // toast.success("Credit deducted for voice session");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-black">
      <div className="flex-1 relative overflow-hidden">
        <VoiceMode
          onDeductCredit={handleDeductCredit}
          hasCredits={credits > 0}
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
