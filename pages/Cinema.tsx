
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { NeonButton, GlassCard, GlassInput } from '../components/UI';
import { Film, Play, Loader2, Sparkles, AlertCircle, Key } from 'lucide-react';
import { checkApiKey, videoModel } from '../lib/gemini';

export const CinemaPage = () => {
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setVideoUrl(null);
    setStatus('Initializing Neural Link...');

    try {
      await checkApiKey();
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      setStatus('Quantum Rendering in progress... (May take 1-2 mins)');
      
      let operation = await ai.models.generateVideos({
        model: videoModel,
        prompt: `In a 2025 ultra-futuristic style: ${prompt}`,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        setStatus('Synthesizing frames...');
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message?.includes("Requested entity was not found") 
        ? "API Key Error. Please select a valid paid project key." 
        : "Neural Link Interrupted.");
    } finally {
      setIsGenerating(false);
      setStatus('');
    }
  };

  return (
    <div className="h-full p-6 md:p-12 overflow-y-auto bg-[#050510]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-4 bg-neon-pink/20 rounded-2xl border border-neon-pink/30 shadow-[0_0_20px_rgba(255,0,255,0.2)]">
            <Film className="w-8 h-8 text-neon-pink" />
          </div>
          <div>
            <h1 className="text-4xl font-display font-black tracking-tighter">GIGGLE <span className="text-neon-pink">CINEMA</span></h1>
            <p className="text-gray-400 font-light">Generate futuristic 2025 motion clips via Veo 3.1 Neural Core.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <GlassCard className="space-y-6 !bg-black/40">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-neon-pink" /> Director's Console
            </h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe a futuristic scene (e.g., 'Neon rain falling over a floating city of glass')..."
              className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-neon-pink focus:outline-none transition-all placeholder-gray-600 resize-none"
            />
            
            <div className="p-4 rounded-xl bg-neon-blue/5 border border-neon-blue/20 flex gap-3 items-start">
               <AlertCircle className="w-5 h-5 text-neon-blue shrink-0 mt-0.5" />
               <p className="text-xs text-gray-400 leading-relaxed">
                 Video generation is computationally expensive. Ensure you have a paid API key selected for the Veo model. 
                 <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-neon-blue ml-1 underline">Billing Docs</a>
               </p>
            </div>

            <NeonButton 
              onClick={handleGenerate} 
              isLoading={isGenerating} 
              disabled={isGenerating}
              className="w-full h-14 !bg-neon-pink shadow-[0_0_30px_rgba(255,0,255,0.3)]"
            >
              Generate Motion
            </NeonButton>
          </GlassCard>

          <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl flex items-center justify-center group">
            {videoUrl ? (
              <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
            ) : isGenerating ? (
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-neon-pink animate-spin mx-auto mb-4" />
                <p className="text-neon-pink font-display tracking-widest animate-pulse">{status}</p>
              </div>
            ) : (
              <div className="text-center opacity-30 group-hover:opacity-50 transition-opacity">
                <Play className="w-20 h-20 mx-auto mb-4" />
                <p className="font-display text-sm tracking-widest">AWAITING SIGNAL</p>
              </div>
            )}
            {/* HUD Overlay */}
            <div className="absolute top-4 left-4 flex gap-2">
              <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded border border-white/20 text-[10px] font-mono text-neon-pink">REC // 2025</div>
              <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded border border-white/20 text-[10px] font-mono text-green-400 uppercase tracking-tighter">Live Link</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
