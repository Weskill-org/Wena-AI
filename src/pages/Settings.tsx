import { motion } from "framer-motion";
import { ArrowLeft, User, Lock, Bell, Shield, LogOut, ChevronRight, Clock } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Settings() {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Study Scheduler State
    const [goalMinutes, setGoalMinutes] = useState("30");
    const [studyTime, setStudyTime] = useState("18:00");
    const [pushEnabled, setPushEnabled] = useState(false);
    const [inAppEnabled, setInAppEnabled] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);

    const { user } = useAuth();

    // Fetch initial settings
    useEffect(() => {
        const fetchSettings = async () => {
            if (!user) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('learning_goal_minutes, preferred_study_time, push_notifications_enabled, in_app_reminders_enabled')
                .eq('id', user.id)
                .single();

            if (data && !error) {
                setGoalMinutes(data.learning_goal_minutes?.toString() || "30");
                // Convert full time string (HH:MM:SS) to HH:MM for input
                setStudyTime(data.preferred_study_time?.substring(0, 5) || "18:00");
                setPushEnabled(data.push_notifications_enabled ?? false);
                setInAppEnabled(data.in_app_reminders_enabled ?? true);
            }
        };
        fetchSettings();
    }, [user]);

    const saveStudySettings = async () => {
        if (!user) return;
        setSavingSettings(true);
        try {
            // Request notification permission if enabling push
            if (pushEnabled && 'Notification' in window && Notification.permission !== 'granted') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    setPushEnabled(false);
                    toast({
                        title: "Permission Denied",
                        description: "Push notifications were not enabled.",
                        variant: "destructive"
                    });
                    setSavingSettings(false);
                    return;
                }
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    learning_goal_minutes: parseInt(goalMinutes),
                    preferred_study_time: `${studyTime}:00`,
                    push_notifications_enabled: pushEnabled,
                    in_app_reminders_enabled: inAppEnabled
                })
                .eq('id', user.id);

            if (error) throw error;

            toast({
                title: "Settings Saved",
                description: "Your study schedule has been updated.",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save settings.",
                variant: "destructive"
            });
        } finally {
            setSavingSettings(false);
        }
    };

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
            title: "Study Schedule",
            items: [
                {
                    icon: Clock,
                    label: "Daily Learning Goal",
                    description: "Set your daily target",
                    customAction: (
                        <Select value={goalMinutes} onValueChange={setGoalMinutes}>
                            <SelectTrigger className="w-[120px] h-8 bg-transparent border-border/50">
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="15">15 mins</SelectItem>
                                <SelectItem value="30">30 mins</SelectItem>
                                <SelectItem value="45">45 mins</SelectItem>
                                <SelectItem value="60">60 mins</SelectItem>
                                <SelectItem value="120">2 hours</SelectItem>
                            </SelectContent>
                        </Select>
                    )
                },
                {
                    icon: Bell,
                    label: "Preferred Study Time",
                    description: "When should we remind you?",
                    customAction: (
                        <div className="flex items-center gap-2">
                            <Input
                                type="time"
                                value={studyTime}
                                onChange={(e) => setStudyTime(e.target.value)}
                                className="w-[120px] h-8 bg-transparent border-border/50 text-right"
                            />
                        </div>
                    )
                },
                {
                    icon: Shield,
                    label: "Push Notifications",
                    description: "Get alerts on your device",
                    customAction: (
                        <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
                    )
                },
                {
                    icon: Bell,
                    label: "In-App Reminders",
                    description: "Show toast notifications",
                    customAction: (
                        <Switch checked={inAppEnabled} onCheckedChange={setInAppEnabled} />
                    )
                }
            ],
            footerAction: saveStudySettings,
            footerLabel: savingSettings ? "Saving..." : "Save Schedule"
        },
        {
            title: "Preferences",
            items: [
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
                        {group.footerAction && (
                            <div className="mt-3 flex justify-end px-2">
                                <Button
                                    size="sm"
                                    onClick={group.footerAction}
                                    disabled={savingSettings}
                                    className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 backdrop-blur-sm"
                                >
                                    {group.footerLabel}
                                </Button>
                            </div>
                        )}
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
