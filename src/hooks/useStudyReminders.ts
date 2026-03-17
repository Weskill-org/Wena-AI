import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useStudyReminders() {
    const { user } = useAuth();
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Function to check if we should send a reminder
    const checkReminders = async () => {
        if (!user) return;

        try {
            // Get user's current preferences and stats
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('preferred_study_time, push_notifications_enabled, in_app_reminders_enabled, last_reminded_date')
                .eq('id', user.id)
                .single();

            const { data: stats } = await supabase
                .from('user_stats')
                .select('current_streak, updated_at')
                .eq('user_id', user.id)
                .maybeSingle();

            if (profileError || !profile) return;

            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // 1. Check for Streak at Risk (if streak > 0 and not updated today)
            const lastUpdate = stats?.updated_at ? new Date(stats.updated_at) : null;
            const hasStudiedToday = lastUpdate && lastUpdate.toISOString().split('T')[0] === todayStr;

            if (stats && stats.current_streak > 0 && !hasStudiedToday) {
                const hoursSinceLastUpdate = (now.getTime() - lastUpdate!.getTime()) / (1000 * 60 * 60);

                // If it's been > 20 hours since last update, warn them
                if (hoursSinceLastUpdate > 20) {
                    // Check if we already sent a streak warning today (checking local column first)
                    if ((profile as any).last_streak_warning_date !== todayStr) {
                        // Double check DB notifications to be safe (using limit(1) to avoid Multiple objects error)
                        const { data: existingWarning } = await (supabase
                            .from('notifications' as any) as any)
                            .select('id')
                            .eq('user_id', user.id)
                            .eq('type', 'streak')
                            .gte('created_at', `${todayStr}T00:00:00Z`)
                            .limit(1)
                            .maybeSingle();

                        if (!existingWarning) {
                            // Update profile first to prevent race conditions from 5m interval
                            await supabase
                                .from('profiles')
                                .update({ last_reminded_date: todayStr } as any)
                                .eq('id', user.id);

                            await (supabase.from('notifications' as any) as any).insert({
                                user_id: user.id,
                                title: 'Streak at risk! 🔥',
                                message: `Your ${stats.current_streak} day streak will break soon! Study now to keep it alive.`,
                                type: 'streak',
                                link: '/flashcards'
                            });

                            if (profile.in_app_reminders_enabled) {
                                toast.error("Streak at risk! 🔥", {
                                    description: "Study now to keep your streak alive!",
                                });
                            }
                        }
                    }
                }
            }

            // 2. Daily Study Reminder
            if (profile.last_reminded_date === todayStr) return;

            // Check if current time is >= preferred study time
            const [prefHours, prefMinutes] = profile.preferred_study_time.split(':').map(Number);

            const isTimeForReminder =
                now.getHours() > prefHours ||
                (now.getHours() === prefHours && now.getMinutes() >= prefMinutes);

            if (isTimeForReminder) {
                // If they've already studied, maybe we don't need a daily reminder, 
                // but if not, remind them.
                if (!hasStudiedToday) {
                    const title = "Time for your daily study session! 📚";
                    const body = "Ready to hit your learning goal for today?";

                    // Insert into DB
                    await (supabase.from('notifications' as any) as any).insert({
                        user_id: user.id,
                        title,
                        message: body,
                        type: 'streak',
                        link: '/flashcards'
                    });

                    // Send In-App Toast
                    if (profile.in_app_reminders_enabled) {
                        toast(title, {
                            description: body,
                            duration: 10000,
                            position: 'top-center',
                            icon: '🔔'
                        });
                    }

                    // Send Native Push Notification
                    if (profile.push_notifications_enabled && 'Notification' in window && Notification.permission === 'granted') {
                        new Notification(title, {
                            body: body,
                            icon: '/favicon.ico'
                        });
                    }

                    // Update last_reminded_date in DB to prevent repeated triggers today
                    await supabase
                        .from('profiles')
                        .update({ last_reminded_date: todayStr })
                        .eq('id', user.id);
                }
            }

        } catch (error) {
            console.error("Error checking study reminders:", error);
        }
    };

    useEffect(() => {
        if (!user) {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
            return;
        }

        // Run check immediately on mount
        checkReminders();

        // Then check every 5 minutes (reduced frequency from 1m to 5m to be less aggressive)
        checkIntervalRef.current = setInterval(checkReminders, 5 * 60 * 1000);

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
        };
    }, [user]);
}

