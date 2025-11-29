import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { moduleService } from "@/services/moduleService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, PlayCircle, CheckCircle, Lock } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useToast } from "@/components/ui/use-toast";

export default function ModuleView() {
    const { moduleId } = useParams<{ moduleId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [moduleData, setModuleData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!moduleId) return;

        const fetchDetails = async () => {
            try {
                const data = await moduleService.getModuleDetails(moduleId);
                setModuleData(data);
            } catch (error) {
                console.error("Error fetching module details:", error);
                toast({
                    title: "Error",
                    description: "Failed to load module details.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [moduleId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!moduleData) {
        return (
            <div className="container mx-auto py-8 px-4 text-center">
                <h1 className="text-2xl font-bold mb-4">Module not found</h1>
                <Button onClick={() => navigate("/modules")}>Back to Modules</Button>
            </div>
        );
    }

    const { module, chapters } = moduleData;

    return (
        <div className="container mx-auto py-8 px-4 pb-24">
            <Button variant="ghost" className="mb-6" onClick={() => navigate("/modules")}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Modules
            </Button>

            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">{module.title}</h1>
                <p className="text-muted-foreground">{module.description}</p>
            </div>

            <div className="space-y-6">
                {chapters.map((chapter: any) => (
                    <Card key={chapter.id}>
                        <CardHeader>
                            <CardTitle className="text-xl">{chapter.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">{chapter.description}</p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {chapter.lessons.map((lesson: any) => (
                                    <div
                                        key={lesson.id}
                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors border border-transparent hover:border-border"
                                        onClick={() => navigate(`/modules/${moduleId}/lessons/${lesson.id}`)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/10 p-2 rounded-full text-primary">
                                                <PlayCircle className="w-5 h-5" />
                                            </div>
                                            <span className="font-medium">{lesson.title}</span>
                                        </div>
                                        {/* Placeholder for lesson status */}
                                        <div className="text-sm text-muted-foreground">
                                            Start
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <BottomNav />
        </div>
    );
}
