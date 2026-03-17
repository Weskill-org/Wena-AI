import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GradientButton } from "@/components/ui/gradient-button";
import { ChevronRight } from "lucide-react";

const slides = [
  {
    emoji: "🤖",
    title: "AI Voice Tutor",
    description: "Practice interviews, learn languages, and get career guidance with Wena — your personal AI voice companion.",
    gradient: "primary",
  },
  {
    emoji: "🧠",
    title: "Smart Flashcards",
    description: "Personalized flashcards powered by spaced repetition. Master any topic with daily bite-sized sessions.",
    gradient: "secondary",
  },
  {
    emoji: "🎯",
    title: "Career Roles & Challenges",
    description: "Pick a career path, unlock modules, earn XP, and climb the leaderboard. Learning has never been this fun.",
    gradient: "accent",
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const finish = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    navigate("/login", { replace: true });
    window.location.reload();
  };

  const next = () => {
    if (current < slides.length - 1) setCurrent(current + 1);
    else finish();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-6 py-12 bg-background safe-area-top safe-area-bottom">
      {/* Skip */}
      <div className="w-full flex justify-end">
        <button onClick={finish} className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
          Skip
        </button>
      </div>

      {/* Slide */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.35 }}
          className="flex-1 flex flex-col items-center justify-center text-center max-w-sm"
        >
          <div className={`w-28 h-28 rounded-3xl bg-gradient-${slides[current].gradient} flex items-center justify-center mb-8 glow-${slides[current].gradient}`}>
            <span className="text-5xl">{slides[current].emoji}</span>
          </div>
          <h2 className="text-3xl font-bold mb-3">{slides[current].title}</h2>
          <p className="text-muted-foreground leading-relaxed">{slides[current].description}</p>
        </motion.div>
      </AnimatePresence>

      {/* Bottom */}
      <div className="w-full max-w-sm space-y-5">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        <GradientButton onClick={next} className="w-full h-13 text-base font-semibold">
          {current < slides.length - 1 ? (
            <>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </>
          ) : (
            "Get Started"
          )}
        </GradientButton>
      </div>
    </div>
  );
}
