import { Home, BookOpen, Wallet, User, Bot } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: BookOpen, label: "Learn", path: "/modules" },
  { icon: Bot, label: "AI", path: "/chat" },
  { icon: Wallet, label: "Wallet", path: "/wallet" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      {/* Gradient blur background */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none h-24 -top-8" />
      
      <div className="relative glass border-t border-border/50">
        <div className="max-w-lg mx-auto px-2">
          <div className="flex justify-around items-center h-16">
            {navItems.map(({ icon: Icon, label, path }) => (
              <NavLink
                key={path}
                to={path}
                className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground transition-all duration-200 flex-1 py-2 touch-target active-scale"
                activeClassName="text-primary"
              >
                {({ isActive }) => (
                  <div className="relative flex flex-col items-center gap-0.5">
                    {/* Active indicator background */}
                    {isActive && (
                      <div className="absolute -inset-x-3 -inset-y-1 bg-primary/10 rounded-2xl" />
                    )}
                    
                    <div className="relative">
                      <Icon 
                        className={cn(
                          "w-5 h-5 transition-all duration-200",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )} 
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      {/* Glow effect for active */}
                      {isActive && (
                        <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full scale-150" />
                      )}
                    </div>
                    
                    <span className={cn(
                      "text-[10px] font-medium relative z-10 transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}>
                      {label}
                    </span>
                    
                    {/* Active dot indicator */}
                    {isActive && (
                      <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};
