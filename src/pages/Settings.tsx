import { motion } from "framer-motion";
import { ArrowLeft, User, Lock, Bell, Shield, LogOut, ChevronRight, Sun, Moon } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";


export default function Settings() {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({
                title: "Error",
                description: "Passwords do not match",
                variant: "destructive",
            });
            return;
        }

        if (newPassword.length < 6) {
            toast({
                title: "Error",
                description: "Password must be at least 6 characters",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            toast({
                title: "Success",
                description: "Password updated successfully",
            });
            setIsPasswordOpen(false);
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const settingsGroups = [
        {
            title: "Account",
            items: [
                {
                    icon: User,
                    label: "Personal Information",
                    description: "Update your profile details",
                    action: () => navigate('/profile/edit'),
                },
                {
                    icon: Lock,
                    label: "Security",
                    description: "Change your password",
                    customAction: (
                        <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
                            <DialogTrigger asChild>
                                <div className="flex-1 flex items-center justify-between cursor-pointer">
                                    <div>
                                        <div className="font-semibold text-foreground">Security</div>
                                        <div className="text-sm text-muted-foreground">Change your password</div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </div>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Change Password</DialogTitle>
                                    <DialogDescription>
                                        Enter your new password below.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handlePasswordChange} className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="new-password">New Password</Label>
                                        <Input
                                            id="new-password"
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-password">Confirm Password</Label>
                                        <Input
                                            id="confirm-password"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full bg-gradient-primary text-white"
                                        disabled={loading}
                                    >
                                        {loading ? "Updating..." : "Update Password"}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )
                },
            ]
        },
        {
            title: "Preferences",
            items: [
                {
                    icon: theme === 'dark' ? Moon : Sun,
                    label: "Theme",
                    description: theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode",
                    customAction: (
                        <div 
                            className="flex-1 flex items-center justify-between cursor-pointer"
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        >
                            <div>
                                <div className="font-semibold text-foreground">Theme</div>
                                <div className="text-sm text-muted-foreground">
                                    {theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                                </div>
                            </div>
                            <ThemeToggle />
                        </div>
                    )


                },
                {
                    icon: Bell,
                    label: "Notifications",
                    description: "Manage your alerts",
                    action: () => toast({ description: "Notification settings coming soon!" }),
                },

                {
                    icon: Shield,
                    label: "Privacy",
                    description: "Control your data",
                    action: () => toast({ description: "Privacy settings coming soon!" }),
                },
            ]
        }
    ];

    return (
        <div className="min-h-screen pb-20 px-4 pt-8 bg-background">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex items-center gap-4"
            >
                <button
                    onClick={() => navigate('/profile')}
                    className="w-10 h-10 rounded-xl bg-surface/50 backdrop-blur-lg border border-border flex items-center justify-center transition-smooth hover:bg-surface"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-muted-foreground text-sm">Manage your preferences</p>
                </div>
            </motion.div>

            <div className="space-y-8">
                {settingsGroups.map((group, groupIndex) => (
                    <motion.div
                        key={group.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: groupIndex * 0.1 }}
                    >
                        <h2 className="text-lg font-semibold mb-4 px-2">{group.title}</h2>
                        <div className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl overflow-hidden">
                            {group.items.map((item, index) => (
                                <div
                                    key={item.label}
                                    className={`p-4 flex items-center gap-4 transition-colors hover:bg-white/5 ${index !== group.items.length - 1 ? 'border-b border-border/50' : ''
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gradient-primary/10 flex items-center justify-center">
                                        <item.icon className="w-5 h-5 text-primary" />
                                    </div>

                                    {item.customAction ? (
                                        item.customAction
                                    ) : (
                                        <button
                                            onClick={item.action}
                                            className="flex-1 flex items-center justify-between text-left"
                                        >
                                            <div>
                                                <div className="font-semibold text-foreground">{item.label}</div>
                                                <div className="text-sm text-muted-foreground">{item.description}</div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}

                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    onClick={handleLogout}
                    className="w-full bg-destructive/10 text-destructive rounded-2xl p-4 flex items-center justify-center gap-2 font-semibold transition-smooth hover:bg-destructive/20 mt-8"
                >
                    <LogOut className="w-5 h-5" />
                    Log Out
                </motion.button>
            </div>

            <BottomNav />
        </div>
    );
}
