
import React from 'react';
import { Link } from 'react-router-dom';
import { NeonButton } from '../components/UI';
import { Shield, MessageCircle, Link2 } from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#050510] text-white relative overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[30vw] h-[30vw] bg-neon-purple/10 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-[25vw] h-[25vw] bg-neon-blue/10 rounded-full blur-[120px] animate-blob" style={{ animationDelay: '2s' }} />
      </div>

      <nav className="absolute top-0 w-full p-8 flex justify-between items-center z-20 max-w-7xl mx-auto">
        <div className="font-display font-bold text-2xl tracking-tighter uppercase">GIGGLE<span className="text-neon-blue">CHAT</span></div>
        <Link to="/auth">
          <NeonButton variant="secondary" className="px-8 py-2 text-sm uppercase tracking-widest">Login</NeonButton>
        </Link>
      </nav>

      <div className="relative z-10 text-center max-w-5xl px-6">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-neon-purple/30 bg-neon-purple/5 backdrop-blur-md">
          <span className="text-neon-purple text-xs font-bold tracking-widest uppercase">The Neural Social Layer</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-9xl font-display font-black leading-[0.9] mb-10 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
          SECURE <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-neon-pink to-neon-blue">UPLINK</span>
        </h1>

        <p className="text-base md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          Clean, fast, and futuristic communication. <br className="hidden md:block" /> Encrypted direct messaging for the next generation.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Link to="/auth?mode=signup">
            <NeonButton glow className="w-56 h-16 text-xl uppercase tracking-[0.2em]">Signup</NeonButton>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mt-24 px-6 z-10 pb-20">
        <FeatureCard icon={MessageCircle} title="Clean Interface" desc="High-speed messaging without the clutter of 2024 social media." color="neon-blue" />
        <FeatureCard icon={Link2} title="Neural Networks" desc="Build your agent network with instant friend linking." color="neon-purple" />
        <FeatureCard icon={Shield} title="Content Filter" desc="Proprietary analyzer keeps your grid free from toxic transmission." color="red-500" />
      </div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc, color }: any) => (
  <div className="glass-panel p-8 rounded-3xl border border-white/5 transition-all duration-500">
    <div className={`w-14 h-14 rounded-2xl bg-${color}/10 flex items-center justify-center mb-6`}>
      <Icon className={`text-${color} w-7 h-7`} />
    </div>
    <h3 className="font-display font-bold text-xl mb-3 uppercase tracking-tight">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
  </div>
);
