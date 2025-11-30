import { ModuleWithProgress } from "@/types/module";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, Unlock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface ModuleCardProps {
    module: ModuleWithProgress;
    onUnlock: (moduleId: string, cost: number) => void;
    isUnlocking: boolean;
}

export function ModuleCard({ module, onUnlock, isUnlocking }: ModuleCardProps) {
    const navigate = useNavigate();
    const isUnlocked = module.progress?.unlocked;
    const progress = module.progress?.completion_percentage || 0;

    return (
        <Card className={`w-full transition-all hover:shadow-md ${!isUnlocked ? "opacity-90" : ""}`}>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold">{module.title}</CardTitle>
                    {isUnlocked ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                            <Unlock className="w-3 h-3 mr-1" /> Unlocked
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600">
                            <Lock className="w-3 h-3 mr-1" /> Locked
                        </Badge>
                    )}
                </div>
                <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                    {isUnlocked ? (
                        <span className="flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" /> Access Granted
                        </span>
                    ) : (
                        <span className="font-medium text-amber-600">Cost: {module.credit_cost} Credits</span>
                    )}
                </div>
                {!isUnlocked ? (
                    <Button
                        onClick={() => onUnlock(module.id, module.credit_cost)}
                        disabled={isUnlocking}
                        variant="default"
                    >
                        {isUnlocking ? "Unlocking..." : "Unlock Module"}
                    </Button>
                ) : (
                    <Button
                        variant="secondary"
                        onClick={() => navigate(`/modules/${module.id}`, { state: { startCurriculum: true } })}
                    >
                        Continue Learning
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
