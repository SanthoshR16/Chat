
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { GlassCard, GlassInput, NeonButton } from '../components/UI';
import { Profile } from '../types';
// Added missing Zap icon to imports
import { Camera, Save, User, X, Check, Maximize2, Move, RotateCw, RefreshCw, Zap } from 'lucide-react';

const PhotoEditorModal = ({ imgSrc, onCancel, onSave }: { imgSrc: string; onCancel: () => void; onSave: (base64: string) => void; }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  const EDITOR_SIZE = 400; // Matches CSS width/height exactly for 1:1 preview

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleFinalize = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    if (!ctx || !img) return;

    // High quality export size
    const exportSize = 1024;
    canvas.width = exportSize;
    canvas.height = exportSize;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, exportSize, exportSize);

    // Map screen-space preview to canvas-space export
    const screenToCanvasScale = exportSize / EDITOR_SIZE;

    ctx.save();
    ctx.translate(exportSize / 2, exportSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom * screenToCanvasScale, zoom * screenToCanvasScale);
    
    // Draw relative to center
    ctx.drawImage(img, (offset.x * screenToCanvasScale) - (img.naturalWidth / 2), (offset.y * screenToCanvasScale) - (img.naturalHeight / 2));
    ctx.restore();

    onSave(canvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050510]/98 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-xl flex flex-col gap-6">
        <div className="flex justify-between items-center px-4">
          <div className="flex flex-col">
            <h2 className="text-xl font-display font-black tracking-tight text-white uppercase">Neural Identity Editor</h2>
            <p className="text-[9px] text-neon-blue uppercase font-bold tracking-[0.2em]">Perfect Circular Alignment Required</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400"><X /></button>
        </div>

        <div 
          className="relative mx-auto bg-black rounded-full overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,243,255,0.1)] group cursor-move select-none"
          style={{ width: EDITOR_SIZE, height: EDITOR_SIZE }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}
        >
          <img 
            ref={imgRef} src={imgSrc} alt="Edit" draggable={false}
            className="absolute max-w-none origin-center"
            style={{
              left: '50%', top: '50%',
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            }}
          />
          {/* Alignment Crosshair Overlay */}
          <div className="absolute inset-0 z-10 pointer-events-none border-2 border-white/5 rounded-full" />
          <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 z-10 pointer-events-none" />
          <div className="absolute left-1/2 top-0 w-px h-full bg-white/5 z-10 pointer-events-none" />
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-gray-400">
              <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3" /> Zoom</span>
              <span className="text-neon-blue">{(zoom * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min="0.1" max="4" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} 
              className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-neon-blue" />
          </div>

          <div className="flex gap-4">
             <button onClick={() => setRotation(r => r - 90)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-gray-400 hover:text-white uppercase text-[10px] font-bold">
                <RefreshCw className="w-4 h-4 scale-x-[-1]" /> Left
             </button>
             <button onClick={() => setRotation(r => r + 90)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-gray-400 hover:text-white uppercase text-[10px] font-bold">
                <RefreshCw className="w-4 h-4" /> Right
             </button>
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/5">
            <NeonButton variant="ghost" onClick={onCancel} className="flex-1 uppercase text-xs">Discard</NeonButton>
            <NeonButton onClick={handleFinalize} className="flex-1 uppercase text-xs" glow>
              <Check className="w-4 h-4" /> Commit Signal
            </NeonButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [editFile, setEditFile] = useState<string | null>(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (data) setProfile(data as Profile);
  };

  const handleUpdate = async () => {
    if (!profile) return;
    setLoading(true);
    await supabase.from('profiles').upsert({ ...profile, updated_at: new Date().toISOString() });
    setLoading(false);
    alert('Identity Protocol Synchronized.');
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => setEditFile(reader.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  if (!profile) return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
       <div className="w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
       <p className="font-display uppercase text-[10px] tracking-[0.5em] text-neon-purple animate-pulse">Decrypting Identity...</p>
    </div>
  );

  return (
    <div className="h-full flex items-center justify-center p-6 overflow-y-auto">
      {editFile && <PhotoEditorModal imgSrc={editFile} onCancel={() => setEditFile(null)} onSave={(b) => { setProfile({ ...profile, avatar_url: b }); setEditFile(null); }} />}

      <div className="w-full max-w-4xl grid md:grid-cols-5 gap-8">
        <div className="md:col-span-2 flex flex-col items-center">
           <GlassCard className="w-full flex flex-col items-center gap-6 p-8 group overflow-visible border-white/5 shadow-2xl">
              <div className="relative">
                <div className="w-56 h-56 rounded-full border-2 border-neon-purple/20 p-1 group-hover:border-neon-purple/60 transition-all duration-1000 shadow-[0_0_60px_rgba(176,38,255,0.15)]">
                   <img src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`} className="w-full h-full rounded-full object-cover bg-black" alt="Profile" />
                </div>
                <label className="absolute bottom-4 right-4 w-12 h-12 bg-neon-purple rounded-full flex items-center justify-center cursor-pointer shadow-lg shadow-neon-purple/40 hover:scale-110 active:scale-95 transition-all z-20 border-4 border-[#050510]">
                   <Camera className="w-5 h-5 text-white" />
                   <input type="file" accept="image/*" className="hidden" onChange={onFileSelect} />
                </label>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-display font-black text-white uppercase tracking-tighter">{profile.username}</h2>
                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 mt-3 inline-block">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Node ID: {profile.id.slice(0, 16)}...</p>
                </div>
              </div>
           </GlassCard>
        </div>

        <div className="md:col-span-3 space-y-6">
           <GlassCard className="space-y-6 border-white/5 shadow-2xl">
              <h3 className="text-xs font-display font-bold text-gray-400 flex items-center gap-2 uppercase tracking-[0.3em]"><Zap className="w-4 h-4 text-neon-blue" /> Core Configuration</h3>
              <GlassInput label="Neural Codename" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} />
              <div className="space-y-2">
                <label className="text-[10px] font-display tracking-[0.3em] text-cyan-400 uppercase font-bold">Biography Stream</label>
                <textarea className="w-full h-40 bg-slate-900/80 border border-white/10 rounded-2xl p-5 text-white focus:border-neon-blue focus:outline-none resize-none transition-all placeholder-gray-800 text-sm leading-relaxed"
                  value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} placeholder="Input neural bio data..." />
              </div>
              <NeonButton onClick={handleUpdate} isLoading={loading} className="w-full h-14 uppercase tracking-[0.4em] font-black" glow>
                 <Save className="w-5 h-5" /> Synchronize ID
              </NeonButton>
           </GlassCard>
        </div>
      </div>
    </div>
  );
};
