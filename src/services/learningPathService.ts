import { supabase } from "@/integrations/supabase/client";

export interface RoadmapItem {
  module_id: string;
  title: string;
  priority: "high" | "medium" | "recommended";
  reason: string;
  estimated_hours: number;
}

export interface LearningPath {
  id: string;
  user_id: string;
  roadmap: RoadmapItem[];
  summary: string | null;
  generated_at: string;
}

export const learningPathService = {
  async getLatestLearningPath(userId: string): Promise<LearningPath | null> {
    const { data, error } = await supabase
      .from('user_learning_paths')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return {
      ...data,
      roadmap: (data.roadmap as unknown as RoadmapItem[]) || [],
    };
  },

  async generateLearningPath(userId: string): Promise<LearningPath> {
    // Get user's modules and progress to build a roadmap
    const { data: modules } = await supabase
      .from('modules')
      .select('id, title, order_index')
      .eq('user_id', userId)
      .order('order_index');

    const { data: progress } = await supabase
      .from('user_module_progress')
      .select('module_id, completion_percentage')
      .eq('user_id', userId);

    const progressMap = new Map(
      (progress || []).map(p => [p.module_id, p.completion_percentage])
    );

    const roadmap: RoadmapItem[] = (modules || [])
      .map((m, idx) => {
        const completion = progressMap.get(m.id) || 0;
        let priority: "high" | "medium" | "recommended" = "recommended";
        if (completion > 0 && completion < 100) priority = "high";
        else if (completion === 0 && idx < 3) priority = "medium";

        return {
          module_id: m.id,
          title: m.title,
          priority,
          reason: completion > 0 ? `${completion}% complete - keep going!` : "Not started yet",
          estimated_hours: 2.5,
        };
      })
      .sort((a, b) => {
        const order = { high: 0, medium: 1, recommended: 2 };
        return order[a.priority] - order[b.priority];
      });

    const { data, error } = await supabase
      .from('user_learning_paths')
      .insert({
        user_id: userId,
        roadmap: roadmap as unknown as any,
        summary: `${roadmap.filter(r => r.priority === 'high').length} modules in progress`,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      roadmap: (data.roadmap as unknown as RoadmapItem[]) || [],
    };
  },
};
