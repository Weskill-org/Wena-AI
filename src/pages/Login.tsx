import { useState } from "react";
import { motion } from "framer-motion";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { Bot } from "lucide-react";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");

  const handleSendOTP = () => {
    if (phone.length >= 10) {
      setStep("otp");
    }
  };

  const handleVerifyOTP = () => {
    if (otp.length === 6) {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 animate-pulse-glow" />
      
      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md space-y-8"
      >
        {/* Logo */}
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="w-20 h-20 rounded-3xl bg-gradient-primary flex items-center justify-center glow-primary"
          >
            <Bot className="w-10 h-10 text-white" />
          </motion.div>
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              WeSkill AI
            </h1>
            <p className="text-muted-foreground mt-2">
              Your AI buddy for personalized learning
            </p>
          </div>
        </motion.div>

        {/* Login Form */}
        <motion.div
          className="bg-surface/50 backdrop-blur-lg rounded-3xl p-8 border border-border space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {step === "phone" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <div className="bg-input rounded-xl px-4 py-3 text-foreground font-medium flex items-center border border-border">
                    +1
                  </div>
                  <Input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 bg-input border-border rounded-xl h-12 text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <GradientButton
                variant="primary"
                glow
                onClick={handleSendOTP}
                disabled={phone.length < 10}
                className="w-full"
              >
                Send OTP
              </GradientButton>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Enter OTP
                </label>
                <Input
                  type="text"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  maxLength={6}
                  className="bg-input border-border rounded-xl h-12 text-center text-2xl tracking-widest text-foreground"
                />
              </div>
              <GradientButton
                variant="secondary"
                glow
                onClick={handleVerifyOTP}
                disabled={otp.length !== 6}
                className="w-full"
              >
                Verify & Continue
              </GradientButton>
              <button
                onClick={() => setStep("phone")}
                className="text-sm text-muted-foreground hover:text-foreground transition-smooth w-full"
              >
                Change phone number
              </button>
            </>
          )}
        </motion.div>

        {/* Additional Info */}
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
