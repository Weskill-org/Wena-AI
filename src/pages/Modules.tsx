import { useEffect, useState } from "react";
import { moduleService } from "@/services/moduleService";
import { ModuleWithProgress } from "@/types/module";
import { ModuleCard } from "@/components/modules/ModuleCard";
import AiModuleSuggestions from "@/components/modules/AiModuleSuggestions";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/layout/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";

export default function Modules() {
  const [modules, setModules] = useState<ModuleWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const fetchModules = async () => {
    try {
      const data = await moduleService.getModules();
      setModules(data);
    } catch (error) {
      console.error("Error fetching modules:", error);
      toast({
        title: "Error",
        description: "Failed to load modules. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleUnlock = async (moduleId: string, cost: number) => {
    setUnlockingId(moduleId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to unlock modules.",
          variant: "destructive",
        });
        return;
      }

      await moduleService.unlockModule(moduleId, user.id, cost);

      toast({
        title: "Success!",
        description: "Module unlocked successfully.",
      });

      await fetchModules();
    } catch (error: any) {
      console.error("Error unlocking module:", error);
      toast({
        title: "Unlock Failed",
        description: error.message || "Could not unlock module. Check your credits.",
        variant: "destructive",
      });
    } finally {
      setUnlockingId(null);
    }
  };

  const filteredModules = modules.filter(module =>
    module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 safe-area-top">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 z-40 bg-gradient-to-b from-background via-background to-transparent">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold mb-1">Learning Modules</h1>
          <p className="text-sm text-muted-foreground">Unlock modules to advance your skills</p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-11 rounded-xl bg-surface border-border"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </motion.div>
      </div>

      <div className="px-4 space-y-4">
        {/* AI Suggestions */}
        {/* <AiModuleSuggestions onModuleCreated={fetchModules} />  */ }

        {/* Modules Grid */}
        <AnimatePresence mode="popLayout">
          {filteredModules.length > 0 ? (
            <motion.div 
              className="grid grid-cols-1 gap-3"
              layout
            >
              {filteredModules.map((module, index) => (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <ModuleCard
                    module={module}
                    onUnlock={handleUnlock}
                    isUnlocking={unlockingId === module.id}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass border border-border rounded-2xl p-8 text-center"
            >
              <span className="text-4xl block mb-3">📚</span>
              <p className="text-muted-foreground">
                {searchQuery ? "No modules found" : "No modules available yet"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
