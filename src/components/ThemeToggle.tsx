import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="w-12 h-6" />;

    const isDark = theme === 'dark';

    return (
        <div
            className="relative w-14 h-7 rounded-full bg-muted/30 border border-border/50 p-1 flex items-center transition-colors pointer-events-none"
            aria-label="Toggle theme"
        >


            <motion.div
                className="absolute w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg"
                animate={{
                    x: isDark ? 28 : 0,
                }}
                transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                }}
            >
                {isDark ? (
                    <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <Moon className="w-3 h-3 text-white fill-white" />
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ scale: 0, rotate: 90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <Sun className="w-3 h-3 text-white fill-white" />
                    </motion.div>
                )}

            </motion.div>
            
            <div className="flex justify-between w-full px-1.5 opacity-40">
                <Sun className={`w-3 h-3 ${!isDark ? 'invisible' : ''}`} />
                <Moon className={`w-3 h-3 ${isDark ? 'invisible' : ''}`} />
            </div>
        </div>
    );
}
