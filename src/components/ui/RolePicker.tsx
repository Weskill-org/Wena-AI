import React from "react";
import { motion } from "framer-motion";
import { Briefcase, GraduationCap, Code, Languages, BookOpen, Heart } from "lucide-react";

const ROLE_META: Record<string, { icon: React.ElementType; description: string; emoji: string }> = {
  "Mock Interviewer": { icon: Briefcase, description: "Practice technical interviews with real-time feedback", emoji: "💼" },
  "Career Counselor": { icon: GraduationCap, description: "Get personalized career guidance and upskilling advice", emoji: "🎓" },
  "Coding Buddy": { icon: Code, description: "Learn programming concepts with hands-on examples", emoji: "💻" },
  "Language Buddy": { icon: Languages, description: "Learn a new language through conversation practice", emoji: "🌍" },
  "Exam Buddy": { icon: BookOpen, description: "Rapid-fire exam prep with high-yield questions", emoji: "📝" },
  "WeCare": { icon: Heart, description: "A calming space for mindfulness and emotional support", emoji: "💚" },
};

interface RolePickerProps {
  roles: string[];
  selected: string;
  onSelect: (role: string) => void;
  disabled: boolean;
}

export const RolePicker: React.FC<RolePickerProps> = ({ roles, selected, onSelect, disabled }) => {
  return (
    <div className="grid grid-cols-2 gap-2 max-w-sm w-full">
      {roles.map((role) => {
        const meta = ROLE_META[role] || { icon: Briefcase, description: "", emoji: "🤖" };
        const isSelected = selected === role;
        return (
          <motion.button
            key={role}
            whileTap={{ scale: disabled ? 1 : 0.96 }}
            onClick={() => !disabled && onSelect(role)}
            disabled={disabled}
            className={`p-3 rounded-2xl border text-left transition-all duration-300 ${
              isSelected
                ? "bg-primary/15 border-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                : "bg-surface/50 border-border hover:border-primary/30"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="text-xl mb-1">{meta.emoji}</div>
            <div className={`text-xs font-semibold mb-0.5 ${isSelected ? "text-primary" : "text-foreground"}`}>
              {role}
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
              {meta.description}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};
