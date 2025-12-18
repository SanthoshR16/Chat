
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { LandingPage } from './pages/Landing';
import { AuthPage } from './pages/Auth';
import { AppLayout } from './components/Layout';
import { ChatPage } from './pages/Chat';
import { FriendsPage } from './pages/Friends';
import { ProfilePage } from './pages/Profile';
import { AIChatPage } from './pages/AIChat';
import { CinemaPage } from './pages/Cinema';
import { VisionPage } from './pages/Vision';
import { IntelligencePage } from './pages/Intelligence';
import { LivePage } from './pages/Live';
import { AnalyzerPage } from './pages/Analyzer';

// Fix: Explicitly handle children as optional to satisfy TypeScript when used as a layout route element
const AuthGuard = ({ children }: { children?: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate('/auth');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-neon-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return session ? <>{children}</> : <Navigate to="/auth" replace />;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      
      <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/ai-chat" element={<AIChatPage />} />
        <Route path="/cinema" element={<CinemaPage />} />
        <Route path="/vision" element={<VisionPage />} />
        <Route path="/intelligence" element={<IntelligencePage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/analyzer" element={<AnalyzerPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
