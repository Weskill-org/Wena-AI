import { ModuleWithProgress } from "@/types/module";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, Unlock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  module: ModuleWithProgress;
  onUnlock: (moduleId: string, cost: number) => void;
  isUnlocking: boolean;
}

export function ModuleCard({ module, onUnlock, isUnlocking }: ModuleCardProps) {
  const navigate = useNavigate();
  const isUnlocked = module.progress?.unlocked;
  const progress = module.progress?.completion_percentage || 0;

  const handleClick = () => {
    if (isUnlocked) {
      navigate(`/modules/${module.id}`, { state: { startCurriculum: true } });
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "glass border border-border rounded-2xl p-4 transition-all active-scale",
        isUnlocked ? "cursor-pointer active:scale-[0.98]" : "cursor-default",
        !isUnlocked && "opacity-90"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
          isUnlocked ? "bg-gradient-primary" : "bg-muted"
        )}>
          {isUnlocked ? (
            <Unlock className="w-5 h-5 text-white" />
          ) : (
            <Lock className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{module.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {module.description}
              </p>
            </div>
            
            {/* Status Badge */}
            <div className={cn(
              "px-2 py-1 rounded-lg text-[10px] font-medium flex-shrink-0",
              isUnlocked 
                ? "bg-accent/20 text-accent" 
                : "bg-muted text-muted-foreground"
            )}>
              {isUnlocked ? "Unlocked" : `${module.credit_cost} Credits`}
            </div>
          </div>

          {/* Progress Section */}
          <div className="mt-3">
            {isUnlocked ? (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Progress value={progress} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {progress}%
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ) : (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnlock(module.id, module.credit_cost);
                }}
                disabled={isUnlocking}
                className="w-full h-9 text-xs font-semibold bg-gradient-primary hover:opacity-90 border-0"
              >
                {isUnlocking ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 mr-1.5" />
                    Unlock Module
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
