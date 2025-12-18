
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { MessageSquare, Users, User, LogOut, Zap, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';

const NavItem = ({ to, icon: Icon, label, color = 'text-gray-400' }: { to: string, icon: any, label: string, color?: string }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => 
      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        isActive 
          ? 'bg-gradient-to-r from-white/10 to-transparent border-l-2 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
          : `${color} hover:text-white hover:bg-white/5`
      }`
    }
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium tracking-wide text-sm">{label}</span>
  </NavLink>
);

export const AppLayout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="flex app-container bg-[#050510] text-white overflow-hidden relative">
      {/* Ambient Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-neon-purple/10 rounded-full blur-[120px] animate-blob" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-neon-blue/10 rounded-full blur-[100px] animate-pulse-slow" />
      </div>

      {/* Sidebar */}
      <aside className="w-72 glass-panel border-r border-white/5 z-20 flex flex-col hidden lg:flex">
        <div className="p-8">
          <h1 className="text-2xl font-display font-black bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-purple">
            GIGGLE<span className="text-white">CHAT</span>
          </h1>
          <p className="text-[10px] text-gray-500 mt-1 tracking-[0.3em] uppercase font-bold">Neural Hub v2.0</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <div className="text-[10px] uppercase tracking-widest text-gray-600 font-bold mb-3 ml-4">Social Network</div>
          <NavItem to="/chat" icon={MessageSquare} label="Direct Messages" />
          <NavItem to="/friends" icon={Users} label="Neural Links" />
          
          <div className="text-[10px] uppercase tracking-widest text-gray-600 font-bold mt-8 mb-3 ml-4">AI Core</div>
          <NavItem to="/intel" icon={Globe} label="Intelligence" color="text-neon-green" />
          <NavItem to="/ai" icon={Zap} label="Giggle AI Bot" color="text-neon-purple" />
        </nav>

        <div className="p-6 border-t border-white/5">
          <NavItem to="/profile" icon={User} label="My Identity" />
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 mt-4 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">De-authenticate</span>
          </button>
        </div>
      </aside>

      {/* Mobile Nav Bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full glass-panel border-t border-white/10 z-50 flex justify-around p-4 pb-safe backdrop-blur-2xl">
        <NavLink to="/chat" className={({isActive}) => isActive ? "text-neon-blue" : "text-gray-500"}><MessageSquare className="w-6 h-6" /></NavLink>
        <NavLink to="/friends" className={({isActive}) => isActive ? "text-neon-purple" : "text-gray-500"}><Users className="w-6 h-6" /></NavLink>
        <NavLink to="/intel" className={({isActive}) => isActive ? "text-neon-green" : "text-gray-500"}><Globe className="w-6 h-6" /></NavLink>
        <NavLink to="/ai" className={({isActive}) => isActive ? "text-neon-purple" : "text-gray-500"}><Zap className="w-6 h-6" /></NavLink>
        <NavLink to="/profile" className={({isActive}) => isActive ? "text-white" : "text-gray-500"}><User className="w-6 h-6" /></NavLink>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10 pb-20 lg:pb-0">
        <div className="h-full w-full max-w-[1920px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
