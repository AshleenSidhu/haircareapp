import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectRoute";
import SinglePage from "./pages/SinglePage";
import Scan from "./pages/Scan";
import Quiz from "./pages/Quiz";
import Results from "./pages/Results";
import Routine from "./pages/Routine";
import Community from "./pages/Community";
import { RegimenView } from "./pages/RegimenView";
import { CreateRegimen } from "./pages/CreateRegimen";
import Chat from "./pages/Chat";
import Progress from "./pages/Progress";
import Booking from "./pages/Booking";
import Products from "./pages/Products";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

const queryClient = new QueryClient();

// Component to handle hash redirects for old routes
const HashRedirect = ({ hash }: { hash: string }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home with hash
    navigate(`/#${hash}`, { replace: true });
  }, [hash, navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<SinglePage />} />
            <Route path="/tips" element={<HashRedirect hash="tips" />} />
            <Route path="/about" element={<HashRedirect hash="about" />} />
            <Route path="/contact" element={<HashRedirect hash="contact" />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/scan" element={<ProtectedRoute><Scan /></ProtectedRoute>} />
            <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
            <Route path="/routine" element={<ProtectedRoute><Routine /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/community" element={<Community />} />
            <Route path="/community/create" element={<ProtectedRoute><CreateRegimen /></ProtectedRoute>} />
            <Route path="/community/regimen/:regimenId" element={<ProtectedRoute><RegimenView /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
            <Route path="/booking" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

