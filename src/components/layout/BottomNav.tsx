import { Home, BookOpen, Wallet, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: BookOpen, label: "Learn", path: "/modules" },
  { icon: Wallet, label: "Wallet", path: "/wallet" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-lg border-t border-border z-50">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex justify-around items-center h-16">
          {navItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-smooth flex-1"
              activeClassName="text-primary"
            >
              {({ isActive }) => (
                <motion.div
                  className="flex flex-col items-center gap-1"
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                  <span className="text-xs font-medium">{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gradient-primary"
                    />
                  )}
                </motion.div>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
