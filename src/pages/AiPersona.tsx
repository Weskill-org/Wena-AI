import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function AiPersona() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [personaText, setPersonaText] = useState("");
    const [originalText, setOriginalText] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (user?.id) {
            fetchPersona();
        }
    }, [user?.id]);

    const fetchPersona = async () => {
        try {
            const { data, error } = await supabase
                .from('ai_personas')
                .select('persona_text')
                .eq('user_id', user?.id)
                .maybeSingle();

            if (error) throw error;
            if (data) {
                setPersonaText(data.persona_text || "");
                setOriginalText(data.persona_text || "");
            }
        } catch (error) {
            console.error('Error fetching persona:', error);
            toast.error("Failed to load persona");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user?.id) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('ai_personas')
                .upsert({
                    user_id: user.id,
                    persona_text: personaText,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;
            toast.success("Persona saved successfully");
            setOriginalText(personaText);
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving persona:', error);
            toast.error("Failed to save persona");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setPersonaText(originalText);
        setIsEditing(false);
    };

    return (
        <div className="min-h-screen pb-20 px-4 pt-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-10 h-10 rounded-xl bg-surface/50 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-surface transition-smooth"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold">AI Persona</h1>
                </div>

                <div className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Customize Your AI</h2>
                            <p className="text-sm text-muted-foreground">Define how your AI assistant should behave</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {isEditing ? (
                            <Textarea
                                value={personaText}
                                onChange={(e) => setPersonaText(e.target.value)}
                                placeholder="Enter instructions for your AI persona (e.g., 'You are a helpful coding assistant who prefers TypeScript...')"
                                className="min-h-[300px] bg-background/50 border-border resize-none focus:ring-primary"
                                disabled={loading}
                            />
                        ) : (
                            <div className="min-h-[300px] bg-background/30 border border-border rounded-md p-4 whitespace-pre-wrap">
                                {personaText || <span className="text-muted-foreground italic">No persona defined yet. Click edit to add one.</span>}
                            </div>
                        )}

                        <div className="flex gap-3">
                            {isEditing ? (
                                <>
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || loading}
                                        className="flex-1 bg-primary hover:bg-primary/90 text-white"
                                    >
                                        {saving ? "Saving..." : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Update Persona
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={handleCancel}
                                        variant="outline"
                                        disabled={saving || loading}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    onClick={() => setIsEditing(true)}
                                    disabled={loading}
                                    className="w-full bg-primary hover:bg-primary/90 text-white"
                                >
                                    Edit Persona
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
