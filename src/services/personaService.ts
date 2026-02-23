import { supabase } from "@/integrations/supabase/client";
import { sendMessageToGemini } from "@/lib/gemini";

export interface FlashcardQuestion {
    id: string;
    question_text: string;
    field_key: string;
    category: string;
    input_type: 'text' | 'date' | 'select' | 'number';
    options?: string[];
    is_review?: boolean;
    previous_response?: string;
}

export interface SRSStats {
    easiness_factor: number;
    interval: number;
    repetitions: number;
    next_review_at: string;
}

export const personaService = {
    /**
     * SM-2 Algorithm Implementation
     * @param quality 0-3 (0: Again, 1: Hard, 2: Good, 3: Easy)
     */
    calculateSRS(stats: SRSStats, quality: number): SRSStats {
        let { easiness_factor, interval, repetitions } = stats;

        // Map quality 0-3 to 0-5 for standard SM-2 if needed, 
        // but let's adjust the formula for 0-3 range directly.
        // Again=0, Hard=1, Good=2, Easy=3

        if (quality >= 2) { // Good or Easy
            if (repetitions === 0) {
                interval = 1;
            } else if (repetitions === 1) {
                interval = 6;
            } else {
                interval = Math.round(interval * easiness_factor);
            }
            repetitions++;
        } else { // Again or Hard
            repetitions = 0;
            interval = 1;
        }

        // Adjust easiness factor: EF' = EF + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02))
        // Simplified for 0-3:
        const qualityImpact = [-0.5, -0.2, 0, 0.1]; // Again, Hard, Good, Easy
        easiness_factor = easiness_factor + qualityImpact[quality];

        if (easiness_factor < 1.3) easiness_factor = 1.3;

        const next_review_at = new Date();
        next_review_at.setDate(next_review_at.getDate() + interval);

        return {
            easiness_factor,
            interval,
            repetitions,
            next_review_at: next_review_at.toISOString(),
        };
    },

    async checkAndResetDailyLimit(userId: string): Promise<number> {
        // Calculate today's date in IST (UTC+5:30)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        const todayStr = istDate.toISOString().split('T')[0]; // YYYY-MM-DD

        // Fetch current limit
        // @ts-ignore
        const { data, error } = await supabase
            .from('daily_flashcard_limits' as any)
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error("Error fetching daily limit:", error);
            return 10; // Default if table missing
        }

        if (!data) {
            // Create new record
            // @ts-ignore
            const { error: insertError } = await supabase
                .from('daily_flashcard_limits' as any)
                .insert({
                    user_id: userId,
                    remaining_questions: 10,
                    last_reset_date: todayStr
                });

            if (insertError) console.error("Error creating daily limit:", insertError);
            return 10;
        }

        // Check if reset is needed
        const limitData = data as any;
        if (limitData.last_reset_date !== todayStr) {
            console.log("Resetting daily limit for new day (IST):", todayStr);
            // @ts-ignore
            const { error: updateError } = await supabase
                .from('daily_flashcard_limits' as any)
                .update({
                    remaining_questions: 10,
                    last_reset_date: todayStr
                })
                .eq('user_id', userId);

            if (updateError) console.error("Error resetting daily limit:", updateError);
            return 10;
        }

        return limitData.remaining_questions;
    },

    async decrementDailyLimit(userId: string) {
        const current = await this.checkAndResetDailyLimit(userId);
        if (current > 0) {
            // @ts-ignore
            await supabase
                .from('daily_flashcard_limits' as any)
                .update({ remaining_questions: current - 1 })
                .eq('user_id', userId);
        }
    },

    async getPersona(userId: string) {
        const { data, error } = await supabase
            .from('ai_personas')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    async updatePersona(userId: string, details: any) {
        // First get existing persona to merge details
        // @ts-ignore
        const { data: existing } = await supabase
            .from('ai_personas')
            .select('details')
            .eq('user_id', userId)
            .maybeSingle();

        // @ts-ignore
        const currentDetails = existing?.details || {};
        // @ts-ignore
        const updatedDetails = { ...currentDetails, ...details };

        // @ts-ignore
        const { error } = await supabase
            .from('ai_personas')
            .upsert({
                user_id: userId,
                details: updatedDetails,
                updated_at: new Date().toISOString()
            } as any, { onConflict: 'user_id' });

        if (error) throw error;
    },

    async generateAIQuestions(userId: string, currentPersona: any): Promise<FlashcardQuestion[]> {
        console.log("Generating AI questions...");
        const prompt = `
            Based on the following user persona details: ${JSON.stringify(currentPersona)},
            generate 3 new, engaging, and diverse flashcard questions to learn more about the user.
            Focus on gathering information like interests, goals, learning style, and background.
            Do not ask questions that are already answered in the persona details.
            
            Return the response ONLY as a valid JSON array of objects with the following structure:
            [
                {
                    "question_text": "Question string",
                    "field_key": "unique_key_for_db",
                    "category": "Category (e.g., Personal, Education, Goals, Fun)",
                    "input_type": "text" (or "select" if applicable),
                    "options": ["Option 1", "Option 2"] (only if input_type is select)
                }
            ]
        `;

        try {
            const responseText = await sendMessageToGemini(prompt, "gemini-2.5-flash");
            const cleanedResponse = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const questions = JSON.parse(cleanedResponse);

            // Save generated questions to DB
            const savedQuestions: FlashcardQuestion[] = [];
            for (const q of questions) {
                // @ts-ignore
                const { data, error } = await supabase
                    .from('flashcard_questions')
                    .insert({
                        question_text: q.question_text,
                        field_key: q.field_key,
                        category: q.category,
                        input_type: q.input_type || 'text',
                        options: q.options ? JSON.stringify(q.options) : null,
                        order_index: 99 // High index for AI questions
                    })
                    .select()
                    .single();

                if (!error && data) {
                    // @ts-ignore
                    savedQuestions.push({
                        ...data,
                        // @ts-ignore
                        options: data.options ? (typeof data.options === 'string' ? JSON.parse(data.options) : data.options) : undefined
                    });
                }
            }
            return savedQuestions;
        } catch (error) {
            console.error("Error generating AI questions:", error);
            return [];
        }
    },

    async updatePersonaWithAI(userId: string, newInfo: { question: string, answer: string }) {
        console.log("Updating persona text...");
        const currentPersona = await this.getPersona(userId);
        const currentText = currentPersona?.persona_text || "";

        // Construct the new entry
        const newEntry = `${newInfo.question}: ${newInfo.answer}`;

        // Append to existing text
        let updatedText = currentText.trim();
        if (updatedText) {
            updatedText += "\n\n" + newEntry;
        } else {
            updatedText = newEntry;
        }

        try {
            // @ts-ignore
            const { error } = await supabase
                .from('ai_personas')
                .update({ persona_text: updatedText })
                .eq('user_id', userId);

            if (error) throw error;
            console.log("Persona text updated successfully (Direct Append).");
        } catch (error) {
            console.error("Error updating persona text:", error);
        }
    },

    async generateSingleDynamicQuestion(userId: string): Promise<FlashcardQuestion | null> {
        console.log("Generating single dynamic AI question...");
        const persona = await this.getPersona(userId);
        const currentPersona = persona?.details || {};

        const prompt = `
            You are best AI Persona Developer (as a teacher) and will dig down to know more relevent questiones to personalise education. 
            Your work is to get more questions in MCQ Formats.
            
            Based on the following user persona details: ${JSON.stringify(currentPersona)},
            generate 1 new, engaging flashcard question to learn more about the user. Make the question in very different aspects of the user rather than just sticking to the same aspect.
            Focus on gathering information like interests, goals, learning style, family members and background.
            Do not ask questions that are already answered in the persona details. If you see lot of answers of similar question, then try to ask a completely different questions.
            
            Return the response ONLY as a valid JSON object (NOT an array) with the following structure:
            {
                "question_text": "Question string",
                "field_key": "unique_key_for_db",
                "category": "Category (e.g., Personal, Education, Goals, Fun)",
                "input_type": "text" (or "select" if applicable),
                "options": ["Option 1", "Option 2"] (only if input_type is select)
            }
        `;

        try {
            const responseText = await sendMessageToGemini(prompt, "gemini-2.5-flash");
            const cleanedResponse = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const q = JSON.parse(cleanedResponse);

            // Construct FlashcardQuestion object with dynamic ID
            const dynamicQuestion: FlashcardQuestion = {
                id: `dynamic-${Date.now()}`,
                question_text: q.question_text,
                field_key: q.field_key,
                category: q.category,
                input_type: q.input_type || 'text',
                options: q.options
            };

            return dynamicQuestion;

        } catch (error) {
            console.error("Error generating AI question:", error);
            return null;
        }
    },

    async getDailyQuestions(userId: string): Promise<FlashcardQuestion[]> {
        console.log("Fetching questions for user:", userId);

        // 1. Fetch Due Reviews
        // @ts-ignore
        const { data: dueReviews, error: reviewError } = await supabase
            .from('user_flashcard_stats')
            .select(`
                question_id,
                flashcard_questions (*)
            `)
            .eq('user_id', userId)
            .lte('next_review_at', new Date().toISOString())
            .order('next_review_at', { ascending: true });

        if (reviewError) console.error("Error fetching due reviews:", reviewError);

        // 2. Fetch Previous Responses for Reviews
        const dueQuestionIds = dueReviews?.map(r => r.question_id) || [];
        let previousResponsesMap: Record<string, string> = {};

        if (dueQuestionIds.length > 0) {
            const { data: responses } = await supabase
                .from('flashcard_responses')
                .select('question_id, response')
                .eq('user_id', userId)
                .in('question_id', dueQuestionIds);

            responses?.forEach(r => {
                previousResponsesMap[r.question_id] = r.response;
            });
        }

        const reviewQuestions: FlashcardQuestion[] = (dueReviews || []).map(r => {
            const q = r.flashcard_questions as any;
            return {
                ...q,
                options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : undefined,
                is_review: true,
                previous_response: previousResponsesMap[q.id] || "No previous answer found"
            };
        });

        // 3. If we have due reviews, return them (prioritizing reviews)
        if (reviewQuestions.length > 0) {
            return reviewQuestions;
        }

        // 4. Fallback to New Questions (Existing Logic but 10 card target)
        // Check today's progress to see if we should serve NEW cards
        const remainingNew = await this.getTodayProgress(userId);

        if (remainingNew <= 0) {
            return [];
        }

        // @ts-ignore
        const { data: allQuestions, error: qError } = await supabase
            .from('flashcard_questions')
            .select('*')
            .order('order_index');

        if (qError) throw qError;

        // Filter unanswered questions (that aren't in stats yet)
        // @ts-ignore
        const { data: existingStats } = await supabase
            .from('user_flashcard_stats')
            .select('question_id')
            .eq('user_id', userId);

        const scheduledIds = new Set(existingStats?.map((s: any) => s.question_id));
        const unansweredQuestions = (allQuestions as any[] || []).filter(q => !scheduledIds.has(q.id));

        return unansweredQuestions.slice(0, remainingNew).map(q => ({
            ...q,
            options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : undefined
        }));
    },

    async submitFlashcardResponse(userId: string, questionId: string, response: string, fieldKey: string, rating?: number) {
        // 1. Save or Update response
        if (!questionId.startsWith('dynamic-')) {
            const { error: rError } = await supabase
                .from('flashcard_responses')
                .upsert({
                    user_id: userId,
                    question_id: questionId,
                    response: response,
                    answered_at: new Date().toISOString()
                }, { onConflict: 'user_id,question_id' } as any);

            if (rError) throw rError;

            // 2. Handle SRS Metadata
            // Fetch current stats
            const { data: existingStats } = await supabase
                .from('user_flashcard_stats')
                .select('*')
                .eq('user_id', userId)
                .eq('question_id', questionId)
                .maybeSingle();

            const currentStats: SRSStats = existingStats ? {
                easiness_factor: existingStats.easiness_factor,
                interval: existingStats.interval,
                repetitions: existingStats.repetitions,
                next_review_at: existingStats.next_review_at
            } : {
                easiness_factor: 2.5,
                interval: 0,
                repetitions: 0,
                next_review_at: new Date().toISOString()
            };

            // Calculate new stats (default to quality=2 (Good) if no rating provided)
            const newStats = this.calculateSRS(currentStats, rating ?? 2);

            const { error: statsError } = await supabase
                .from('user_flashcard_stats')
                .upsert({
                    user_id: userId,
                    question_id: questionId,
                    ...newStats,
                    last_reviewed_at: new Date().toISOString()
                });

            if (statsError) console.error("Error updating SRS stats:", statsError);

            // 3. Decrement Daily Limit ONLY for NEW cards
            if (!existingStats) {
                await this.decrementDailyLimit(userId);
            }
        } else {
            console.log("Skipping DB save for dynamic question response");
            // Still decrement limit for dynamic cards as they count towards persona building
            await this.decrementDailyLimit(userId);
        }

        // 4. Update persona details (JSON)
        await this.updatePersona(userId, { [fieldKey]: response });

        // 5. Update AI Persona Text
        const formattedKey = fieldKey
            .split('_')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');

        await this.updatePersonaWithAI(userId, {
            question: formattedKey,
            answer: response
        });
    },

    async getTodayProgress(userId: string) {
        // We return the remaining count directly, so UI logic will change to "remaining > 0"
        return this.checkAndResetDailyLimit(userId);
    },

    async isOnboardingComplete(userId: string): Promise<boolean> {
        // @ts-ignore
        const { data } = await supabase
            .from('ai_personas')
            .select('onboarding_completed')
            .eq('user_id', userId)
            .maybeSingle();
        return (data as any)?.onboarding_completed === true;
    },

    async completeOnboarding(
        userId: string,
        goals: string,
        skillLevel: string,
        weeklyHours: string,
        interests: string[]
    ) {
        // @ts-ignore
        const { error } = await supabase
            .from('ai_personas')
            .upsert({
                user_id: userId,
                learning_goals: goals,
                skill_level: skillLevel,
                weekly_hours: weeklyHours,
                interests,
                onboarding_completed: true,
                updated_at: new Date().toISOString(),
            } as any, { onConflict: 'user_id' });

        if (error) throw error;

        // Trigger learning path generation asynchronously
        // We don't await it here to avoid blocking the UI response
        import('./learningPathService').then(({ learningPathService }) => {
            learningPathService.generateLearningPath(userId).catch(err => {
                console.error("Error generating learning path after onboarding:", err);
            });
        });
    },
};

