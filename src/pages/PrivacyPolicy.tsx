import { motion } from "framer-motion";
import { GradientButton } from "@/components/ui/gradient-button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
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
                        <div className="w-12 h-12 rounded-2xl bg-gradient-secondary flex items-center justify-center shadow-lg shadow-secondary/20">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                            Privacy Policy
                        </h1>
                    </div>

                    <div className="bg-surface/50 backdrop-blur-lg rounded-3xl p-8 border border-border/50 shadow-xl space-y-6 text-muted-foreground">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-foreground">1. Data Collection</h2>
                            <p>
                                We collect information you provide directly to us when you create an account, update your profile, or interact with our AI tutor. This includes:
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Personal information (Name, Email, Phone Number)</li>
                                <li>Usage data and interaction logs</li>
                                <li>Performance and learning progress data</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-foreground">2. How We Use Your Data</h2>
                            <p>
                                We use the collected data to:
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Provide personalized learning experiences</li>
                                <li>Improve our AI models and service quality</li>
                                <li>Communicate with you about updates and features</li>
                                <li>Ensure the security of our platform</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-foreground">3. Data Sharing</h2>
                            <p>
                                We do not sell your personal data. We may share your data with trusted third-party service providers who assist us in operating our platform, subject to confidentiality obligations.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-foreground">4. Data Security</h2>
                            <p>
                                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-foreground">5. Your Rights</h2>
                            <p>
                                You have the right to access, correct, or delete your personal data. You can manage your account settings directly within the app or contact support for assistance.
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
