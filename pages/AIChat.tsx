
import React, { useState, useRef, useEffect } from 'react';
import { getGeminiChat, checkApiKey, getAI } from '../lib/gemini';
import { NeonButton, GlassCard } from '../components/UI';
import { Bot, Send, Sparkles, Zap, ShieldCheck, AlertCircle, Link2 } from 'lucide-react';
import { Chat, GenerateContentResponse } from '@google/genai';

interface AIMessage {
  role: 'user' | 'model';
  text: string;
}

export const AIChatPage = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    { role: 'model', text: "Greetings, human! I am Giggle AI. Establish a neural link to begin our digital correspondence. 🤖✨" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatSession = useRef<Chat | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if key is already present
    const checkConnection = async () => {
      if (typeof window.aistudio !== 'undefined') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
          // Initialize session silently if key exists
          chatSession.current = getGeminiChat();
          setIsConnected(true);
        }
      }
    };
    checkConnection();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const establishLink = async () => {
    try {
      // Trigger the selection dialog
      await checkApiKey();
      
      // MANDATORY: Immediately assume success to avoid race conditions with hasSelectedApiKey()
      setIsConnected(true);
      
      // Initialize the session with a fresh AI instance
      chatSession.current = getGeminiChat();
      
      if (messages.length === 1) {
        setMessages(prev => [...prev, { role: 'model', text: "Neural link established. Accessing Gemini 3 Pro reasoning core. How can I assist you today?" }]);
      }
    } catch (error) {
      console.error("Connection failed", error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatSession.current) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      // Create fresh chat instance if needed to ensure we use the current key
      if (!chatSession.current) chatSession.current = getGeminiChat();
      
      const result: GenerateContentResponse = await chatSession.current.sendMessage({
        message: userMsg
      });
      const responseText = result.text || "I'm having trouble processing that thought.";
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("Requested entity was not found")) {
        setIsConnected(false);
        setMessages(prev => [...prev, { role: 'model', text: "Critical failure: API key invalidated. Please re-establish neural link." }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: "Error: Neural link unstable. Check transmission logs." }]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-neon-purple to-neon-blue flex items-center justify-center shadow-[0_0_20px_rgba(176,38,255,0.3)]">
            <Bot className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Giggle AI</h1>
            <p className="text-neon-blue text-xs flex items-center gap-1 font-bold uppercase tracking-widest">
              <Sparkles className="w-3 h-3" /> {isConnected ? 'Gemini 3 Pro Active' : 'Waiting for Key'}
            </p>
          </div>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Secure Link Active</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-neon-purple/10 border border-neon-purple/30 rounded-full">
            <Zap className="w-4 h-4 text-neon-purple animate-pulse" />
            <span className="text-[10px] text-neon-purple font-bold uppercase tracking-widest">Establish Link Required</span>
          </div>
        )}
      </div>

      <GlassCard className="flex-1 flex flex-col overflow-hidden !p-0 border-white/5 relative">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-message-in`}>
              <div 
                className={`max-w-[85%] p-5 rounded-3xl ${
                  msg.role === 'user' 
                    ? 'bg-neon-purple text-white rounded-tr-none shadow-[0_8px_25px_rgba(176,38,255,0.2)]' 
                    : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none shadow-xl'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none flex gap-2 items-center">
                <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce delay-100" />
                <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce delay-200" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input or Connect Overlay */}
        {!isConnected ? (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center z-20">
            <Link2 className="w-16 h-16 text-neon-blue mb-4 animate-pulse" />
            <h2 className="text-2xl font-display font-bold mb-2">Neural Link Offline</h2>
            <p className="text-gray-400 text-sm max-w-sm mb-8">
              To converse with Giggle AI outside the Studio environment, you must provide a secure API key from a paid GCP project.
            </p>
            <NeonButton onClick={establishLink} glow className="h-14 px-10">
              Establish Neural Link
            </NeonButton>
            <p className="mt-6 text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="w-3 h-3" /> Requires billing enabled project. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline hover:text-white">Learn more</a>
            </p>
          </div>
        ) : (
          <div className="p-4 md:p-6 bg-gradient-to-t from-black/40 to-transparent border-t border-white/5">
            <form onSubmit={handleSend} className="relative max-w-4xl mx-auto">
              <input 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Giggle AI anything..."
                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-5 pl-6 pr-20 text-white focus:border-neon-blue focus:outline-none transition-all shadow-2xl"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-3 top-2 bottom-2 aspect-square bg-gradient-to-tr from-neon-purple to-neon-blue text-white rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 shadow-lg"
              >
                <Send className="w-6 h-6 ml-0.5" />
              </button>
            </form>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
