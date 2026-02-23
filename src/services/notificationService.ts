import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 'challenge' | 'streak' | 'referral' | 'badge' | 'group';

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
    link: string | null;
    created_at: string;
}

export const notificationService = {
    async getNotifications(userId: string) {
        const { data, error } = await (supabase
            .from('notifications' as any) as any)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Notification[];
    },

    async markAsRead(notificationId: string) {
        const { error } = await (supabase
            .from('notifications' as any) as any)
            .update({ read: true })
            .eq('id', notificationId);

        if (error) throw error;
    },

    async markAllAsRead(userId: string) {
        const { error } = await (supabase
            .from('notifications' as any) as any)
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) throw error;
    },

    subscribeToNotifications(userId: string, onNotification: (payload: any) => void) {
        return supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    onNotification(payload.new);
                }
            )
            .subscribe();
    }
};
