import { supabase } from "@/integrations/supabase/client";
import { ModuleWithProgress } from "@/types/module";

export const moduleService = {
    async getModules(): Promise<ModuleWithProgress[]> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return [];

        const { data: modules, error: modulesError } = await supabase
            .from("modules" as any)
            .select("*")
            .eq("user_id", user.id)
            .order("order_index", { ascending: true });

        if (modulesError) throw modulesError;

        const { data: progress, error: progressError } = await supabase
            .from("user_module_progress" as any)
            .select("*")
            .eq("user_id", user.id);

        if (progressError) throw progressError;

        return (modules as any[]).map((module) => ({
            ...module,
            progress: (progress as any[])?.find((p) => p.module_id === module.id),
        }));
    },

    async unlockModule(moduleId: string, userId: string, cost: number): Promise<void> {
<<<<<<< Updated upstream
        // 1. Deduct credits using secure RPC function (handles validation & transaction logging)
        const { error: deductError } = await supabase.rpc('deduct_credits', {
            amount: cost,
            transaction_label: 'Unlocked module'
        });

        if (deductError) {
            if (deductError.message?.includes('Insufficient credits')) {
                throw new Error("Insufficient credits");
            }
            throw deductError;
        }
=======
        // 1. Call RPC to deduct credits
        const { error: rpcError } = await supabase.rpc('deduct_credits' as any, {
            amount: cost,
            reason: 'Unlocked module'
        });

        if (rpcError) throw rpcError;
>>>>>>> Stashed changes

        // 2. Create unlock record
        const { error: unlockError } = await supabase
            .from("user_module_progress" as any)
            .insert({
                user_id: userId,
                module_id: moduleId,
                unlocked: true,
                completion_percentage: 0,
            });

<<<<<<< Updated upstream
        if (unlockError) throw unlockError;
=======
        if (unlockError) {
            // If unlock fails, we should ideally refund, but for now let's just throw
            console.error("Unlock failed after payment", unlockError);
            throw unlockError;
        }
>>>>>>> Stashed changes
    },

    async getModuleDetails(moduleId: string) {
        const { data: { user } } = await supabase.auth.getUser();

        const { data: module, error: moduleError } = await supabase
            .from("modules" as any)
            .select("*")
            .eq("id", moduleId)
            .single();

        if (moduleError) throw moduleError;

        const { data: chapters, error: chaptersError } = await supabase
            .from("chapters" as any)
            .select(`
        *,
        lessons (*)
      `)
            .eq("module_id", moduleId)
            .order("order_index", { ascending: true });

        if (chaptersError) throw chaptersError;

        // Fetch user progress for all lessons in this module
        let lessonProgressMap: Record<string, any> = {};
        if (user) {
            const { data: progressData } = await supabase
                .from("user_lesson_progress" as any)
                .select("*")
                .eq("user_id", user.id);

            if (progressData) {
                progressData.forEach((p: any) => {
                    lessonProgressMap[p.lesson_id] = p;
                });
            }
        }

        // Sort lessons within chapters and attach progress
        const chaptersWithSortedLessons = (chapters as any[]).map(chapter => ({
            ...chapter,
            lessons: chapter.lessons
                .sort((a: any, b: any) => a.order_index - b.order_index)
                .map((lesson: any) => ({
                    ...lesson,
                    progress: lessonProgressMap[lesson.id] || null
                }))
        }));

        return { module, chapters: chaptersWithSortedLessons };
    },

    async unlockLesson(lessonId: string, userId: string): Promise<void> {
        const COST = 2;

<<<<<<< Updated upstream
        // 1. Deduct credits using secure RPC function (handles validation & transaction logging)
        const { error: deductError } = await supabase.rpc('deduct_credits', {
            amount: COST,
            transaction_label: 'Unlocked lesson'
        });

        if (deductError) {
            if (deductError.message?.includes('Insufficient credits')) {
                throw new Error("Insufficient credits");
            }
            throw deductError;
        }
=======
        // 1. Call RPC to deduct credits
        const { error: rpcError } = await supabase.rpc('deduct_credits' as any, {
            amount: COST,
            reason: 'Unlocked lesson'
        });

        if (rpcError) throw rpcError;
>>>>>>> Stashed changes

        // 2. Unlock lesson
        const { error: unlockError } = await supabase
            .from("user_lesson_progress" as any)
            .upsert({
                user_id: userId,
                lesson_id: lessonId,
                unlocked: true,
            }, { onConflict: "user_id, lesson_id" });

        if (unlockError) throw unlockError;
    },

    async getLesson(lessonId: string) {
        const { data: lesson, error: lessonError } = await supabase
            .from("lessons" as any)
            .select(`
        *,
        chapter:chapters (
          *,
          module:modules (*)
        )
      `)
            .eq("id", lessonId)
            .single();

        if (lessonError) throw lessonError;

        const { data: progress, error: progressError } = await supabase
            .from("user_lesson_progress" as any)
            .select("*")
            .eq("lesson_id", lessonId)
            .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
            .single();

        // It's okay if progress doesn't exist yet
        if (progressError && progressError.code !== "PGRST116") throw progressError;

        return { ...(lesson as any), progress };
    },

    async markLessonComplete(lessonId: string, userId: string) {
        // 1. Mark lesson as complete
        const { error } = await supabase
            .from("user_lesson_progress" as any)
            .upsert({
                user_id: userId,
                lesson_id: lessonId,
                completed: true,
                completed_at: new Date().toISOString(),
            }, { onConflict: "user_id, lesson_id" });

        if (error) throw error;

        // 2. Get module ID for this lesson
        const { data: lesson, error: lessonError } = await supabase
            .from("lessons" as any)
            .select(`
        chapter_id,
        chapter:chapters (
          module_id
        )
      `)
            .eq("id", lessonId)
            .single();

        if (lessonError) throw lessonError;

        // Type assertion for nested join result
        const lessonWithChapter = lesson as any;
        const moduleId = lessonWithChapter.chapter.module_id;

        // 3. Calculate progress
        // Get all lessons in module
        const { data: allLessons, error: allLessonsError } = await supabase
            .from("lessons" as any)
            .select(`
        id,
        chapter:chapters!inner (
          module_id
        )
      `)
            .eq("chapter.module_id", moduleId);

        if (allLessonsError) throw allLessonsError;

        const totalLessons = allLessons.length;

        // Get completed lessons
        const { count: completedCount, error: completedError } = await supabase
            .from("user_lesson_progress" as any)
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("completed", true)
            .in("lesson_id", (allLessons as any[]).map(l => l.id));

        if (completedError) throw completedError;

        const percentage = totalLessons > 0
            ? Math.round(((completedCount || 0) / totalLessons) * 100)
            : 0;

        // 4. Update module progress
        const { error: updateError } = await supabase
            .from("user_module_progress" as any)
            .update({
                completion_percentage: percentage,
                last_accessed_at: new Date().toISOString()
            })
            .eq("user_id", userId)
            .eq("module_id", moduleId);

        if (updateError) throw updateError;
    },

    async createModuleWithCurriculum(moduleData: any, curriculumData: any) {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error("User not authenticated");

        // 1. Create Module
        const { data: module, error: moduleError } = await supabase
            .from("modules" as any)
            .insert({
                user_id: user.id,
                title: moduleData.title,
                description: moduleData.description,
                credit_cost: moduleData.credit_cost,
                order_index: 999 // Put at the end or handle ordering logic
            })
            .select()
            .single();

        if (moduleError) throw moduleError;

        // Type assertion to handle 'any' return from supabase
        const createdModule = module as any;
        const moduleId = createdModule.id;

        // 2. Create Chapters and Lessons
        if (!curriculumData?.chapters || !Array.isArray(curriculumData.chapters)) {
            console.warn("No chapters found in curriculum data", curriculumData);
            return createdModule;
        }

        for (let i = 0; i < curriculumData.chapters.length; i++) {
            const chapterData = curriculumData.chapters[i];
            const { data: chapter, error: chapterError } = await supabase
                .from("chapters" as any)
                .insert({
                    module_id: moduleId,
                    title: chapterData.title,
                    description: chapterData.description,
                    order_index: i,
                    estimated_duration: chapterData.estimated_duration
                })
                .select()
                .single();

            if (chapterError) throw chapterError;

            const createdChapter = chapter as any;
            const chapterId = createdChapter.id;

            if (chapterData.lessons && chapterData.lessons.length > 0) {
                const lessonsToInsert = chapterData.lessons.map((lesson: any, index: number) => ({
                    chapter_id: chapterId,
                    title: lesson.title,
                    content: lesson.content, // Initial content summary
                    order_index: index
                }));

                const { error: lessonsError } = await supabase
                    .from("lessons" as any)
                    .insert(lessonsToInsert);

                if (lessonsError) throw lessonsError;
            }
        }

        return createdModule;
    }
};
