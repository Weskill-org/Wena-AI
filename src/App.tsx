import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AiChat from "./pages/AiChat";
import Modules from "./pages/Modules";
import ModuleView from "./pages/ModuleView";
import LessonView from "./pages/LessonView";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import Certificates from "./pages/Certificates";
import AiPersona from "./pages/AiPersona";
import Flashcards from "./pages/Flashcards";
import Challenge from "./pages/Challenge";
import Tournament from "./pages/Tournament";
import Referral from "./pages/Referral";
import Settings from "./pages/Settings";
import LearningPath from "./pages/LearningPath";
import NotFound from "./pages/NotFound";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TrophyRoom from "./pages/TrophyRoom";
import VerifyCertificate from "./pages/VerifyCertificate";
import { useStudyReminders } from "./hooks/useStudyReminders";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function GlobalHooks() {
  useStudyReminders();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <GlobalHooks />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><AiChat /></ProtectedRoute>} />
            <Route path="/modules" element={<ProtectedRoute><Modules /></ProtectedRoute>} />
            <Route path="/modules/:moduleId" element={<ProtectedRoute><ModuleView /></ProtectedRoute>} />
            <Route path="/modules/:moduleId/lessons/:lessonId" element={<ProtectedRoute><LessonView /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/edit" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
            <Route path="/certificates" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
            <Route path="/profile/trophy-room" element={<ProtectedRoute><TrophyRoom /></ProtectedRoute>} />
            <Route path="/profile/ai-persona" element={<ProtectedRoute><AiPersona /></ProtectedRoute>} />
            <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
            <Route path="/challenge" element={<ProtectedRoute><Challenge /></ProtectedRoute>} />
            <Route path="/tournament" element={<ProtectedRoute><Tournament /></ProtectedRoute>} />
            <Route path="/referral" element={<ProtectedRoute><Referral /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/learning-path" element={<ProtectedRoute><LearningPath /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/privacypolicy" element={<PrivacyPolicy />} />
            <Route path="/verify/:code" element={<VerifyCertificate />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
