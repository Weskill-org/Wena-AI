import { useEffect, useState } from "react";
import { moduleService } from "@/services/moduleService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, TrendingUp } from "lucide-react";
import { addDays, format } from "date-fns";
import { ModuleWithProgress } from "@/types/module";

export function AdaptiveTimeline() {
    const [modules, setModules] = useState<ModuleWithProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [velocity, setVelocity] = useState(1.0); // 1.0 = standard speed

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await moduleService.getModules();
                setModules(data);
                // In a real app, we would calculate velocity based on past lesson completion times
                // For now, we'll simulate a slightly faster learner
                setVelocity(1.2);
            } catch (error) {
                console.error("Error fetching timeline data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return null;

    // Calculate timeline
    let currentDate = new Date();
    const timelineItems = modules
        .filter(m => !m.progress?.completion_percentage || m.progress.completion_percentage < 100)
        .map(module => {
            // Estimate duration: base duration / velocity
            // Assuming each module has roughly 120 mins of content if not specified
            const baseDurationMinutes = 120;
            const adjustedDuration = Math.round(baseDurationMinutes / velocity);

            // Calculate start and end dates
            // Assuming user studies 30 mins per day
            const daysNeeded = Math.ceil(adjustedDuration / 30);

            const startDate = new Date(currentDate);
            const endDate = addDays(startDate, daysNeeded);

            // Update current date for next module
            currentDate = addDays(endDate, 1); // 1 day break

            return {
                ...module,
                startDate,
                endDate,
                daysNeeded
            };
        });

    if (timelineItems.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Your Learning Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">You've completed all available modules! Great job!</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Your Learning Timeline
                    </div>
                    <div className="flex items-center gap-1 text-sm font-normal text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span>Pace: {Math.round(velocity * 100)}%</span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative border-l border-border ml-3 space-y-8 py-2">
                    {timelineItems.slice(0, 3).map((item, index) => (
                        <div key={item.id} className="ml-6 relative">
                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-primary bg-background" />
                            <h4 className="font-semibold text-sm">{item.title}</h4>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(item.startDate, "MMM d")} - {format(item.endDate, "MMM d")}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {item.daysNeeded} days
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
