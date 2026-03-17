import { supabase } from "@/integrations/supabase/client";

export interface RoadmapItem {
  module_id: string;
  title: string;
  priority: "high" | "medium" | "recommended";
  reason: string;
  estimated_hours: number;
  estimated_days: number;
  order: number;
  description?: string;
  progress?: number;
}

export interface LearningPath {
  id: string;
  user_id: string;
  roadmap: RoadmapItem[];
  summary: string | null;
  generated_at: string;
  total_estimated_days: number;
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
    const roadmap = (data.roadmap as unknown as RoadmapItem[]) || [];
    return {
      ...data,
      roadmap,
      total_estimated_days: roadmap.reduce((sum, r) => sum + (r.estimated_days || 0), 0),
    };
  },

  async generateLearningPath(userId: string): Promise<LearningPath> {
    const { data: modules } = await supabase
      .from('modules')
      .select('id, title, description, order_index')
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
          description: m.description || undefined,
          priority,
          reason: completion > 0 ? `${completion}% complete - keep going!` : "Not started yet",
          estimated_hours: 2.5,
          estimated_days: Math.ceil(2.5),
          order: idx + 1,
          progress: completion,
        };
      })
      .sort((a, b) => {
        const order = { high: 0, medium: 1, recommended: 2 };
        return order[a.priority] - order[b.priority];
      })
      .map((item, idx) => ({ ...item, order: idx + 1 }));

    const totalDays = roadmap.reduce((sum, r) => sum + r.estimated_days, 0);

    const { data, error } = await supabase
      .from('user_learning_paths')
      .insert({
        user_id: userId,
        roadmap: roadmap as unknown as any,
        summary: `${roadmap.filter(r => r.priority === 'high').length} modules in progress, ~${totalDays} days to complete all`,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      roadmap: (data.roadmap as unknown as RoadmapItem[]) || [],
      total_estimated_days: totalDays,
    };
  },
};
