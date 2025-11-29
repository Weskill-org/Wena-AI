import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, BookOpen, Clock, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { geminiLessonService } from "@/services/geminiLessonService";
import { moduleService } from "@/services/moduleService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface SuggestedModule {
    title: string;
    description: string;
    estimated_duration: number;
    credit_cost: number;
}

export default function AiModuleSuggestions({ onModuleCreated }: { onModuleCreated: () => void }) {
    const { user } = useAuth();
    const [suggestions, setSuggestions] = useState<SuggestedModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingId, setGeneratingId] = useState<number | null>(null);

    useEffect(() => {
        if (user?.id) {
            fetchSuggestions();
        }
    }, [user?.id]);

    const fetchSuggestions = async () => {
        try {
            // 1. Get User Persona
            const { data: personaData, error } = await supabase
                .from('ai_personas')
                .select('persona_text')
                .eq('user_id', user?.id)
                .maybeSingle();

            if (error) throw error;

            const persona = personaData?.persona_text || "A curious learner interested in technology and science.";

            // 2. Generate Suggestions
            const generatedSuggestions = await geminiLessonService.generateModuleSuggestions(persona);
            setSuggestions(generatedSuggestions);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
            toast.error("Failed to load AI suggestions");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateModule = async (module: SuggestedModule, index: number) => {
        setGeneratingId(index);
        try {
            toast.info("Generating curriculum... This may take a moment.");

            // 1. Get User Persona (again, to be safe)
            const { data: personaData } = await supabase
                .from('ai_personas')
                .select('persona_text')
                .eq('user_id', user?.id)
                .maybeSingle();

            const persona = personaData?.persona_text || "General learner";

            // 2. Generate Curriculum
            const curriculum = await geminiLessonService.generateCurriculum(module.title, persona);

            // 3. Create Module in DB
            await moduleService.createModuleWithCurriculum(module, curriculum);

            toast.success("Module created successfully!");
            onModuleCreated();

            // Remove from suggestions
            setSuggestions(prev => prev.filter((_, i) => i !== index));
        } catch (error) {
            console.error("Error creating module:", error);
            toast.error("Failed to create module");
        } finally {
            setGeneratingId(null);
        }
    };

    if (loading) {
        return (
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    <h2 className="text-xl font-bold">AI Suggestions</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="min-w-[300px] h-[200px] rounded-2xl bg-surface/50 animate-pulse border border-border" />
                    ))}
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) return null;

    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Recommended for You</h2>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {suggestions.map((module, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="min-w-[300px] max-w-[300px] bg-surface/50 backdrop-blur-lg border border-border rounded-2xl p-5 flex flex-col snap-start hover:border-primary/50 transition-colors"
                    >
                        <h3 className="font-bold text-lg mb-2 line-clamp-1" title={module.title}>{module.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">{module.description}</p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {module.estimated_duration}h
                            </div>
                            <div className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {module.credit_cost} credits
                            </div>
                        </div>

                        <Button
                            onClick={() => handleCreateModule(module, index)}
                            disabled={generatingId !== null}
                            className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                        >
                            {generatingId === index ? (
                                <span className="animate-pulse">Generating...</span>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add to Library
                                </>
                            )}
                        </Button>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
