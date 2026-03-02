import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, Video, LayoutDashboard, Home } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/register", label: "Register", icon: UserPlus },
  { to: "/review", label: "Review", icon: Video },
  { to: "/admin", label: "Admin", icon: LayoutDashboard },
];

export function AppNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:fixed md:top-0 md:bottom-auto">
      <div className="bg-card/90 backdrop-blur-lg border-t md:border-b md:border-t-0 border-border">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between md:justify-start md:gap-8 h-16">
            <Link to="/" className="hidden md:block font-display font-bold text-lg text-primary">
              ExpoPass
            </Link>
            <div className="flex items-center gap-1 w-full md:w-auto justify-around md:justify-start">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`relative flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-0.5 md:-bottom-[1.125rem] left-2 right-2 h-0.5 bg-primary rounded-full"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
