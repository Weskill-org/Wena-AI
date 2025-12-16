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
            const responseText = await sendMessageToGemini(prompt);
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

        // 4. If we have enough existing questions, return them
        if (unansweredQuestions.length >= remainingQuota) {
            return unansweredQuestions.slice(0, remainingQuota).map(q => ({
                ...q,
                options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : undefined
            }));
        }

        // 5. If not enough, generate AI questions
        console.log("Not enough questions, generating AI questions...");
        const persona = await this.getPersona(userId);
        const aiQuestions = await this.generateAIQuestions(userId, persona?.details || {});

        const combinedQuestions = [...unansweredQuestions, ...aiQuestions];

        return combinedQuestions.slice(0, remainingQuota).map(q => ({
            ...q,
            options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : undefined
        }));
    },

    async submitFlashcardResponse(userId: string, questionId: string, response: string, fieldKey: string) {
        // 1. Save response
        // @ts-ignore
        const { error: rError } = await supabase
            .from('flashcard_responses')
            .insert({
                user_id: userId,
                question_id: questionId,
                response: response
            });

        if (rError) throw rError;

        // 2. Update persona details (JSON)
        await this.updatePersona(userId, { [fieldKey]: response });

        // 3. Update AI Persona Text
        // Use formatted field_key as the key/label instead of full question text
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // @ts-ignore
        const { count, error } = await supabase
            .from('flashcard_responses')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('answered_at', today.toISOString());

        if (error) throw error;
        return count || 0;
    }
};

