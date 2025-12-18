
import React, { useState } from 'react';
import { generateFuturisticImage, checkApiKey } from '../lib/gemini';
import { NeonButton, GlassCard } from '../components/UI';
import { ImageIcon, Wand2, Download, Layers, Maximize, Cpu } from 'lucide-react';

export const VisionPage = () => {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [size, setSize] = useState('1K');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      await checkApiKey();
      const url = await generateFuturisticImage(prompt, { imageSize: size });
      setImageUrl(url);
    } catch (error) {
      console.error(error);
      alert("Neural visualization failed. Check your API link.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full p-6 md:p-12 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-neon-blue/20 rounded-xl border border-neon-blue/30">
              <Cpu className="w-8 h-8 text-neon-blue" />
            </div>
            <div>
              <h1 className="text-4xl font-display font-black tracking-tight">GIGGLE <span className="text-neon-blue">VISION</span></h1>
              <p className="text-gray-500">Neural Imaging Core // Gemini 3 Pro Image</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
            {['1K', '2K', '4K'].map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  size === s ? 'bg-neon-blue text-black shadow-[0_0_15px_rgba(0,243,255,0.5)]' : 'text-gray-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <GlassCard className="space-y-4">
              <h3 className="font-bold flex items-center gap-2"><Wand2 className="w-4 h-4 text-neon-blue" /> Prompt Matrix</h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Cybernetic organisms in a neon jungle..."
                className="w-full h-40 bg-black/30 border border-white/10 rounded-xl p-4 text-white focus:border-neon-blue focus:outline-none resize-none"
              />
              <NeonButton 
                onClick={handleGenerate} 
                isLoading={isGenerating} 
                className="w-full h-12"
                glow
              >
                Execute Visualization
              </NeonButton>
            </GlassCard>

            <GlassCard className="space-y-4">
              <h3 className="font-bold flex items-center gap-2"><Layers className="w-4 h-4 text-neon-purple" /> Active Filters</h3>
              <div className="grid grid-cols-2 gap-2">
                {['Cyberpunk', 'Holographic', 'Minimalist', 'Vaporwave'].map(f => (
                  <button key={f} className="p-2 text-[10px] uppercase font-bold tracking-widest border border-white/5 rounded-lg hover:bg-white/5 hover:border-neon-purple/50 transition-colors">
                    {f}
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-2">
            <div className="relative rounded-3xl overflow-hidden border border-white/10 aspect-square bg-slate-900 shadow-2xl group">
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="Generated" className="w-full h-full object-cover animate-in fade-in duration-1000" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <a href={imageUrl} download="giggle_vision.png" className="p-4 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors">
                      <Download className="w-6 h-6" />
                    </a>
                    <button className="p-4 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors">
                      <Maximize className="w-6 h-6" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                  {isGenerating ? (
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="font-display tracking-[0.3em] text-neon-blue animate-pulse">RENDERING...</p>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-20 h-20 mb-4 opacity-10" />
                      <p className="font-display text-xs tracking-widest">AWAITING PROMPT DATA</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
