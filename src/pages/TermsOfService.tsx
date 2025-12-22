import { motion } from "framer-motion";
import { GradientButton } from "@/components/ui/gradient-button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ScrollText } from "lucide-react";

export default function TermsOfService() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iaHNsKDI4MCwgMTAwJSwgNzAlKSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />

            <div className="container mx-auto px-4 py-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-8"
                >
                    <GradientButton
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 pl-0 hover:pl-2 transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </GradientButton>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <ScrollText className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Terms of Service
                        </h1>
                    </div>

                    <div className="bg-surface/50 backdrop-blur-lg rounded-3xl p-8 border border-border/50 shadow-xl space-y-6 text-muted-foreground">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-foreground">1. Introduction</h2>
                            <p>
                                Welcome to Wena AI. By accessing or using our platform, you agree to be bound by these Terms of Service.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-foreground">2. User Accounts</h2>
                            <p>
                                To use certain features of the platform, you must register for an account. You are responsible for maintaining the confidentiality of your account credentials.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-foreground">3. Use of Service</h2>
                            <p>
                                You agree to use Wena AI for lawful purposes only and in accordance with these Terms. You must not use the platform to harass, abuse, or harm others.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-foreground">4. Intellectual Property</h2>
                            <p>
                                Wena AI and its original content, features, and functionality are owned by Weskill and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-foreground">5. Termination</h2>
                            <p>
                                We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                            </p>
                        </section>

                        <div className="pt-8 border-t border-border/50 text-sm">
                            <p>Last updated: December 2025</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
