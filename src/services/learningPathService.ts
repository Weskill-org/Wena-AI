import { supabase } from "@/integrations/supabase/client";
import { sendMessageToGemini } from "@/lib/gemini";

export interface RoadmapItem {
    module_id: string;
    order: number;
    priority: "high" | "recommended" | "later";
    estimated_days: number;
    reason: string;
    // hydrated on the frontend:
    title?: string;
    description?: string | null;
    progress?: number;
}

export interface LearningPath {
    id: string;
    user_id: string;
    generated_at: string;
    roadmap: RoadmapItem[];
    summary: string;
    total_estimated_days: number;
}

export const learningPathService = {
    async getLatestLearningPath(userId: string): Promise<LearningPath | null> {
        // @ts-ignore
        const { data, error } = await supabase
            .from("user_learning_paths")
            .select("*")
            .eq("user_id", userId)
            .order("generated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return (data as unknown) as LearningPath | null;
    },

    async generateLearningPath(userId: string): Promise<LearningPath> {
        // 1. Fetch persona details
        const { data: persona } = await supabase
            .from("ai_personas")
            .select("persona_text, learning_goals, skill_level, weekly_hours, interests")
            .eq("user_id", userId)
            .maybeSingle() as any;

        // Fetch user name for personalization
        const { data: { user } } = await supabase.auth.getUser();
        const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Student";

        // 2. Fetch modules with progress
        const { data: modules, error: modErr } = await supabase
            .from("modules" as any)
            .select("id, title, description, order_index")
            .eq("user_id", userId)
            .order("order_index", { ascending: true });

        if (modErr) throw modErr;

        const { data: progress } = await supabase
            .from("user_module_progress" as any)
            .select("module_id, completion_percentage, unlocked")
            .eq("user_id", userId);

        const progressMap: Record<string, any> = {};
        (progress as any[] ?? []).forEach((p: any) => {
            progressMap[p.module_id] = p;
        });

        const modulesWithProgress = (modules as any[] ?? [])
            .filter((m: any) => {
                const p = progressMap[m.id];
                // Exclude fully completed modules
                return !p || p.completion_percentage < 100;
            })
            .map((m: any) => ({
                id: m.id,
                title: m.title,
                description: m.description,
                progress_pct: progressMap[m.id]?.completion_percentage ?? 0,
                unlocked: progressMap[m.id]?.unlocked ?? false,
            }));

        // 3. Build prompt
        const prompt = `You are a personalized learning advisor for Wena AI e-learning platform.
Your student is named ${userName}.

User Profile:
- Learning Goals: ${persona?.learning_goals ?? "General learning"}
- Skill Level: ${persona?.skill_level ?? "Not specified"}
- Weekly Hours Available: ${persona?.weekly_hours ?? "Not specified"}
- Topics of Interest: ${Array.isArray(persona?.interests) ? persona.interests.join(", ") : (persona?.interests ?? "Not specified")}
- Additional Persona Info: ${persona?.persona_text ?? "None"}

Available Modules (these are the only modules available to the user, not yet 100% complete):
${JSON.stringify(modulesWithProgress, null, 2)}

Task: Generate a personalized learning roadmap. 
- Order modules by what the user should do FIRST based on their goals, skill level, and current progress.
- Modules already in progress (progress_pct > 0) should come first.
- Then modules matching goals/interests.
- Keep reasons concise (max 1 sentence) and very encouraging, addressing them as ${userName}.
- Estimated days assumes 30 min/day of study.
- Calculate a "total_estimated_days" which is a realistic sum of all modules in the roadmap.

Return ONLY valid JSON (no markdown, no explanation):
{
  "summary": "2-3 sentence warm, personalized message addressing the user as ${userName} directly about their learning journey",
  "total_estimated_days": 15,
  "roadmap": [
    {
      "module_id": "the module uuid",
      "order": 1,
      "priority": "high",
      "estimated_days": 4,
      "reason": "Short reason why this module fits their goals"
    }
  ]
}

priority values: "high" (must do soon), "recommended" (good next step), "later" (nice to have).`;

        // 4. Call Gemini
        const responseText = await sendMessageToGemini(prompt, "gemini-2.5-flash");
        const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        const roadmap: RoadmapItem[] = (parsed.roadmap ?? []).map((item: any) => {
            const mod = (modules as any[])?.find((m: any) => m.id === item.module_id);
            return {
                module_id: item.module_id,
                order: item.order,
                priority: item.priority ?? "recommended",
                estimated_days: item.estimated_days ?? 3,
                reason: item.reason ?? "",
                title: mod?.title ?? "Unknown Module",
                description: mod?.description ?? null,
                progress: progressMap[item.module_id]?.completion_percentage ?? 0,
            };
        });

        const summary: string = parsed.summary ?? "Your personalized learning path is ready!";
        const total_estimated_days: number = parsed.total_estimated_days ?? roadmap.reduce((acc, curr) => acc + curr.estimated_days, 0);

        // 5. Save to DB (delete old ones first to keep it tidy)
        await supabase
            .from("user_learning_paths" as any)
            .delete()
            .eq("user_id", userId);

        const { data: saved, error: saveErr } = await supabase
            .from("user_learning_paths" as any)
            .insert({
                user_id: userId,
                roadmap: roadmap as any,
                summary,
                total_estimated_days,
            } as any)
            .select()
            .single();

        if (saveErr) throw saveErr;

        return {
            ...(saved as any),
            roadmap,
            summary,
            total_estimated_days,
        } as LearningPath;
    },
};

