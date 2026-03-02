import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, Video, LayoutDashboard, Camera, Mic, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: UserPlus,
    title: "Visitor Registration",
    desc: "Register with voice or form. Face capture on entry.",
    to: "/register",
  },
  {
    icon: Video,
    title: "Video Reviews",
    desc: "Record and share your expo experience.",
    to: "/review",
  },
  {
    icon: LayoutDashboard,
    title: "Admin Dashboard",
    desc: "Manage visitors, team members, and reviews.",
    to: "/admin",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary-foreground/20"
              style={{
                width: `${100 + i * 60}px`,
                height: `${100 + i * 60}px`,
                top: `${10 + i * 15}%`,
                right: `${-5 + i * 10}%`,
                animation: `float ${4 + i}s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>

        <div className="container max-w-6xl mx-auto px-4 py-20 md:py-32 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur rounded-full px-4 py-2 text-primary-foreground/90 text-sm mb-6">
              <Camera className="h-4 w-4" />
              <span>AI-Powered Expo Management</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground leading-tight">
              Welcome to<br />
              <span className="text-accent">ExpoPass</span>
            </h1>
            <p className="text-lg text-primary-foreground/80 mt-4 max-w-lg">
              Smart visitor registration with face capture, voice input, and video reviews — all in one platform.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                <Link to="/register">
                  <Mic className="h-5 w-5" />
                  Register Now
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/admin">
                  <LayoutDashboard className="h-5 w-5" />
                  Admin Panel
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="container max-w-6xl mx-auto px-4 py-16 md:py-24">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl md:text-3xl font-display font-bold text-center mb-12"
        >
          Everything you need for your expo
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <Link
                to={feature.to}
                className="group block bg-card rounded-xl p-6 shadow-card border border-border hover:shadow-elevated hover:border-primary/30 transition-all h-full"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{feature.desc}</p>
                <span className="inline-flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
                  Get Started <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer spacing for mobile nav */}
      <div className="h-20 md:h-0" />
    </div>
  );
};

export default Index;
