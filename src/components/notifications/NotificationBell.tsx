import { Bell } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationInbox } from "./NotificationInbox";

export function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);

    return (
        <NotificationInbox onUnreadChange={setUnreadCount}>
            <motion.button
                whileTap={{ scale: 0.9 }}
                className="w-11 h-11 rounded-2xl bg-surface border border-border flex items-center justify-center relative active-scale"
            >
                <Bell className="w-5 h-5 text-foreground/80" />
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background shadow-lg shadow-primary/20"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </NotificationInbox>
    );
}
