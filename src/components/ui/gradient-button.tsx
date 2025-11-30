import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface GradientButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "primary" | "secondary" | "accent";
  glow?: boolean;
}

const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant = "primary", glow = false, children, ...props }, ref) => {
    const variants = {
      primary: "bg-gradient-primary hover:opacity-90",
      secondary: "bg-gradient-secondary hover:opacity-90",
      accent: "bg-gradient-accent hover:opacity-90",
    };

    const glowClasses = {
      primary: "glow-primary",
      secondary: "glow-secondary",
      accent: "glow-accent",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "px-6 py-3 rounded-2xl font-semibold text-white transition-smooth flex items-center justify-center",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          glow && glowClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

GradientButton.displayName = "GradientButton";

export { GradientButton };
