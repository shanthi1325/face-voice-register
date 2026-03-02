import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppNav } from "@/components/AppNav";
import Index from "./pages/Index";
import VisitorRegistration from "./pages/VisitorRegistration";
import RecordReview from "./pages/RecordReview";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppNav />
        <div className="pt-0 md:pt-16 pb-16 md:pb-0">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/register" element={<VisitorRegistration />} />
            <Route path="/review" element={<RecordReview />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
