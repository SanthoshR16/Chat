
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/Landing';
import { AuthPage } from './pages/Auth';
import { AppLayout } from './components/Layout';
import { ChatPage } from './pages/Chat';
import { FriendsPage } from './pages/Friends';
import { ProfilePage } from './pages/Profile';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      
      <Route element={<AppLayout />}>
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
