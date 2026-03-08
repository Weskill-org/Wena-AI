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
    monthly_xp: number;
    current_streak: number;
    longest_streak: number;
    league: string;
    last_challenge_date: string | null;
    last_wrong_attempt_at: string | null;
}

export interface LeaderboardEntry {
    user_id: string;
    first_name: string;
    avatar_url: string | null;
    monthly_xp: number;
    current_streak: number;
    rank: number;
}

export interface League {
    name: string;
    min_xp: number;
    max_xp: number | null;
    rank_order: number;
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

// XP values
const XP_CORRECT = 30;
const XP_WRONG = -10;

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
        newLeague: string;
    }> {
        const isCorrect = selectedAnswer === correctAnswer;

        // Get current stats
        const { data: stats } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        const currentXp = stats?.total_xp || 0;
        const currentMonthlyXp = (stats as any)?.monthly_xp || 0;
        let currentStreak = stats?.current_streak || 0;
        const longestStreak = stats?.longest_streak || 0;

        let xpEarned = 0;
        let creditsEarned = 0;
        let streakReward: number | undefined;
        let newStreak = currentStreak;
        let newTotalXp = currentXp;
        let newMonthlyXp = currentMonthlyXp;

        if (isCorrect) {
            // XP for correct answer
            xpEarned = XP_CORRECT;
            creditsEarned = 10;
            newStreak = currentStreak + 1;
            newTotalXp = currentXp + xpEarned;
            newMonthlyXp = currentMonthlyXp + xpEarned;

            // Check for streak reward (every 5 days)
            if (newStreak > 0 && newStreak % 5 === 0 && STREAK_REWARDS[newStreak]) {
                streakReward = STREAK_REWARDS[newStreak];
                creditsEarned += streakReward;
            }

            // Update stats
            const updates = {
                user_id: userId,
                total_xp: newTotalXp,
                monthly_xp: newMonthlyXp,
                current_streak: newStreak,
                longest_streak: Math.max(newStreak, longestStreak),
                last_challenge_date: new Date().toISOString(),
                last_wrong_attempt_at: null, // Clear wrong attempt on success
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
            // Wrong answer - deduct XP (minimum 0) and set cooldown
            xpEarned = XP_WRONG;
            newTotalXp = Math.max(0, currentXp + xpEarned);
            newMonthlyXp = Math.max(0, currentMonthlyXp + xpEarned);

            await supabase.from('user_stats').upsert({
                user_id: userId,
                total_xp: newTotalXp,
                monthly_xp: newMonthlyXp,
                current_streak: currentStreak, // Don't reset streak on wrong answer
                longest_streak: longestStreak,
                last_wrong_attempt_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        // Get new league based on total XP
        const newLeague = this.calculateLeague(newTotalXp);

        // Calculate days to next 5-day milestone
        const nextMilestone = Math.ceil((newStreak + 1) / 5) * 5;
        const daysToNextReward = nextMilestone - newStreak;

        return {
            isCorrect,
            xpEarned,
            creditsEarned,
            newStreak,
            streakReward,
            daysToNextReward,
            newLeague
        };
    },

    calculateLeague(xp: number): string {
        if (xp >= 3500) return 'Master';
        if (xp >= 3000) return 'Diamond';
        if (xp >= 2500) return 'Platinum';
        if (xp >= 2000) return 'Gold';
        if (xp >= 500) return 'Silver';
        return 'Bronze';
    },

    async getLeagues(): Promise<League[]> {
        const { data, error } = await supabase
            .from('leagues')
            .select('*')
            .order('rank_order', { ascending: true });

        if (error) {
            console.error("Error fetching leagues:", error);
            return [];
        }

        return data.map((league: any) => ({
            name: league.name,
            min_xp: league.min_xp,
            max_xp: league.max_xp,
            rank_order: league.rank_order
        }));
    },

    async getLeaderboard(): Promise<LeaderboardEntry[]> {
        // Leaderboard is based on monthly_xp
        const { data, error } = await supabase
            .from('user_stats')
            .select(`
                monthly_xp,
                current_streak,
                profiles (
                    id,
                    full_name,
                    avatar_url
                )
            `)
            .order('monthly_xp', { ascending: false })
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
                monthly_xp: entry.monthly_xp || 0,
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
                monthly_xp: 0,
                current_streak: 0,
                longest_streak: 0,
                league: 'Bronze',
                last_challenge_date: null,
                last_wrong_attempt_at: null
            };
        }

        const statsData = data as any;

        return {
            total_xp: statsData?.total_xp || 0,
            monthly_xp: statsData?.monthly_xp || 0,
            current_streak: statsData?.current_streak || 0,
            longest_streak: statsData?.longest_streak || 0,
            league: this.calculateLeague(statsData?.total_xp || 0),
            last_challenge_date: statsData?.last_challenge_date || null,
            last_wrong_attempt_at: statsData?.last_wrong_attempt_at || null
        };
    },

    async getUserRank(userId: string): Promise<LeaderboardEntry | null> {
        try {
            // Get user's stats
            const { data: stats } = await supabase
                .from('user_stats')
                .select('monthly_xp, current_streak')
                .eq('user_id', userId)
                .maybeSingle();

            if (!stats) return null;

            // Count users with higher monthly_xp to determine rank
            const { count } = await supabase
                .from('user_stats')
                .select('*', { count: 'exact', head: true })
                .gt('monthly_xp', stats.monthly_xp);

            const rank = (count || 0) + 1;

            // Get profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', userId)
                .maybeSingle();

            const fullName = profile?.full_name || 'Anonymous';
            const firstName = fullName.split(' ')[0];

            return {
                user_id: userId,
                first_name: firstName,
                avatar_url: profile?.avatar_url || null,
                monthly_xp: stats.monthly_xp || 0,
                current_streak: stats.current_streak || 0,
                rank
            };
        } catch (error) {
            console.error("Error getting user rank:", error);
            return null;
        }
    },

    getStreakRewards(): Record<number, number> {
        return STREAK_REWARDS;
    }
};
