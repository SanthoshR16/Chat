
import React from 'react';
import { Link } from 'react-router-dom';
import { NeonButton } from '../components/UI';
import { Zap, Shield, MessageCircle } from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#050510] text-white relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[30vw] h-[30vw] bg-neon-purple/20 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-[25vw] h-[25vw] bg-neon-blue/10 rounded-full blur-[120px] animate-blob" style={{ animationDelay: '2s' }} />
      </div>

      <nav className="absolute top-0 w-full p-6 md:p-8 flex justify-between items-center z-20 max-w-7xl mx-auto">
        <div className="font-display font-bold text-xl md:text-2xl tracking-tighter">GIGGLE<span className="text-neon-blue">CHAT</span></div>
        <Link to="/auth">
          <NeonButton variant="secondary" className="px-6 md:px-8 py-2 text-sm">Login</NeonButton>
        </Link>
      </nav>

      <div className="relative z-10 text-center max-w-5xl px-6">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-neon-purple/30 bg-neon-purple/5 backdrop-blur-md">
          <span className="text-neon-purple text-[10px] md:text-xs font-bold tracking-widest uppercase">The Future of Social is Here</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-8xl font-display font-black leading-[1.1] mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
          CONNECT BEYOND <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-neon-pink to-neon-blue">LIMITS</span>
        </h1>

        <p className="text-base md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          Experience real-time connection powered by Gemini AI. <br className="hidden md:block" /> Safe, smart, and stunningly beautiful.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center">
          <Link to="/auth?mode=signup">
            <NeonButton glow className="w-48 h-14 text-lg">Get Started</NeonButton>
          </Link>
          <a href="#features" className="text-gray-400 hover:text-white transition-colors text-sm font-medium tracking-wide">Learn More</a>
        </div>
      </div>

      {/* Feature Grid */}
      <div id="features" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mt-24 px-6 z-10 pb-20">
        <FeatureCard 
          icon={MessageCircle} 
          title="Holographic Chat" 
          desc="Real-time messaging with a glassmorphic interface that feels like 2050."
          color="neon-blue"
        />
        <FeatureCard 
          icon={Zap} 
          title="Giggle AI Core" 
          desc="Powered by Gemini 3 Flash. Your smart assistant for conversation and creativity."
          color="neon-purple"
        />
        <FeatureCard 
          icon={Shield} 
          title="Anti-Toxicity Shield" 
          desc="Keep your vibes clean. Our AI analyzes and flags toxic content instantly."
          color="red-500"
        />
      </div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc, color }: any) => (
  <div className={`glass-panel p-8 rounded-2xl border border-white/5 hover:border-${color}/50 transition-all duration-500 group`}>
    <div className={`w-12 h-12 rounded-xl bg-${color}/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
      <Icon className={`text-${color} w-6 h-6`} />
    </div>
    <h3 className="font-display font-bold text-xl mb-3">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
  </div>
);
