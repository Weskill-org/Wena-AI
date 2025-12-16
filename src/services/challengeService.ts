import { supabase } from "@/integrations/supabase/client";
import { sendMessageToGemini } from "@/lib/gemini";

export interface DailyChallenge {
    id: string;
    question: string;
    options: string[] | null;
    correct_answer?: string;
    difficulty: string;
    topic: string;
    challenge_date: string;
}

export interface UserStats {
    total_xp: number;
    current_streak: number;
    longest_streak: number;
    tier: string;
    last_challenge_date: string | null;
}

export interface LeaderboardEntry {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    total_xp: number;
    tier: string;
    rank: number;
}

export const challengeService = {
    async getDailyChallenge(userId: string) {
        // 1. Check if a challenge exists for today
        const today = new Date().toISOString().split('T')[0];

        let { data: challenge, error } = await supabase
            .from('daily_challenges')
            .select('*')
            .eq('challenge_date', today)
            .maybeSingle();

        if (!challenge) {
            // Lazy Generate Challenge
            console.log("No challenge found for today. Generating one...");
            challenge = await this.generateDailyChallenge(today);
        }

        // 2. Check if user has attempted it
        const { data: attempt } = await supabase
            .from('user_challenge_attempts')
            .select('*')
            .eq('user_id', userId)
            .eq('challenge_id', challenge.id)
            .maybeSingle();

        return {
            challenge: {
                ...challenge,
                options: challenge.options ? (typeof challenge.options === 'string' ? JSON.parse(challenge.options) : challenge.options) : null
            } as DailyChallenge,
            attempt: attempt
        };
    },

    async generateDailyChallenge(date: string) {
        const prompt = `
            Generate a single engaging daily trivia or logic challenge question.
            Topic should be general knowledge, science, technology, or history.
            
            Return ONLY a valid JSON object with this structure:
            {
                "question": "The question string",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "Option A" (Must match one of the options exactly),
                "difficulty": "Easy" (or Medium, Hard),
                "topic": "Science"
            }
        `;

        try {
            const responseText = await sendMessageToGemini(prompt);
            const cleanedResponse = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const challengeData = JSON.parse(cleanedResponse);

            const { data, error } = await supabase
                .from('daily_challenges')
                .insert({
                    question: challengeData.question,
                    options: JSON.stringify(challengeData.options),
                    correct_answer: challengeData.correct_answer,
                    difficulty: challengeData.difficulty,
                    topic: challengeData.topic,
                    challenge_date: date
                })
                .select()
                .single();

            if (error) {
                console.error("Supabase error creating challenge:", error);
                // Handle race condition if created in parallel
                if (error.code === '23505') { // Unique violation
                    const { data: existing } = await supabase
                        .from('daily_challenges')
                        .select('*')
                        .eq('challenge_date', date)
                        .single();
                    return existing;
                }
                throw error;
            }
            return data;
        } catch (error) {
            console.error("Error generating challenge:", error);
            // Fallback hardcoded challenge if AI fails
            return {
                id: 'fallback',
                question: 'Which planet is known as the Red Planet?',
                options: JSON.stringify(['Earth', 'Mars', 'Jupiter', 'Saturn']),
                correct_answer: 'Mars',
                difficulty: 'Easy',
                topic: 'Science',
                challenge_date: date
            };
        }
    },

    async submitChallenge(userId: string, challengeId: string, response: string) {
        // 0. Handle Fallback Case (Client-side only)
        if (challengeId === 'fallback') {
            console.log("Submitting fallback challenge");
            const isCorrect = response === 'Mars';
            // We cannot save to DB because 'fallback' is not a valid UUID for foreign key
            // Just return local result
            return { isCorrect, points: 0 };
        }

        // 1. Verify Answer
        const { data: challenge, error: fetchError } = await supabase
            .from('daily_challenges')
            .select('correct_answer, difficulty')
            .eq('id', challengeId)
            .single();

        if (fetchError || !challenge) {
            console.error("Error fetching challenge for verification:", fetchError);
            throw new Error("Challenge not found");
        }

        const isCorrect = response === challenge.correct_answer;
        let points = 0;

        if (isCorrect) {
            points = challenge.difficulty === 'Hard' ? 50 : challenge.difficulty === 'Medium' ? 30 : 10;
        }

        // 2. Record Attempt
        const { error: attemptError } = await supabase
            .from('user_challenge_attempts')
            .insert({
                user_id: userId,
                challenge_id: challengeId,
                response: response,
                is_correct: isCorrect,
                points_earned: points
            });

        if (attemptError) {
            // If duplicate attempt, ignore or throw?
            if (attemptError.code === '23505') {
                console.log("Already attempted");
            } else {
                throw attemptError;
            }
        }

        if (isCorrect) {
            // 3. Update User Stats & Wallet
            await this.updateUserStats(userId, points);
        } else {
            // Update stats for non-winning attempt (streak checking etc)
            await this.updateUserStats(userId, 0, false);
        }

        return { isCorrect, points };
    },

    async updateUserStats(userId: string, xpGained: number, isWin: boolean = true) {
        const { data: stats } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .single();

        let currentStreak = stats?.current_streak || 0;
        const lastDate = stats?.last_challenge_date ? new Date(stats.last_challenge_date) : null;
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // Streak Logic
        if (isWin) {
            if (lastDate && lastDate.toDateString() === yesterday.toDateString()) {
                currentStreak += 1;
            } else if (!lastDate || lastDate.toDateString() !== today.toDateString()) {
                // If last date was not today (already played) and not yesterday (streak broken)
                // If it is today, we don't increment (already counted, though UI shouldn't allow replay)
                // If it is older than yesterday, reset
                currentStreak = 1;
            }
        }

        // Tier Logic
        const newTotalXp = (stats?.total_xp || 0) + xpGained;
        let tier = 'Bronze';
        if (newTotalXp > 5000) tier = 'Diamond';
        else if (newTotalXp > 3000) tier = 'Platinum';
        else if (newTotalXp > 1500) tier = 'Gold';
        else if (newTotalXp > 500) tier = 'Silver';

        const updates = {
            total_xp: newTotalXp,
            current_streak: currentStreak,
            longest_streak: Math.max(currentStreak, stats?.longest_streak || 0),
            last_challenge_date: new Date().toISOString(),
            tier: tier,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('user_stats')
            .upsert({ user_id: userId, ...updates });

        if (error) console.error("Error updating stats", error);

        // Update Wallet credits if XP gained (simple 1:1 or logic)
        // Let's give 10 credits for a win
        if (isWin && xpGained > 0) {
            // Fetch current credits to add
            const { data: wallet } = await supabase.from('wallets').select('credits').eq('user_id', userId).single();
            if (wallet) {
                await supabase.from('wallets').update({ credits: wallet.credits + 10 }).eq('user_id', userId);
            }
        }
    },

    async getLeaderboard() {
        // Fetch stats joined with profiles
        const { data, error } = await supabase
            .from('user_stats')
            .select(`
                total_xp,
                tier,
                profiles (
                    id,
                    full_name,
                    avatar_url
                )
            `)
            .order('total_xp', { ascending: false })
            .limit(10);

        if (error) throw error;

        return data.map((entry: any, index: number) => ({
            user_id: entry.profiles.id,
            full_name: entry.profiles.full_name,
            avatar_url: entry.profiles.avatar_url,
            total_xp: entry.total_xp,
            tier: entry.tier,
            rank: index + 1
        }));
    },

    async getUserStats(userId: string) {
        const { data, error } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (!data && !error) {
            // Create if missing
            try {
                await supabase.from('user_stats').insert({ user_id: userId });
                return { total_xp: 0, current_streak: 0, longest_streak: 0, tier: 'Bronze', last_challenge_date: null } as UserStats;
            } catch (e) {
                return { total_xp: 0, current_streak: 0, longest_streak: 0, tier: 'Bronze', last_challenge_date: null } as UserStats;
            }
        }
        return data as UserStats;
    }
};
