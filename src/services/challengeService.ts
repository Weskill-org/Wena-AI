import { supabase } from "@/integrations/supabase/client";
import { sendMessageToGemini } from "@/lib/gemini";

export interface GeneratedChallenge {
    question: string;
    options: string[];
    correct_answer: string;
    difficulty: string;
    topic: string;
}

export interface UserStats {
    total_xp: number;
    current_streak: number;
    longest_streak: number;
    tier: string;
    last_challenge_date: string | null;
    last_wrong_attempt_at: string | null;
}

export interface LeaderboardEntry {
    user_id: string;
    first_name: string;
    avatar_url: string | null;
    total_xp: number;
    current_streak: number;
    rank: number;
}

// Streak rewards: every 5 days, incremental credits
const STREAK_REWARDS: Record<number, number> = {
    5: 20,
    10: 40,
    15: 60,
    20: 80,
    25: 100,
    30: 150
};

export const challengeService = {
    // Generate a fresh AI question in real-time (not stored in DB)
    async generateChallenge(): Promise<GeneratedChallenge> {
        const prompt = `
            Generate a single engaging daily trivia or logic challenge question.
            Topics can be: general knowledge, science, technology, history, geography, arts, sports.
            Make it interesting and educational.
            
            Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
            {
                "question": "The question string here",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "Option A",
                "difficulty": "Medium",
                "topic": "Science"
            }
            
            Rules:
            - correct_answer MUST be exactly one of the options
            - difficulty must be Easy, Medium, or Hard
            - 4 options always
        `;

        try {
            const responseText = await sendMessageToGemini(prompt, "gemini-2.5-flash");
            const cleanedResponse = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const challengeData = JSON.parse(cleanedResponse);
            
            return {
                question: challengeData.question,
                options: challengeData.options,
                correct_answer: challengeData.correct_answer,
                difficulty: challengeData.difficulty || 'Medium',
                topic: challengeData.topic || 'General'
            };
        } catch (error) {
            console.error("Error generating challenge:", error);
            // Fallback question
            return {
                question: 'Which planet is known as the Red Planet?',
                options: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
                correct_answer: 'Mars',
                difficulty: 'Easy',
                topic: 'Science'
            };
        }
    },

    // Check if user can attempt today's challenge
    async canAttemptToday(userId: string): Promise<{ canAttempt: boolean; reason?: string; waitMinutes?: number; completedToday?: boolean }> {
        const { data: stats } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (!stats) {
            return { canAttempt: true };
        }

        const today = new Date().toISOString().split('T')[0];
        const lastChallengeDate = stats.last_challenge_date ? new Date(stats.last_challenge_date).toISOString().split('T')[0] : null;

        // If already completed today successfully
        if (lastChallengeDate === today) {
            return { canAttempt: false, reason: 'completed', completedToday: true };
        }

        // Check for wrong attempt cooldown (60 minutes)
        const lastWrongAttempt = (stats as any).last_wrong_attempt_at;
        if (lastWrongAttempt) {
            const wrongAttemptTime = new Date(lastWrongAttempt);
            const now = new Date();
            const diffMinutes = (now.getTime() - wrongAttemptTime.getTime()) / (1000 * 60);
            
            if (diffMinutes < 60) {
                const waitMinutes = Math.ceil(60 - diffMinutes);
                return { canAttempt: false, reason: 'cooldown', waitMinutes };
            }
        }

        return { canAttempt: true };
    },

    // Submit answer and update stats
    async submitAnswer(userId: string, selectedAnswer: string, correctAnswer: string): Promise<{
        isCorrect: boolean;
        xpEarned: number;
        creditsEarned: number;
        newStreak: number;
        streakReward?: number;
        daysToNextReward: number;
    }> {
        const isCorrect = selectedAnswer === correctAnswer;
        
        // Get current stats
        const { data: stats } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        const currentXp = stats?.total_xp || 0;
        let currentStreak = stats?.current_streak || 0;
        const longestStreak = stats?.longest_streak || 0;

        // Check for monthly reset (1st of month)
        const today = new Date();
        const lastDate = stats?.last_challenge_date ? new Date(stats.last_challenge_date) : null;
        
        if (lastDate && lastDate.getMonth() !== today.getMonth()) {
            // Reset streak for new month
            currentStreak = 0;
        }

        let xpEarned = 0;
        let creditsEarned = 0;
        let streakReward: number | undefined;
        let newStreak = currentStreak;

        if (isCorrect) {
            // XP based on difficulty (we assume Medium for AI-generated)
            xpEarned = 30;
            creditsEarned = 10;
            newStreak = currentStreak + 1;

            // Check for streak reward (every 5 days)
            if (newStreak > 0 && newStreak % 5 === 0 && STREAK_REWARDS[newStreak]) {
                streakReward = STREAK_REWARDS[newStreak];
                creditsEarned += streakReward;
            }

            // Update stats
            const updates = {
                user_id: userId,
                total_xp: currentXp + xpEarned,
                current_streak: newStreak,
                longest_streak: Math.max(newStreak, longestStreak),
                last_challenge_date: new Date().toISOString(),
                last_wrong_attempt_at: null, // Clear wrong attempt on success
                tier: this.calculateTier(currentXp + xpEarned),
                updated_at: new Date().toISOString()
            };

            await supabase.from('user_stats').upsert(updates);

            // Add credits using RPC
            const { error: addCreditsError } = await supabase.rpc('add_credits', {
                amount: creditsEarned,
                transaction_label: streakReward ? `Challenge reward + ${newStreak}-day streak bonus` : 'Challenge reward'
            });
            
            if (addCreditsError) {
                console.error("Error adding credits:", addCreditsError);
            }
        } else {
            // Wrong answer - set cooldown
            await supabase.from('user_stats').upsert({
                user_id: userId,
                total_xp: currentXp,
                current_streak: currentStreak,
                longest_streak: longestStreak,
                last_wrong_attempt_at: new Date().toISOString(),
                tier: this.calculateTier(currentXp),
                updated_at: new Date().toISOString()
            });
        }

        // Calculate days to next 5-day milestone
        const nextMilestone = Math.ceil((newStreak + 1) / 5) * 5;
        const daysToNextReward = nextMilestone - newStreak;

        return {
            isCorrect,
            xpEarned,
            creditsEarned,
            newStreak,
            streakReward,
            daysToNextReward
        };
    },

    calculateTier(xp: number): string {
        if (xp >= 5000) return 'Diamond';
        if (xp >= 3000) return 'Platinum';
        if (xp >= 1500) return 'Gold';
        if (xp >= 500) return 'Silver';
        return 'Bronze';
    },

    async getLeaderboard(): Promise<LeaderboardEntry[]> {
        const { data, error } = await supabase
            .from('user_stats')
            .select(`
                total_xp,
                current_streak,
                profiles (
                    id,
                    full_name,
                    avatar_url
                )
            `)
            .order('total_xp', { ascending: false })
            .limit(10);

        if (error) {
            console.error("Error fetching leaderboard:", error);
            return [];
        }

        return data.map((entry: any, index: number) => {
            const fullName = entry.profiles?.full_name || 'Anonymous';
            const firstName = fullName.split(' ')[0]; // Only first name
            
            return {
                user_id: entry.profiles?.id || '',
                first_name: firstName,
                avatar_url: entry.profiles?.avatar_url,
                total_xp: entry.total_xp,
                current_streak: entry.current_streak,
                rank: index + 1
            };
        });
    },

    async getUserStats(userId: string): Promise<UserStats> {
        const { data, error } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (!data && !error) {
            // Create if missing
            await supabase.from('user_stats').insert({ user_id: userId });
            return {
                total_xp: 0,
                current_streak: 0,
                longest_streak: 0,
                tier: 'Bronze',
                last_challenge_date: null,
                last_wrong_attempt_at: null
            };
        }

        const statsData = data as any;

        // Check for monthly reset
        if (statsData?.last_challenge_date) {
            const lastDate = new Date(statsData.last_challenge_date);
            const today = new Date();
            
            if (lastDate.getMonth() !== today.getMonth()) {
                // Reset streak for new month
                await supabase.from('user_stats').update({
                    current_streak: 0,
                    updated_at: new Date().toISOString()
                }).eq('user_id', userId);
                
                return {
                    total_xp: statsData.total_xp || 0,
                    current_streak: 0,
                    longest_streak: statsData.longest_streak || 0,
                    tier: statsData.tier || 'Bronze',
                    last_challenge_date: statsData.last_challenge_date,
                    last_wrong_attempt_at: statsData.last_wrong_attempt_at || null
                };
            }
        }

        return {
            total_xp: statsData?.total_xp || 0,
            current_streak: statsData?.current_streak || 0,
            longest_streak: statsData?.longest_streak || 0,
            tier: statsData?.tier || 'Bronze',
            last_challenge_date: statsData?.last_challenge_date || null,
            last_wrong_attempt_at: statsData?.last_wrong_attempt_at || null
        };
    },

    getStreakRewards(): Record<number, number> {
        return STREAK_REWARDS;
    }
};
