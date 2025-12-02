import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Mail, Lock, User, Phone, Calendar, Sparkles, Gift } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { personaService } from "@/services/personaService";

export default function Login() {
  const { signUp, signIn, signInWithMagicLink, user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Sign Up form
  const [signUpData, setSignUpData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });

  // Check for referral code in URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setSignUpData(prev => ({ ...prev, referralCode: refCode.toUpperCase() }));
    }
  }, []);

  // Sign In form
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  // Magic Link form
  const [magicLinkEmail, setMagicLinkEmail] = useState("");

  // Redirect if already logged in
  if (user) {
    window.location.href = "/";
    return null;
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (!signUpData.fullName || !signUpData.email || !signUpData.phoneNumber || !signUpData.dateOfBirth || !signUpData.password) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data, error } = await signUp(signUpData.email, signUpData.password, {
      full_name: signUpData.fullName,
      phone_number: signUpData.phoneNumber,
      date_of_birth: signUpData.dateOfBirth,
      referral_code: signUpData.referralCode || null,
    });

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (data?.user?.id) {
      // Initialize Persona
      try {
        await personaService.updatePersona(data.user.id, {
          name: signUpData.fullName,
          date_of_birth: signUpData.dateOfBirth
        });
      } catch (e) {
        console.error("Error initializing persona:", e);
      }
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signInData.email || !signInData.password) {
      toast({
        title: "Missing information",
        description: "Please enter your email and password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await signIn(signInData.email, signInData.password);

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!magicLinkEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await signInWithMagicLink(magicLinkEmail);

    if (error) {
      toast({
        title: "Failed to send magic link",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iaHNsKDI4MCwgMTAwJSwgNzAlKSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40" />

      {/* Floating Elements */}
      <motion.div
        className="absolute top-20 left-10 w-20 h-20 rounded-full bg-primary/20 blur-xl"
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-secondary/20 blur-xl"
        animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Logo & Header */}
        <motion.div
          className="flex flex-col items-center gap-4 mb-8"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <motion.div
            animate={{
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            className="w-20 h-20 rounded-3xl bg-gradient-primary flex items-center justify-center glow-primary"
          >
            <Bot className="w-10 h-10 text-white" />
          </motion.div>
          <div className="text-center">
            <motion.h1
              className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent flex items-center gap-2 justify-center"
              animate={{ opacity: [1, 0.8, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Wena AI - Personal Tutor
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </motion.h1>
            <p className="text-muted-foreground mt-2 text-lg">
              World's First Fully AI Based Learning Platform
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              1 Credit = ₹1
            </p>
          </div>
        </motion.div>

        {/* Auth Forms */}
        <motion.div
          className="bg-surface/50 backdrop-blur-lg rounded-3xl p-8 border border-border/50 shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50">
              <TabsTrigger value="signin" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                Sign Up
              </TabsTrigger>
              <TabsTrigger value="magic" className="data-[state=active]:bg-gradient-secondary data-[state=active]:text-white">
                Magic Link
              </TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="signin">
              <AnimatePresence mode="wait">
                <motion.form
                  key="signin"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleSignIn}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      className="bg-input border-border rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Password
                    </Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      className="bg-input border-border rounded-xl h-12"
                    />
                  </div>
                  <GradientButton
                    variant="primary"
                    glow
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6"
                  >
                    {loading ? "Signing in..." : "Sign In 🚀"}
                  </GradientButton>
                </motion.form>
              </AnimatePresence>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup">
              <AnimatePresence mode="wait">
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleSignUp}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-foreground flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Full Name
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signUpData.fullName}
                      onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                      className="bg-input border-border rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      className="bg-input border-border rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone" className="text-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+1 234 567 8900"
                      value={signUpData.phoneNumber}
                      onChange={(e) => setSignUpData({ ...signUpData, phoneNumber: e.target.value })}
                      className="bg-input border-border rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-dob" className="text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date of Birth
                    </Label>
                    <Input
                      id="signup-dob"
                      type="date"
                      value={signUpData.dateOfBirth}
                      onChange={(e) => setSignUpData({ ...signUpData, dateOfBirth: e.target.value })}
                      className="bg-input border-border rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Password
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      className="bg-input border-border rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm" className="text-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Confirm Password
                    </Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                      className="bg-input border-border rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-referral" className="text-foreground flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      Referral Code (Optional)
                    </Label>
                    <Input
                      id="signup-referral"
                      type="text"
                      placeholder="Enter referral code"
                      value={signUpData.referralCode}
                      onChange={(e) => setSignUpData({ ...signUpData, referralCode: e.target.value.toUpperCase() })}
                      className="bg-input border-border rounded-xl h-12 uppercase"
                      disabled={!!new URLSearchParams(window.location.search).get('ref')}
                    />
                    {signUpData.referralCode && (
                      <p className="text-xs text-primary font-medium bg-primary/10 rounded-lg px-3 py-2 mt-2">
                        🎉 Get 100 extra credits when you sign up with this referral code!
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70">
                      New users get 50 credits. Use a referral code to get 100 bonus credits (total 150)!
                    </p>
                  </div>
                  <GradientButton
                    variant="primary"
                    glow
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6"
                  >
                    {loading ? "Creating account..." : "Create Account 🎉"}
                  </GradientButton>
                </motion.form>
              </AnimatePresence>
            </TabsContent>

            {/* Magic Link Tab */}
            <TabsContent value="magic">
              <AnimatePresence mode="wait">
                <motion.form
                  key="magic"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleMagicLink}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="magic-email" className="text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Email Address
                    </Label>
                    <Input
                      id="magic-email"
                      type="email"
                      placeholder="your@email.com"
                      value={magicLinkEmail}
                      onChange={(e) => setMagicLinkEmail(e.target.value)}
                      className="bg-input border-border rounded-xl h-12"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We'll send you a magic link to sign in without a password! ✨
                  </p>
                  <GradientButton
                    variant="secondary"
                    glow
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6"
                  >
                    {loading ? "Sending magic link..." : "Send Magic Link ✨"}
                  </GradientButton>
                </motion.form>
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-center text-xs text-muted-foreground mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          By continuing, you agree to our Terms of Service and Privacy Policy 🔒
        </motion.p>
      </motion.div>
    </div>
  );
}
