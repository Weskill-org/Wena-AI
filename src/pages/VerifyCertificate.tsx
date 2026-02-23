import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { certificateService } from "@/services/certificateService";
import { Award, CheckCircle, XCircle, Loader2, ArrowLeft, ShieldCheck, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function VerifyCertificate() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const [cert, setCert] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function verify() {
            if (!code) return;
            try {
                const data = await certificateService.getCertificateByCode(code);
                if (data) {
                    setCert(data);
                } else {
                    setError("Invalid certificate code. This certificate may be counterfeit or revoked.");
                }
            } catch (err) {
                console.error("Verification error:", err);
                setError("An error occurred during verification. Please try again later.");
            } finally {
                setLoading(false);
            }
        }
        verify();
    }, [code]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">Verifying certificate authenticity...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center">
            <div className="w-full max-w-2xl">
                <Button
                    variant="ghost"
                    className="mb-8"
                    onClick={() => navigate("/")}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                </Button>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`rounded-3xl p-8 border-2 transition-all duration-500 shadow-2xl backdrop-blur-sm ${cert
                            ? "bg-surface/50 border-primary/20 shadow-primary/10"
                            : "bg-destructive/5 border-destructive/20 shadow-destructive/5"
                        }`}
                >
                    {cert ? (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck className="w-12 h-12 text-primary" />
                            </div>

                            <h1 className="text-3xl font-bold mb-2">Verified Certificate</h1>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 text-green-500 text-sm font-semibold mb-8">
                                <CheckCircle className="w-4 h-4" />
                                Authenticity Confirmed
                            </div>

                            <div className="space-y-6 text-left border-t border-border pt-8 mt-4">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 p-2 bg-muted rounded-xl">
                                        <Award className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Certification</label>
                                        <p className="text-xl font-bold">{cert.title}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="mt-1 p-2 bg-muted rounded-xl">
                                        <User className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Recipient</label>
                                        <p className="text-xl font-bold">{cert.profiles?.full_name}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="mt-1 p-2 bg-muted rounded-xl">
                                        <Calendar className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Issued Date</label>
                                        <p className="text-lg font-semibold">{format(new Date(cert.issued_date), 'MMMM dd, yyyy')}</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-muted/50 rounded-2xl">
                                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Description</label>
                                    <p className="text-sm text-foreground/80 leading-relaxed mt-1">
                                        {cert.description || "Verified achievement record stored securely on the Wena AI Learning Platform."}
                                    </p>
                                </div>

                                <div className="pt-4 flex flex-col items-center gap-2">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Verification Code</p>
                                    <p className="text-lg font-mono font-bold text-primary tracking-widest">{cert.verification_code}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <XCircle className="w-12 h-12 text-destructive" />
                            </div>
                            <h1 className="text-3xl font-bold mb-4">Verification Failed</h1>
                            <p className="text-muted-foreground text-lg mb-8">{error}</p>
                            <Button onClick={() => navigate("/")} size="lg">Return to Platform</Button>
                        </div>
                    )}
                </motion.div>

                <p className="text-center mt-12 text-muted-foreground text-sm opacity-50">
                    Wena AI Learning Platform &copy; {new Date().getFullYear()} Secure Certification System
                </p>
            </div>
        </div>
    );
}
