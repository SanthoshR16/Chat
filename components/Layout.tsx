
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { MessageSquare, Users, User, LogOut, Zap, Bot, Film, ImageIcon, Search, Mic, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => 
      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        isActive 
          ? 'bg-white/10 border-l-4 border-neon-blue text-white shadow-[0_0_20px_rgba(0,243,255,0.15)]' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`
    }
  >
    <Icon className="w-5 h-5" />
    <span className="font-bold tracking-widest text-[10px] uppercase">{label}</span>
  </NavLink>
);

export const AppLayout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="flex app-container bg-[#050510] text-white overflow-hidden relative font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-neon-purple/5 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[100px]" />
      </div>

      <aside className="w-72 glass-panel border-r border-white/5 z-20 flex flex-col hidden lg:flex backdrop-blur-3xl overflow-y-auto">
        <div className="p-8">
          <h1 className="text-2xl font-display font-black bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-purple tracking-tighter uppercase">
            GIGGLE<span className="text-white">CHAT</span>
          </h1>
          <p className="text-[10px] text-gray-500 mt-1 tracking-[0.3em] uppercase font-bold">Neural Uplink v2.5</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <div className="px-4 py-2 text-[9px] font-black text-gray-600 tracking-[0.4em] uppercase">Communications</div>
          <NavItem to="/chat" icon={MessageSquare} label="Signals" />
          <NavItem to="/friends" icon={Users} label="Network" />
          
          <div className="px-4 py-2 mt-4 text-[9px] font-black text-gray-600 tracking-[0.4em] uppercase">Neural Hub</div>
          <NavItem to="/ai-chat" icon={Bot} label="Giggle AI" />
          <NavItem to="/cinema" icon={Film} label="Cinema" />
          <NavItem to="/vision" icon={ImageIcon} label="Vision" />
          <NavItem to="/intelligence" icon={Search} label="Grounding" />
          <NavItem to="/live" icon={Mic} label="Live Link" />
          <NavItem to="/analyzer" icon={ShieldAlert} label="Scanner" />
        </nav>

        <div className="p-6 mt-auto border-t border-white/5 space-y-2">
          <NavItem to="/profile" icon={User} label="Identity" />
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-300 border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full glass-panel border-t border-white/10 z-50 flex justify-around p-4 pb-safe backdrop-blur-2xl">
        <NavLink to="/chat" className={({isActive}) => isActive ? "text-neon-blue" : "text-gray-500"}><MessageSquare className="w-6 h-6" /></NavLink>
        <NavLink to="/friends" className={({isActive}) => isActive ? "text-neon-purple" : "text-gray-500"}><Users className="w-6 h-6" /></NavLink>
        <NavLink to="/profile" className={({isActive}) => isActive ? "text-white" : "text-gray-500"}><User className="w-6 h-6" /></NavLink>
        <button onClick={handleLogout} className="text-red-500/70"><LogOut className="w-6 h-6" /></button>
      </div>

      <main className="flex-1 overflow-hidden relative z-10 pb-20 lg:pb-0">
        <div className="h-full w-full max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
