import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Mail, Lock, User, Phone, Calendar, Sparkles, Gift, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { personaService } from "@/services/personaService";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CountryPrefix {
  id: string;
  country_code: string;
  country_name: string;
  dial_code: string;
  flag_emoji: string;
}

export default function Login() {
  const { signUp, signIn, signInWithMagicLink, resetPassword, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [countryPrefixes, setCountryPrefixes] = useState<CountryPrefix[]>([]);
  const [selectedPrefix, setSelectedPrefix] = useState<string>("+91");

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

  // Fetch country prefixes and auto-detect country from IP
  useEffect(() => {
    const fetchCountryPrefixes = async () => {
      const { data, error } = await supabase
        .from('country_prefixes')
        .select('*')
        .order('country_name');
      
      if (data && !error) {
        setCountryPrefixes(data);
      }
    };

    const detectCountryFromIP = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data?.country_code) {
          // Map country code to dial code
          const countryMapping: Record<string, string> = {
            'IN': '+91',
            'US': '+1',
            'AU': '+61',
            'FR': '+33',
            'GB': '+44',
          };
          const detectedPrefix = countryMapping[data.country_code];
          if (detectedPrefix) {
            setSelectedPrefix(detectedPrefix);
          }
        }
      } catch (error) {
        console.log('Could not detect country from IP, using default');
      }
    };

    fetchCountryPrefixes();
    detectCountryFromIP();
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

    // Validate phone number (exactly 10 digits)
    const phoneDigits = signUpData.phoneNumber.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive",
      });
      return;
    }

    // Validate date of birth (must be before 2020)
    const dobYear = new Date(signUpData.dateOfBirth).getFullYear();
    if (dobYear >= 2020 || isNaN(dobYear)) {
      toast({
        title: "Invalid Date of Birth",
        description: "Please provide your correct Date of Birth",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const fullPhoneNumber = `${selectedPrefix}${signUpData.phoneNumber}`;
    const { data, error } = await signUp(signUpData.email, signUpData.password, {
      full_name: signUpData.fullName,
      phone_number: fullPhoneNumber,
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(resetEmail);

    if (error) {
      toast({
        title: "Failed to send reset link",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setShowResetPassword(false);
      setResetEmail("");
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
                    className="w-full mt-4"
                  >
                    {loading ? "Signing in..." : "Sign In 🚀"}
                  </GradientButton>

                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors mt-3"
                  >
                    Forgot your password?
                  </button>
                </motion.form>
              </AnimatePresence>

              {/* Reset Password Modal */}
              <AnimatePresence>
                {showResetPassword && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setShowResetPassword(false)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="text-xl font-semibold text-foreground mb-2">Reset Password</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Enter your email and we'll send you a link to reset your password.
                      </p>
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email" className="text-foreground flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email
                          </Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="your@email.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="bg-input border-border rounded-xl h-12"
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setShowResetPassword(false)}
                            className="flex-1 h-11 rounded-xl border border-border text-foreground hover:bg-muted transition-colors"
                          >
                            Cancel
                          </button>
                          <GradientButton
                            variant="primary"
                            type="submit"
                            disabled={loading}
                            className="flex-1"
                          >
                            {loading ? "Sending..." : "Send Link"}
                          </GradientButton>
                        </div>
                      </form>
                    </motion.div>
                  </motion.div>
                )}
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
                    <div className="flex gap-2">
                      <Select value={selectedPrefix} onValueChange={setSelectedPrefix}>
                        <SelectTrigger className="w-[110px] bg-input border-border rounded-xl h-12 shrink-0">
                          <SelectValue>
                            {countryPrefixes.find(c => c.dial_code === selectedPrefix)?.flag_emoji || '🌍'} {selectedPrefix}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-surface border-border">
                          {countryPrefixes.map((country) => (
                            <SelectItem 
                              key={country.id} 
                              value={country.dial_code}
                              className="cursor-pointer"
                            >
                              {country.flag_emoji} {country.country_name} ({country.dial_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="signup-phone"
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="9876543210"
                        value={signUpData.phoneNumber}
                        onChange={(e) => {
                          // Keep only digits, max 10
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setSignUpData({ ...signUpData, phoneNumber: value });
                        }}
                        maxLength={10}
                        className="bg-input border-border rounded-xl h-12 flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-dob" className="text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date of Birth
                    </Label>
                    <Input
                      id="signup-dob"
                      type="date"
                      max="2019-12-31"
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
          By continuing, you agree to our <a href="/terms" className="underline hover:text-primary transition-colors">Terms of Service</a> and <a href="/privacy" className="underline hover:text-primary transition-colors">Privacy Policy</a> 🔒
        </motion.p>
      </motion.div>
    </div>
  );
}
