import { useEffect, useState } from "react";
import { moduleService } from "@/services/moduleService";
import { ModuleWithProgress } from "@/types/module";
import { ModuleCard } from "@/components/modules/ModuleCard";
import AiModuleSuggestions from "@/components/modules/AiModuleSuggestions";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/layout/BottomNav";

export default function Modules() {
  const [modules, setModules] = useState<ModuleWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
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

      // Refresh modules to update state
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Learning Modules</h1>
        <p className="text-muted-foreground">Unlock modules to advance your AI skills.</p>
      </div>

      <AiModuleSuggestions onModuleCreated={fetchModules} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            onUnlock={handleUnlock}
            isUnlocking={unlockingId === module.id}
          />
        ))}
      </div>

      {modules.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No modules available yet.</p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
