import { supabase } from "@/integrations/supabase/client";
import { sendMessageToGemini } from "@/lib/gemini";

export interface FlashcardQuestion {
    id: string;
    question_text: string;
    field_key: string;
    category: string;
    input_type: 'text' | 'date' | 'select' | 'number';
    options?: string[];
}

export const personaService = {
    async checkAndResetDailyLimit(userId: string): Promise<number> {
        // Calculate today's date in IST (UTC+5:30)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        const todayStr = istDate.toISOString().split('T')[0]; // YYYY-MM-DD

        // Fetch current limit
        // @ts-ignore
        const { data, error } = await supabase
            .from('daily_flashcard_limits')
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
                .from('daily_flashcard_limits')
                .insert({
                    user_id: userId,
                    remaining_questions: 10,
                    last_reset_date: todayStr
                });

            if (insertError) console.error("Error creating daily limit:", insertError);
            return 10;
        }

        // Check if reset is needed
        if (data.last_reset_date !== todayStr) {
            console.log("Resetting daily limit for new day (IST):", todayStr);
            // @ts-ignore
            const { error: updateError } = await supabase
                .from('daily_flashcard_limits')
                .update({
                    remaining_questions: 10,
                    last_reset_date: todayStr
                })
                .eq('user_id', userId);

            if (updateError) console.error("Error resetting daily limit:", updateError);
            return 10;
        }

        return data.remaining_questions;
    },

    async decrementDailyLimit(userId: string) {
        const current = await this.checkAndResetDailyLimit(userId);
        if (current > 0) {
            // @ts-ignore
            await supabase
                .from('daily_flashcard_limits')
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
            Your work is to get more questions in MCQ/One Liner Formats.
            
            Based on the following user persona details: ${JSON.stringify(currentPersona)},
            generate 1 new, engaging flashcard question to learn more about the user.
            Focus on gathering information like interests, goals, learning style, and background.
            Do not ask questions that are already answered in the persona details.
            
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
        console.log("Fetching daily questions for user:", userId);

        // 1. Get today's responses count
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // @ts-ignore
        const { data: todayResponses, error: rError } = await supabase
            .from('flashcard_responses')
            .select('*')
            .eq('user_id', userId)
            .gte('answered_at', today.toISOString());

        if (rError) throw rError;

        if (todayResponses && todayResponses.length >= 3) {
            console.log("User has already answered 3 questions today.");
            // Even if quota is full, we might want to return empty here and let the UI decide if it wants to request "Extra" questions.
            // But based on current logic, returning empty triggers "Completed".
            // The requirement says "If questions are already answered, Generate dynamic question".
            // If we strictly follow daily limit, we stop.
            // If we interpret the user request as "Keep going", we should return a dynamic question?
            // "Flashcard will generate relevent persona Questions... we will not save these ai questions". 
            // It seems like an unlimited mode or at least a fallback.
            // For now, I will return empty array to respect the "Daily" limit of saved questions. 
            // BUT, if the user explicitly wants to generate dynamic questions when "questions are already answered",
            // maybe they mean "Valid Backend Questions are answered".

            // Let's stick to:
            // 1. Return backend questions if available.
            // 2. If NO backend questions, return ONE dynamic question (even if daily limit of 3 is met? No, limit is for interactions).
            // Actually, if I don't save responses, the limit doesn't apply to dynamic Qs.
            // So effectively, once backend Qs are done, we can serve infinite dynamic Qs.
            return [];
        }

        const remainingQuota = 3 - (todayResponses?.length || 0);

        // 2. Get all questions
        // @ts-ignore
        const { data: allQuestions, error: qError } = await supabase
            .from('flashcard_questions')
            .select('*')
            .order('order_index');

        if (qError) throw qError;

        // 3. Filter unanswered questions
        // @ts-ignore
        const { data: allResponses } = await supabase
            .from('flashcard_responses')
            .select('question_id')
            .eq('user_id', userId);

        const answeredQuestionIds = new Set(allResponses?.map((r: any) => r.question_id));
        const unansweredQuestions = (allQuestions as any[] || []).filter(q => !answeredQuestionIds.has(q.id));

        // 4. Return up to remainingQuota backend questions
        // We do NOT generate AI questions here to fill the batch anymore.
        // We let the frontend ask for dynamic questions one by one if this list runs out.
        // Wait, if I change this, `Flashcards.tsx` needs to know when to ask for dynamic.
        // If I return fewer than `remainingQuota`, the frontend will finish them and then... stop?
        // I need to update `Flashcards.tsx` to handle "fetch more".

        return unansweredQuestions.slice(0, remainingQuota).map(q => ({
            ...q,
            options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : undefined
        }));
    },

    async submitFlashcardResponse(userId: string, questionId: string, response: string, fieldKey: string) {
        // 1. Save response ONLY if it's not a dynamic question
        if (!questionId.startsWith('dynamic-')) {
            // @ts-ignore
            const { error: rError } = await supabase
                .from('flashcard_responses')
                .insert({
                    user_id: userId,
                    question_id: questionId,
                    response: response
                });

            if (rError) throw rError;
        } else {
            console.log("Skipping DB save for dynamic question response");
        }

        // 2. Decrement Daily Limit
        await this.decrementDailyLimit(userId);

        // 3. Update persona details (JSON)
        await this.updatePersona(userId, { [fieldKey]: response });

        // 4. Update AI Persona Text
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
    }
};

