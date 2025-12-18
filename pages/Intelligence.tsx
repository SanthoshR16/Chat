
import React, { useState } from 'react';
import { startGroundedSearch } from '../lib/gemini';
import { GlassCard, NeonButton, GlassInput } from '../components/UI';
import { Search, MapPin, Globe, ExternalLink, ShieldCheck, Navigation } from 'lucide-react';

export const IntelligencePage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ text: string, sources: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'maps'>('search');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await startGroundedSearch(query, mode === 'maps');
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full p-6 md:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-black mb-2">NEURAL <span className="text-neon-blue">GROUNDING</span></h1>
          <p className="text-gray-500">Live Web & Geospatial Data Integration</p>
        </div>

        <div className="flex gap-4 mb-8 justify-center">
          <button 
            onClick={() => setMode('search')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${mode === 'search' ? 'bg-neon-blue text-black' : 'bg-white/5 text-gray-400'}`}
          >
            <Globe className="w-4 h-4" /> Global Search
          </button>
          <button 
            onClick={() => setMode('maps')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${mode === 'maps' ? 'bg-neon-green text-black' : 'bg-white/5 text-gray-400'}`}
          >
            <MapPin className="w-4 h-4" /> Maps Radar
          </button>
        </div>

        <div className="flex gap-3 mb-12">
          <GlassInput 
            placeholder={mode === 'search' ? "Search for latest events or tech news..." : "Find locations, restaurants, or hubs..."} 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <NeonButton onClick={handleSearch} isLoading={loading} className="px-8">Analyze</NeonButton>
        </div>

        {results && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <GlassCard className="prose prose-invert max-w-none border-l-4 border-neon-blue">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <ShieldCheck className="text-neon-blue" /> Verified Response
              </h3>
              <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{results.text}</p>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.sources.map((chunk, idx) => {
                const isMaps = chunk.maps;
                const data = isMaps || chunk.web;
                if (!data) return null;
                
                return (
                  <a 
                    key={idx} 
                    href={data.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-neon-blue/50 hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${isMaps ? 'bg-neon-green/10 text-neon-green' : 'bg-neon-blue/10 text-neon-blue'}`}>
                        {isMaps ? <Navigation className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      </div>
                      <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-white" />
                    </div>
                    <h4 className="font-bold text-sm text-gray-100 mb-1 truncate">{data.title || (isMaps ? 'Location Found' : 'Web Resource')}</h4>
                    <p className="text-[10px] text-gray-500 truncate">{data.uri}</p>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
