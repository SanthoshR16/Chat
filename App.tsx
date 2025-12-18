
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/Landing';
import { AuthPage } from './pages/Auth';
import { AppLayout } from './components/Layout';
import { ChatPage } from './pages/Chat';
import { AIChatPage } from './pages/AIChat';
import { FriendsPage } from './pages/Friends';
import { ProfilePage } from './pages/Profile';
import { VisionPage } from './pages/Vision';
import { CinemaPage } from './pages/Cinema';
import { IntelligencePage } from './pages/Intelligence';
import { LivePage } from './pages/Live';

const ProtectedRoute = ({ children }: React.PropsWithChildren<{}>) => {
  return <>{children}</>;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      
      <Route element={<AppLayout />}>
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/ai" element={<ProtectedRoute><AIChatPage /></ProtectedRoute>} />
        <Route path="/live" element={<ProtectedRoute><LivePage /></ProtectedRoute>} />
        <Route path="/vision" element={<ProtectedRoute><VisionPage /></ProtectedRoute>} />
        <Route path="/cinema" element={<ProtectedRoute><CinemaPage /></ProtectedRoute>} />
        <Route path="/intel" element={<ProtectedRoute><IntelligencePage /></ProtectedRoute>} />
        <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
