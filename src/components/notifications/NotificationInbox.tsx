import { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet";
import { Bell, CheckCircle2, Inbox, Loader2, Trophy, Zap, Gift, AlertCircle } from "lucide-react";
import { notificationService, Notification } from "@/services/notificationService";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface NotificationInboxProps {
    children: React.ReactNode;
    onUnreadChange?: (count: number) => void;
}

export function NotificationInbox({ children, onUnreadChange }: NotificationInboxProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const data = await notificationService.getNotifications(user.id);
            setNotifications(data);
            const unreadCount = data.filter(n => !n.read).length;
            onUnreadChange?.(unreadCount);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const subscription = notificationService.subscribeToNotifications(user.id, (newNotif) => {
                setNotifications(prev => [newNotif, ...prev]);
                onUnreadChange?.(notifications.filter(n => !n.read).length + 1);
            });
            return () => {
                subscription.unsubscribe();
            };
        }
    }, [user]);

    const handleMarkAllRead = async () => {
        if (!user) return;
        try {
            await notificationService.markAllAsRead(user.id);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            onUnreadChange?.(0);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            await notificationService.markAsRead(notification.id);
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
            const newUnreadCount = notifications.filter(n => !n.read && n.id !== notification.id).length;
            onUnreadChange?.(newUnreadCount);
        }

        if (notification.link) {
            setIsOpen(false);
            navigate(notification.link);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'badge': return <Trophy className="w-4 h-4 text-yellow-500" />;
            case 'streak': return <Zap className="w-4 h-4 text-orange-500" />;
            case 'referral': return <Gift className="w-4 h-4 text-primary" />;
            case 'challenge': return <AlertCircle className="w-4 h-4 text-accent" />;
            default: return <Bell className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md p-0 bg-background border-l border-border">
                <SheetHeader className="p-6 border-b border-border">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-primary" />
                            Notifications
                            {unreadCount > 0 && (
                                <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </SheetTitle>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                onClick={handleMarkAllRead}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Mark all as read
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                <div className="overflow-y-auto max-h-[calc(100vh-80px)] px-2 py-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                            <p className="text-sm">Loading your updates...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <Inbox className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg mb-1">All caught up!</h3>
                            <p className="text-muted-foreground text-sm">
                                No new notifications for you right now. Check back later for updates on your progress!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <AnimatePresence initial={false}>
                                {notifications.map((n) => (
                                    <motion.div
                                        key={n.id}
                                        layout
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        onClick={() => handleNotificationClick(n)}
                                        className={`p-4 rounded-2xl transition-all cursor-pointer group relative border ${n.read
                                                ? 'bg-background border-transparent hover:bg-surface/50'
                                                : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                                            }`}
                                    >
                                        {!n.read && (
                                            <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(124,58,237,0.5)]" />
                                        )}
                                        <div className="flex gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${n.read ? 'bg-muted' : 'bg-primary/10'
                                                }`}>
                                                {getTypeIcon(n.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <h4 className={`text-sm font-semibold truncate ${n.read ? 'text-foreground/80' : 'text-foreground'}`}>
                                                        {n.title}
                                                    </h4>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                                                    {n.message}
                                                </p>
                                                <span className="text-[10px] text-muted-foreground/60 font-medium">
                                                    {format(new Date(n.created_at), 'MMM dd, h:mm a')}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
